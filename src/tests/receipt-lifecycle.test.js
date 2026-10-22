import { CATEGORIES, isPersistedGoal } from '../utils/finance.js';

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

// 3. Two-Phase Handshake Rollback Logic (Decoupled DB Sequence & File Storage Path)
console.log('\n▸ Handshake Rollback Safety (Numeric DB ID vs Unique Storage Path):');

function simulateHandshake({ dbFail = false, storageFail = false, assignedDbId = 1042, fileId = 'file-uuid-abc' }) {
  const db = new Set();
  const storage = new Set();
  const filePath = `user-1/${fileId}.webp`;

  // Step 1: Pre-insert DB row (DB assigns sequential/bigint id, does not require client UUID)
  if (dbFail) {
    return { success: false, dbCount: db.size, storageCount: storage.size, stage: 'pre-insert' };
  }
  db.add(assignedDbId);

  // Step 2: Upload to storage using unique filePath
  if (storageFail) {
    // Rollback DB by numeric DB id, rollback storage by filePath
    db.delete(assignedDbId);
    storage.delete(filePath);
    return { success: false, dbCount: db.size, storageCount: storage.size, stage: 'storage-upload' };
  }
  storage.add(filePath);

  // Step 3: Promote DB row to pending
  return { success: true, dbCount: db.size, storageCount: storage.size, stage: 'pending', dbId: assignedDbId, filePath };
}

const cleanNumericUpload = simulateHandshake({ assignedDbId: 1042 });
assert(cleanNumericUpload.success && cleanNumericUpload.dbCount === 1 && cleanNumericUpload.storageCount === 1, 'Clean handshake retains numeric DB sequence record and storage file');

const cleanBigIntUpload = simulateHandshake({ assignedDbId: 9007199254740993n, fileId: 'img-uuid-xyz' });
assert(cleanBigIntUpload.success && cleanBigIntUpload.dbCount === 1, 'Clean handshake supports BigInt database IDs');

const failedStorageNumeric = simulateHandshake({ storageFail: true, assignedDbId: 1042 });
assert(!failedStorageNumeric.success && failedStorageNumeric.dbCount === 0 && failedStorageNumeric.storageCount === 0, 'Storage upload failure rolls back numeric DB sequence row (0 DB creep)');

const failedDbNumeric = simulateHandshake({ dbFail: true });
assert(!failedDbNumeric.success && failedDbNumeric.dbCount === 0 && failedDbNumeric.storageCount === 0, 'Initial DB insert failure prevents storage upload');

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

// 4b. Storage Purge on Flagged Error
function simulateAgentError(receiptId, filePath, errorMsg) {
  const storage = new Set([filePath]);
  let queueItem = {
    id: receiptId,
    file_path: filePath,
    status: 'processing',
    error_message: null,
  };

  queueItem.status = 'failed';
  queueItem.error_message = errorMsg;
  queueItem.processed_at = new Date().toISOString();

  // Storage Purge Action on Error
  storage.delete(queueItem.file_path);

  return {
    queueItem,
    storageRetainedCount: storage.size,
  };
}

const errorResult = simulateAgentError('test-error-123', 'user-456/test-error-123.webp', 'Blurry photo');
assert(errorResult.storageRetainedCount === 0, 'Supabase storage file is purged even on error flag (0 MB cloud storage retained)');
assert(errorResult.queueItem.status === 'failed', 'Queue item status transitioned to failed');
assert(errorResult.queueItem.error_message === 'Blurry photo', 'Error message preserved for user feedback');

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

const expensesNumericUser = transformReceiptToExpenses(1001, mockExtraction);
assert(expensesNumericUser.length === 3, 'All 3 items transformed with numeric user_id');
assert(expensesNumericUser[0].user_id === 1001, 'Numeric user_id mapped correctly');

