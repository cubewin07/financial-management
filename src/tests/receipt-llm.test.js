import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReceiptLLMProvider } from '../lib/ReceiptLLMProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define FileReader stub globally for Node.js
globalThis.FileReader = class {
  readAsDataURL(file) {
    try {
      if (file.isMockBase64) {
        this.result = `data:${file.type};base64,${file.base64Data}`;
      } else {
        const buffer = fs.readFileSync(file.path);
        const base64 = buffer.toString('base64');
        this.result = `data:${file.type};base64,${base64}`;
      }
      if (this.onloadend) this.onloadend();
    } catch (err) {
      console.error("Error in FileReader stub reading path:", file.path, err);
    }
  }
};

// Simple helper to load .env file manually
function loadEnv() {
  const envPath = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
  }
}

async function runTest() {
  loadEnv();
  const provider = new ReceiptLLMProvider();

  // Test Case 1: Valid Receipt Image
  const imagePath = path.resolve(__dirname, './mock_receipt.png');
  if (!fs.existsSync(imagePath)) {
    console.error("Error: Image not found at", imagePath);
    process.exit(1);
  }

  console.log("--- TEST CASE 1: Valid Receipt Image ---");
  const mockFile1 = {
    path: imagePath,
    type: 'image/png',
    name: 'mock_receipt.png'
  };

  console.log("Parsing valid receipt...");
  const result1 = await provider.parseReceipt(mockFile1);
  console.log("Result:", JSON.stringify(result1, null, 2));

  let case1Passed = false;
  if (!result1.error && result1.items && result1.items.length > 0) {
    console.log("Case 1 PASSED!");
    case1Passed = true;
  } else {
    console.error("Case 1 FAILED!");
  }

  console.log("\n--- TEST CASE 2: Solid Black Image (Edge Case) ---");
  const blackPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  const mockFile2 = {
    isMockBase64: true,
    base64Data: blackPngBase64,
    type: 'image/png',
    name: 'black_dot.png'
  };

  console.log("Parsing unreadable black image...");
  const result2 = await provider.parseReceipt(mockFile2);
  console.log("Result:", JSON.stringify(result2, null, 2));

  let case2Passed = false;
  if (result2.error && (!result2.items || result2.items.length === 0)) {
    console.log("Case 2 PASSED! Successfully caught unreadable image.");
    case2Passed = true;
  } else {
    console.error("Case 2 FAILED! Did not flag unreadable image.");
  }

  console.log("\n==============================");
  if (case1Passed && case2Passed) {
    console.log("ALL TESTS PASSED SUCCESSFULLY!");
    process.exit(0);
  } else {
    console.error("SOME TESTS FAILED.");
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error("Fatal error running test:", err);
  process.exit(1);
});
