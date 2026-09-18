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

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_SERVICE_KEY) {
    console.warn('\x1b[33m%s\x1b[0m', '⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not found in environment. Using anon/publishable key; RLS policies may restrict operations to 0 rows. Provide SUPABASE_SERVICE_ROLE_KEY in .env.local for full queue processing.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const options = parseArgs();

  if (!options.id) {
    console.error(JSON.stringify({ error: 'Missing required argument: --id=<receipt_id>' }));
    process.exit(1);
  }

  async function purgeStorageAndScratch(rec, receiptId) {
    let storagePurged = false;
    let storagePurgeError = null;
    if (rec?.file_path) {
      const { error: purgeError } = await supabase.storage
        .from('receipts')
        .remove([rec.file_path]);

      if (purgeError) {
        storagePurgeError = purgeError.message;
        console.error(`[STORAGE PURGE ERROR]: ${purgeError.message}`);
      } else {
        storagePurged = true;
      }
    }

    let localCleaned = false;
    const possibleScratchExts = ['.webp', '.jpg', '.jpeg', '.png', '.pdf'];
    for (const ext of possibleScratchExts) {
      const localScratchPath = path.resolve(rootDir, `scratch/receipts/${receiptId}${ext}`);
      if (fs.existsSync(localScratchPath)) {
        try {
          fs.unlinkSync(localScratchPath);
          localCleaned = true;
        } catch (e) {
          console.error(`Failed to clean local scratch: ${e.message}`);
        }
      }
    }

    return { storagePurged, storagePurgeError, localCleaned };
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

    // Purge storage even on error flag (Zero Cloud Storage Creep)
    const { storagePurged, storagePurgeError, localCleaned } = await purgeStorageAndScratch(record, options.id);

    console.log(
      JSON.stringify({
        status: 'failed',
        receiptId: options.id,
        message: 'Receipt marked as failed. Storage purged to prevent cloud creep.',
        error: options.error,
        storagePurged,
        storagePurgeError,
        localCleaned,
      }, null, 2)
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


  const ALLOWED_CATEGORIES = [
    'Food',
    'Groceries',
    'Transport',
    'Entertainment',
    'Shopping',
    'Bills',
    'Health',
    'Education',
    'Other',
  ];

  function validateAndNormalizeDocket(docket, index = 0) {
    const prefix = `Docket #${index + 1}`;
    const errors = [];

    if (!docket || typeof docket !== 'object' || Array.isArray(docket)) {
      throw new Error(
        `❌ Schema Validation Error: ${prefix} expected a JSON object { vendor, date, items: [...] }, received ${Array.isArray(docket) ? 'Array' : typeof docket}`
      );
    }

    if (!docket.vendor || typeof docket.vendor !== 'string' || !docket.vendor.trim()) {
      errors.push(`${prefix}: Missing or empty "vendor" string (e.g. "Woolworths Chartwell").`);
    }

    if (!docket.date || typeof docket.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(docket.date.trim())) {
      errors.push(
        `${prefix}: "date" must be an ISO date string formatted as "YYYY-MM-DD" (e.g. "2026-09-16"). Received: "${docket.date}"`
      );
    }

    if (!Array.isArray(docket.items)) {
      errors.push(
        `${prefix}: "items" must be an Array of item objects. Received ${typeof docket.items}. Do not pass items as a plain string or object.`
      );
    } else if (docket.items.length === 0) {
      errors.push(
        `${prefix}: "items" array cannot be empty. At least one line item object is required.`
      );
    } else {
      docket.items.forEach((it, iIdx) => {
        const itemPrefix = `${prefix} Item #${iIdx + 1}`;
        if (!it || typeof it !== 'object' || Array.isArray(it)) {
          errors.push(`${itemPrefix}: Must be an object with { item, amount, category, date }.`);
          return;
        }

        const label = (it.item || it.name || it.description || '').trim();
        if (!label) {
          errors.push(`${itemPrefix}: Missing item title. Provide "item" or "name" string.`);
        }

        const amount = Number(it.amount);
        if (isNaN(amount) || amount <= 0) {
          errors.push(
            `${itemPrefix} ("${label || 'Unnamed'}"): Invalid "amount". Expected a positive number, received: ${it.amount}`
          );
        }

        if (it.category && !ALLOWED_CATEGORIES.includes(it.category)) {
          errors.push(
            `${itemPrefix} ("${label || 'Unnamed'}"): Invalid category "${it.category}". Must be one of: ${ALLOWED_CATEGORIES.join(', ')}`
          );
        }
      });
    }

    if (errors.length > 0) {
      const formatted = [
        `❌ Receipt Validation Failed:`,
        ...errors.map((e) => `  • ${e}`),
        `\nPlease review the schema requirements and retry.`,
      ].join('\n');
      throw new Error(formatted);
    }

    // Normalization & sanitization
    const normalizedItems = docket.items.map((it) => {
      const label = (it.item || it.name || it.description || it.note || 'Item').trim();
      const rawNote = (it.note || '').trim();
      const note = rawNote && rawNote.toLowerCase() !== label.toLowerCase() ? rawNote : label;
      const amount = Math.round(Number(it.amount) * 100) / 100;
      const category = it.category || 'Other';
      const date = it.date && /^\d{4}-\d{2}-\d{2}$/.test(it.date) ? it.date : docket.date.trim();

      return {
        item: label,
        name: label,
        note,
        amount,
        category,
        date,
      };
    });

    const calculatedTotal = Math.round(
      normalizedItems.reduce((sum, it) => sum + it.amount, 0) * 100
    ) / 100;

    return {
      vendor: docket.vendor.trim(),
      date: docket.date.trim(),
      total: docket.total && typeof docket.total === 'number' && docket.total > 0
        ? Math.round(docket.total * 100) / 100
        : calculatedTotal,
      items: normalizedItems,
    };
  }

  // Check if multiple dockets provided (multi-receipt photo)
  const isMultiDocket = Array.isArray(parsedData);
  const rawList = isMultiDocket ? parsedData : [parsedData];

  if (rawList.length === 0) {
    console.error(JSON.stringify({ error: 'Payload array cannot be empty. At least one receipt object is required.' }));
    process.exit(1);
  }

  let docketList;
  try {
    docketList = rawList.map((d, idx) => validateAndNormalizeDocket(d, idx));
  } catch (validationErr) {
    console.error(validationErr.message);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const parentDocket = docketList[0];

  // 3. Update primary receipt_queue record
  const { error: updateError } = await supabase
    .from('receipt_queue')
    .update({
      status: 'ready_for_review',
      extracted_data: parentDocket,
      processed_at: now,
    })
    .eq('id', options.id);

  if (updateError) {
    console.error(JSON.stringify({ error: `Update failed: ${updateError.message}` }));
    process.exit(1);
  }

  // 3b. Insert sibling records if multi-docket split
  let siblingIds = [];
  if (docketList.length > 1) {
    const siblingRows = docketList.slice(1).map((d) => ({
      user_id: record.user_id,
      file_path: record.file_path,
      status: 'ready_for_review',
      extracted_data: d,
      processed_at: now,
    }));

    const { data: insertedSiblings, error: insertError } = await supabase
      .from('receipt_queue')
      .insert(siblingRows)
      .select('id');

    if (insertError) {
      console.error(JSON.stringify({ error: `Sibling insert failed: ${insertError.message}` }));
    } else if (insertedSiblings) {
      siblingIds = insertedSiblings.map((s) => s.id);
    }
  }

  // 4 & 5. Zero Cloud Storage Creep: Purge image from Supabase Storage & local scratch
  const { storagePurged, storagePurgeError, localCleaned } = await purgeStorageAndScratch(record, options.id);

  console.log(
    JSON.stringify(
      {
        success: true,
        receiptId: options.id,
        status: 'ready_for_review',
        itemsExtracted: docketList.reduce((sum, d) => sum + d.items.length, 0),
        total: Math.round(docketList.reduce((sum, d) => sum + d.total, 0) * 100) / 100,
        docketsCount: docketList.length,
        siblingIds,
        storagePurged,
        storagePurgeError,
        localCleaned,
        message: docketList.length > 1
          ? `Successfully committed and split ${docketList.length} dockets into separate mobile review cards.`
          : 'Receipt committed successfully. Ready for 1-tap mobile review.',
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