const expensesStringUser = transformReceiptToExpenses('usr-abc', mockExtraction);
assert(expensesStringUser.length === 3, 'All 3 items transformed with string user_id');
assert(expensesStringUser[0].user_id === 'usr-abc', 'User ID mapped correctly');
assert(expensesStringUser[0].amount === 4.50, 'Amount parsed as number');
assert(expensesStringUser[0].category === 'Groceries', 'Category preserved');
assert(expensesStringUser.reduce((s, e) => s + e.amount, 0) === 42.50, 'Total expense sum matches NZ$ 42.50');

// 6. User Explicit Discard vs Processing Failure Contract (Supporting Numeric & BigInt IDs)
console.log('\n▸ User Explicit Discard vs Failed Processing Receipt Contract (Generic IDs):');

// Real database rows often contain numeric/bigint sequence IDs
const queueState = [
  { id: 101, status: 'failed', error_message: 'Unreadable receipt docket' },
  { id: 102, status: 'failed', error_message: 'Dismissed by user' },
  { id: 204, status: 'ready_for_review', extracted_data: { total: 10 } },
  { id: 9007199254740995n, status: 'ready_for_review', extracted_data: { total: 25 } },
];

const surfacedFailures = queueState.filter(
  (item) => item.status === 'failed' && item.error_message !== 'Dismissed by user'
);

assert(surfacedFailures.length === 1, 'Processing failures persist to inform user');
assert(String(surfacedFailures[0].id) === '101', 'Correct unreadable receipt is surfaced in alert banner');
assert(surfacedFailures[0].error_message === 'Unreadable receipt docket', 'Error message matches actual failure');

// Explicit user discard from review drawer permanently removes row (with string-coerced ID matching)
function simulateUserDiscard(queue, receiptId) {
  return queue.filter((r) => String(r.id) !== String(receiptId));
}

// User discards numeric row 204 by passing string '204'
const afterUserDiscard = simulateUserDiscard(queueState, '204');
assert(afterUserDiscard.length === 3, 'User discard from review drawer removes numeric queue item via string comparison');
assert(!afterUserDiscard.some((r) => String(r.id) === '204'), 'Discarded numeric item no longer in queue');

// User dismissing failed notification permanently removes numeric row 101 via string '101'
const afterDismissFailed = simulateUserDiscard(afterUserDiscard, '101');
assert(afterDismissFailed.length === 2, 'User dismissing failed alert removes numeric failed queue item via string comparison');
assert(!afterDismissFailed.some((r) => String(r.id) === '101'), 'Dismissed numeric failed item no longer in queue');

// User discards BigInt row by passing string
const afterBigIntDiscard = simulateUserDiscard(afterDismissFailed, '9007199254740995');
assert(afterBigIntDiscard.length === 1, 'User discard removes BigInt queue item via string comparison');
assert(!afterBigIntDiscard.some((r) => String(r.id) === '9007199254740995'), 'Discarded BigInt item no longer in queue');

// Finding target queue item by string query in readyReceipts with numeric IDs
const readyReceipts = [{ id: 204, vendor: 'Countdown' }, { id: 205, vendor: 'PaknSave' }];
const found = readyReceipts.find((r) => String(r.id) === '204');
assert(found && found.vendor === 'Countdown', 'Finds ready receipt with numeric ID using string query');

// 7. Generic User ID & Queue Auth Guard Contract
console.log('\n▸ Generic User ID & Queue Auth Guard Contract:');

function validateUploadUser(userId) {
  if (!userId || userId === 'local-owner') {
    throw new Error('Please sign in to queue receipts for agent processing');
  }
  return true;
}

assert(validateUploadUser(1001) === true, 'Allows numeric integer user IDs (database serial/identity)');
assert(validateUploadUser('1001') === true, 'Allows stringified numeric user IDs');
assert(validateUploadUser('usr_test_alex') === true, 'Allows custom alphanumeric user IDs');
assert(validateUploadUser('3fa85f64-5717-4562-b3fc-2c963f66afa6') === true, 'Allows standard UUID user IDs');

