import { calculateTargetDimensions, compressReceiptImage } from '../utils/imageCompression.js';

console.log('--- Running Image Compression & Dimension Scaling Tests ---');

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

// 1. Dimensions Scaling Tests
console.log('\n▸ Dimension calculations:');

// Already within limits
const small = calculateTargetDimensions(800, 600, 1600);
assert(small.width === 800 && small.height === 600, 'Preserves smaller image (800x600)');

// iPhone Landscape photo (4032 x 3024, 4:3 ratio)
const landscape = calculateTargetDimensions(4032, 3024, 1600);
assert(landscape.width === 1600, 'Landscape width clamped to 1600');
assert(landscape.height === 1200, 'Landscape height scaled proportionally to 1200');

// iPhone Portrait photo (3024 x 4032, 3:4 ratio)
const portrait = calculateTargetDimensions(3024, 4032, 1600);
assert(portrait.height === 1600, 'Portrait height clamped to 1600');
assert(portrait.width === 1200, 'Portrait width scaled proportionally to 1200');

// Square image (3000 x 3000)
const square = calculateTargetDimensions(3000, 3000, 1600);
assert(square.width === 1600 && square.height === 1600, 'Square image scaled to 1600x1600');

// Extreme aspect ratio (panoramic receipt 500 x 3500)
const longReceipt = calculateTargetDimensions(500, 3500, 1600);
assert(longReceipt.height === 1600, 'Tall receipt height clamped to 1600');
assert(longReceipt.width === Math.round(1600 * (500 / 3500)), 'Tall receipt width scaled proportionally');

// Edge cases (zero or negative)
const invalidZero = calculateTargetDimensions(0, 0, 1600);
assert(invalidZero.width === 1600 && invalidZero.height === 1600, 'Handles 0x0 fallback safely');

// 2. Node Fallback for compressReceiptImage
console.log('\n▸ Node fallback execution:');
const mockBlob = { size: 1024 * 500, type: 'image/png', name: 'receipt.png' };
const res = await compressReceiptImage(mockBlob);
assert(res.originalSize === 1024 * 500, 'Returns original size in Node environment');
assert(res.width === 1600 && res.height === 1600, 'Returns target bounds in Node fallback');

// 3. PDF Document Pass-Through Pipeline
console.log('\n▸ PDF Document Pass-Through:');
const mockPdf = { size: 1024 * 750, type: 'application/pdf', name: 'invoice.pdf' };
const pdfRes = await compressReceiptImage(mockPdf);
assert(pdfRes.isPdf === true, 'Flags document as isPdf');
assert(pdfRes.originalSize === 1024 * 750, 'Preserves exact PDF file size without degradation');
assert(pdfRes.width === null && pdfRes.height === null, 'Bypasses canvas dimension scaling for PDF');

const mockPdfByExtension = { size: 1024 * 300, type: '', name: 'monthly_statement.PDF' };
const pdfExtRes = await compressReceiptImage(mockPdfByExtension);
assert(pdfExtRes.isPdf === true, 'Recognizes PDF by case-insensitive file extension');

// 4. HEIC Photo Recognition & Multi-File Batch Tests
console.log('\n▸ HEIC & Batch Handling:');
const mockHeic = { size: 1024 * 1200, type: 'image/heic', name: 'IMG_4821.HEIC' };
const heicRes = await compressReceiptImage(mockHeic);
assert(heicRes.isHeic === true, 'Recognizes iPhone HEIC photo in compression pipeline');
assert(heicRes.originalSize === 1024 * 1200, 'Preserves HEIC file size');

// Accidental array passed to compressReceiptImage
const arrayInput = [mockBlob, mockPdf];
const arrayRes = await compressReceiptImage(arrayInput);
assert(Array.isArray(arrayRes) && arrayRes.length === 2, 'Safely handles accidental array input without throwing');

// Dedicated compressReceiptImages
import { compressReceiptImages } from '../utils/imageCompression.js';
const batchRes = await compressReceiptImages([mockBlob, mockPdf, mockHeic]);
assert(batchRes.length === 3, 'compressReceiptImages processes all items in array');
assert(batchRes[0].originalSize === 1024 * 500, 'Batch item 1 size preserved');
assert(batchRes[1].isPdf === true, 'Batch item 2 PDF recognized');
assert(batchRes[2].isHeic === true, 'Batch item 3 HEIC recognized');

console.log(`\nAll compression tests passed: ${passed}/${total}`);
if (passed !== total) {
  process.exit(1);
}
