#!/usr/bin/env node

/**
 * tooling/scripts/fetch-receipts.js
 *
 * Downloads pending receipts from Supabase Storage to local scratch disk:
 * - Queries public.receipt_queue WHERE status = 'pending'
 * - Downloads binary blobs from 'receipts' bucket via HTTPS
 * - Saves images to scratch/receipts/{receiptId}.webp
 * - Updates queue row status to 'processing'
 * - Outputs JSON manifest for Antigravity Agent multimodal inspection (view_file)
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
    limit: 10,
    receiptId: null,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10) || 10;
    } else if (arg.startsWith('--id=')) {
      options.receiptId = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found in environment. Using anon/publishable key; RLS policies may restrict visibility to 0 rows. Provide SUPABASE_SERVICE_ROLE_KEY in .env.local for full queue processing.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const options = parseArgs();

  let query = supabase
    .from('receipt_queue')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(options.limit);

  if (options.receiptId) {
    query = query.eq('id', options.receiptId);
  } else {
    query = query.eq('status', 'pending');
  }

  const { data: queueRows, error: queryError } = await query;

  if (queryError) {
    console.error(JSON.stringify({ error: `Query error: ${queryError.message}` }));
    process.exit(1);
  }

  if (!queueRows || queueRows.length === 0) {
    console.log(JSON.stringify({ message: 'No pending receipts found.', receipts: [] }));
    return;
  }

  if (options.dryRun) {
    console.log(
      JSON.stringify({
        message: `Found ${queueRows.length} pending receipts (dry run).`,
        receipts: queueRows,
      })
    );
    return;
  }

  // Ensure local scratch directory exists
  const scratchDir = path.resolve(rootDir, 'scratch/receipts');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const downloadedManifest = [];

  for (const row of queueRows) {
    try {
      const ext = path.extname(row.file_path) || '.webp';
      const localFileName = `${row.id}${ext}`;
      const localFilePath = path.resolve(scratchDir, localFileName);

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('receipts')
        .download(row.file_path);

      if (downloadError) {
        console.error(`[DOWNLOAD ERROR] Receipt ${row.id}: ${downloadError.message}`);
        continue;
      }

      const buffer = Buffer.from(await fileBlob.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);

      // Update queue status to 'processing'
      await supabase
        .from('receipt_queue')
        .update({ status: 'processing' })
        .eq('id', row.id);

      downloadedManifest.push({
        id: row.id,
        userId: row.user_id,
        filePath: row.file_path,
        localPath: path.relative(rootDir, localFilePath),
        absoluteLocalPath: localFilePath,
        sizeBytes: buffer.length,
      });
    } catch (err) {
      console.error(`[PROCESS ERROR] Receipt ${row.id}: ${err.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        message: `Successfully fetched ${downloadedManifest.length} receipts to scratch/receipts/.`,
        receipts: downloadedManifest,
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