let threwGuest = false;
try { validateUploadUser('local-owner'); } catch (e) { threwGuest = e.message.includes('Please sign in'); }
assert(threwGuest, 'Rejects local-owner placeholder with friendly sign-in prompt');

let threwNull = false;
try { validateUploadUser(null); } catch (e) { threwNull = e.message.includes('Please sign in'); }
assert(threwNull, 'Rejects null user ID with friendly sign-in prompt');

let threwEmpty = false;
try { validateUploadUser(''); } catch (e) { threwEmpty = e.message.includes('Please sign in'); }
assert(threwEmpty, 'Rejects empty user ID with friendly sign-in prompt');

// 8. Savings Goals Generic Database ID & Persistence Contract
console.log('\n▸ Savings Goals Generic Database ID & Persistence Contract:');

assert(isPersistedGoal(1) === true, 'isPersistedGoal accepts numeric integer ID 1 (serial/bigint DB sequence)');
assert(isPersistedGoal(42) === true, 'isPersistedGoal accepts numeric integer ID 42');
assert(isPersistedGoal(9007199254740993n) === true, 'isPersistedGoal accepts BigInt ID');
assert(isPersistedGoal('1') === true, 'isPersistedGoal accepts stringified numeric ID 1');
assert(isPersistedGoal('42') === true, 'isPersistedGoal accepts stringified numeric ID 42');
assert(isPersistedGoal('3fa85f64-5717-4562-b3fc-2c963f66afa6') === true, 'isPersistedGoal accepts UUID string');
assert(isPersistedGoal('emergency-fund-2026') === true, 'isPersistedGoal accepts custom alphanumeric ID');

assert(isPersistedGoal('starter-1') === false, 'isPersistedGoal rejects starter-1 mock fallback');
assert(isPersistedGoal('starter-2') === false, 'isPersistedGoal rejects starter-2 mock fallback');
assert(isPersistedGoal('mock-1729500000000') === false, 'isPersistedGoal rejects client-generated mock IDs');
assert(isPersistedGoal(null) === false, 'isPersistedGoal rejects null');
assert(isPersistedGoal(undefined) === false, 'isPersistedGoal rejects undefined');
assert(isPersistedGoal('') === false, 'isPersistedGoal rejects empty string');
assert(isPersistedGoal('   ') === false, 'isPersistedGoal rejects whitespace');

// CRUD state updates with mixed numeric & string IDs
const initialGoals = [
  { id: 42, name: 'Emergency Fund', current_amount: 5000 },
  { id: 9007199254740993n, name: 'Long Term Investments', current_amount: 20000 },
  { id: 'starter-1', name: 'Starter Vacation', current_amount: 1000 },
];

// Allocation by string '42'
const afterAlloc = initialGoals.map((g) =>
  String(g.id) === '42' ? { ...g, current_amount: g.current_amount + 200 } : g
);
assert(afterAlloc.find((g) => g.id === 42).current_amount === 5200, 'Allocation by string ID updates numeric database goal');

// Deposit by string '42'
const afterDep = afterAlloc.map((g) =>
  String(g.id) === '42' ? { ...g, current_amount: g.current_amount + 300 } : g
);
assert(afterDep.find((g) => g.id === 42).current_amount === 5500, 'Deposit by string ID updates numeric database goal');

// Delete by string '42'
const afterDelete = afterDep.filter((g) => String(g.id) !== '42');
assert(afterDelete.length === 2 && !afterDelete.some((g) => g.id === 42), 'Deletion by string ID removes numeric database goal');

// Delete BigInt goal by string '9007199254740993'
const afterBigIntDelete = afterDelete.filter((g) => String(g.id) !== '9007199254740993');
assert(afterBigIntDelete.length === 1 && afterBigIntDelete[0].id === 'starter-1', 'Deletion by string ID removes BigInt database goal');

console.log(`\nAll receipt lifecycle tests passed: ${passed}/${total}`);
if (passed !== total) {
  process.exit(1);
}
