#!/usr/bin/env node

/**
 * tooling/scripts/commit-receipt.js
 *
 * Saves structured agent extraction results to receipt_queue and purges storage:
 * - Updates public.receipt_queue with status = 'ready_for_review' and extracted_data
 * - Automatically purges original image from Supabase Storage (0 MB cloud storage retained)
 * - Automatically deletes local scratch image (zero disk bloat)
 * - Flags receipt as 'failed' if --error is passed
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const envPath = path.resolve(rootDir, file);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let value = (match[2] || '').trim();
          if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
          } else if (value.startsWith("'") && value.endsWith("'")) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    id: null,
    data: null,
    dataFile: null,
    error: null,
  };

  for (const arg of args) {
    if (arg.startsWith('--id=')) {
      options.id = arg.split('=')[1];
    } else if (arg.startsWith('--data=')) {
      options.data = arg.substring('--data='.length);
    } else if (arg.startsWith('--file=')) {
      options.dataFile = arg.split('=')[1];
    } else if (arg.startsWith('--error=')) {
      options.error = arg.substring('--error='.length);
    }
  }
  return options;
}

async function main() {
  loadEnv();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      JSON.stringify({
        error: 'Missing Supabase credentials (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_URL)',
      })
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const options = parseArgs();

  if (!options.id) {
    console.error(JSON.stringify({ error: 'Missing required argument: --id=<receipt_id>' }));
    process.exit(1);
  }

  // 1. Fetch queue record
  const { data: record, error: fetchError } = await supabase
    .from('receipt_queue')
    .select('*')
    .eq('id', options.id)
    .single();

  if (fetchError || !record) {
    console.error(
      JSON.stringify({
        error: `Receipt record not found: ${fetchError?.message || 'Unknown ID'}`,
      })
    );
    process.exit(1);
  }

  // Handle error flag if agent was unable to read the image
  if (options.error) {
    await supabase
      .from('receipt_queue')
      .update({
        status: 'failed',
        error_message: options.error,
        processed_at: new Date().toISOString(),
      })
      .eq('id', options.id);

    console.log(
      JSON.stringify({
        status: 'failed',
        receiptId: options.id,
        message: 'Receipt marked as failed',
        error: options.error,
      })
    );
    return;
  }

  // 2. Parse extracted data
  let parsedData = null;
  if (options.dataFile) {
    const filePath = path.isAbsolute(options.dataFile)
      ? options.dataFile
      : path.resolve(rootDir, options.dataFile);
    const raw = fs.readFileSync(filePath, 'utf8');
    parsedData = JSON.parse(raw);
  } else if (options.data) {
    parsedData = JSON.parse(options.data);
  } else {
    console.error(JSON.stringify({ error: 'Must provide either --data=<json> or --file=<path>' }));
    process.exit(1);
  }

  // Standardize structure
  if (!parsedData.vendor) parsedData.vendor = 'Receipt';
  if (!Array.isArray(parsedData.items)) parsedData.items = [];

  // Calculate or verify total
  const calculatedTotal = parsedData.items.reduce(
    (sum, item) => sum + (Number(item.amount) || 0),
    0
  );
  if (!parsedData.total || parsedData.total === 0) {
    parsedData.total = calculatedTotal;
  }

  // 3. Update receipt_queue with extracted JSON and set ready_for_review
  const { error: updateError } = await supabase
    .from('receipt_queue')
    .update({
      status: 'ready_for_review',
      extracted_data: parsedData,
      processed_at: new Date().toISOString(),
    })
    .eq('id', options.id);

  if (updateError) {
    console.error(JSON.stringify({ error: `Update failed: ${updateError.message}` }));
    process.exit(1);
  }

  // 4. Zero Cloud Storage Creep: Purge image from Supabase Storage
  let storagePurged = false;
  let storagePurgeError = null;
  if (record.file_path) {
    const { error: purgeError } = await supabase.storage
      .from('receipts')
      .remove([record.file_path]);

    if (purgeError) {
      storagePurgeError = purgeError.message;
      console.error(`[STORAGE PURGE ERROR]: ${purgeError.message}`);
    } else {
      storagePurged = true;
    }
  }

  // 5. Cleanup local scratch file
  let localCleaned = false;
  const possibleScratchExts = ['.webp', '.jpg', '.jpeg', '.png'];
  for (const ext of possibleScratchExts) {
    const localScratchPath = path.resolve(rootDir, `scratch/receipts/${options.id}${ext}`);
    if (fs.existsSync(localScratchPath)) {
      try {
        fs.unlinkSync(localScratchPath);
        localCleaned = true;
      } catch (e) {
        console.error(`Failed to clean local scratch: ${e.message}`);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        receiptId: options.id,
        status: 'ready_for_review',
        itemsExtracted: parsedData.items.length,
        total: parsedData.total,
        storagePurged,
        storagePurgeError,
        localCleaned,
        message: 'Receipt committed successfully. Ready for 1-tap mobile review.',
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ error: `Fatal execution error: ${err.message}` }));
  process.exit(1);
});
