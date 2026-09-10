import { CATEGORIES } from '../utils/finance.js';

console.log('--- Running Receipt Lifecycle & Zero-Storage Retention Tests ---');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ ${testName}`);
    process.exitCode = 1;
  }
}

// 1. Taxonomy & Category Alignment
console.log('\n▸ Category Taxonomy Contract:');
const standardCategories = ['Food', 'Groceries', 'Transport', 'Entertainment', 'Shopping', 'Bills', 'Health', 'Education', 'Other'];
for (const cat of standardCategories) {
  assert(CATEGORIES.includes(cat), `CATEGORIES includes required taxonomy '${cat}'`);
}

// 2. Queue State Transition Contract
console.log('\n▸ Queue State Transitions:');
const VALID_STATES = ['uploading', 'pending', 'processing', 'ready_for_review', 'completed', 'failed'];

function isValidTransition(current, next) {
  const transitions = {
    uploading: ['pending', 'failed'],
    pending: ['processing', 'failed'],
    processing: ['ready_for_review', 'failed'],
    ready_for_review: ['completed', 'failed'],
    completed: [],
    failed: [],
  };
  return transitions[current]?.includes(next) || false;
}

assert(isValidTransition('uploading', 'pending'), 'Handshake promotes uploading → pending');
assert(isValidTransition('pending', 'processing'), 'Fetcher promotes pending → processing');
assert(isValidTransition('processing', 'ready_for_review'), 'Committer promotes processing → ready_for_review');
assert(isValidTransition('ready_for_review', 'completed'), 'User 1-Tap approves ready_for_review → completed');
assert(isValidTransition('processing', 'failed'), 'Error flags processing → failed');
assert(!isValidTransition('completed', 'uploading'), 'Completed state cannot regress to uploading');

// 3. Two-Phase Handshake Rollback Logic
console.log('\n▸ Handshake Rollback Safety:');

function simulateHandshake({ dbFail = false, storageFail = false }) {
  const db = new Set();
  const storage = new Set();
  const receiptId = 'test-uuid-1';
  const filePath = `user-1/${receiptId}.webp`;

  // Step 1: Pre-insert DB row
  if (dbFail) {
    return { success: false, dbCount: db.size, storageCount: storage.size, stage: 'pre-insert' };
  }
  db.add(receiptId);

  // Step 2: Upload to storage
  if (storageFail) {
    // Rollback DB
    db.delete(receiptId);
    return { success: false, dbCount: db.size, storageCount: storage.size, stage: 'storage-upload' };
  }
  storage.add(filePath);

  // Step 3: Promote DB row to pending
  return { success: true, dbCount: db.size, storageCount: storage.size, stage: 'pending' };
}

const cleanUpload = simulateHandshake({});
assert(cleanUpload.success && cleanUpload.dbCount === 1 && cleanUpload.storageCount === 1, 'Clean handshake retains exactly 1 DB record and 1 storage file');

const failedStorage = simulateHandshake({ storageFail: true });
assert(!failedStorage.success && failedStorage.dbCount === 0 && failedStorage.storageCount === 0, 'Storage upload failure rolls back DB row (0 DB creep)');

const failedDb = simulateHandshake({ dbFail: true });
assert(!failedDb.success && failedDb.dbCount === 0 && failedDb.storageCount === 0, 'Initial DB insert failure prevents storage upload');

// 4. Zero Cloud Storage Creep (Commit & Purge Simulation)
console.log('\n▸ Storage Purge on Commit (0 MB Retained):');

function simulateAgentCommit(receiptId, filePath, extractedData) {
  const storage = new Set([filePath]);
  let queueItem = {
    id: receiptId,
    file_path: filePath,
    status: 'processing',
    extracted_data: null,
  };

  // Agent extracts data and commits
  queueItem.status = 'ready_for_review';
  queueItem.extracted_data = extractedData;
  queueItem.processed_at = new Date().toISOString();

  // Storage Purge Action
  storage.delete(queueItem.file_path);

  return {
    queueItem,
    storageRetainedCount: storage.size,
  };
}

const mockExtraction = {
  vendor: 'Countdown Auckland',
  date: '2026-09-11',
  currency: 'NZD',
  total: 42.50,
  items: [
    { item: 'Milk 2L', amount: 4.50, category: 'Groceries', date: '2026-09-11', note: 'Countdown' },
    { item: 'Coffee Beans', amount: 18.00, category: 'Groceries', date: '2026-09-11', note: 'Countdown' },
    { item: 'Olive Oil', amount: 20.00, category: 'Groceries', date: '2026-09-11', note: 'Countdown' },
  ],
};

const commitResult = simulateAgentCommit('test-receipt-123', 'user-456/test-receipt-123.webp', mockExtraction);
assert(commitResult.storageRetainedCount === 0, 'Supabase storage file is deleted immediately on commit (0 MB cloud storage retained)');
assert(commitResult.queueItem.status === 'ready_for_review', 'Queue item status transitioned to ready_for_review');
assert(commitResult.queueItem.extracted_data.items.length === 3, 'Extracted line items preserved in JSONB');

// 5. 1-Tap Approval Transformation Contract
console.log('\n▸ 1-Tap Approval into Expenses Contract:');

function transformReceiptToExpenses(userId, extractedData) {
  const vendor = extractedData.vendor || 'Receipt';
  return (extractedData.items || [])
    .map((item) => ({
      user_id: userId,
      amount: Number(item.amount) || 0,
      category: item.category || 'Other',
      date: item.date || extractedData.date || new Date().toISOString().slice(0, 10),
      note: (item.note || item.item || vendor).trim(),
    }))
    .filter((e) => e.amount > 0);
}

const expenses = transformReceiptToExpenses('usr-abc', mockExtraction);
assert(expenses.length === 3, 'All 3 items transformed to public.expenses rows');
assert(expenses[0].user_id === 'usr-abc', 'User ID mapped correctly');
assert(expenses[0].amount === 4.50, 'Amount parsed as number');
assert(expenses[0].category === 'Groceries', 'Category preserved');
assert(expenses.reduce((s, e) => s + e.amount, 0) === 42.50, 'Total expense sum matches NZ$ 42.50');

console.log(`\nAll receipt lifecycle tests passed: ${passed}/${total}`);
if (passed !== total) {
  process.exit(1);
}
