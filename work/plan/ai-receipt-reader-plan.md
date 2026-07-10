# Goal Description

Add an AI-powered receipt scanning feature capable of processing **multiple receipts at once** and extracting line items from them. The LLM will parse the receipts and return a list of individual expenses. The user can then review, edit, and add to this list before saving them all in bulk.

### Proposed UX Flow
1. **Upload & Preview**: The manual form fields slide out, and the `ReceiptScanner` slides in. The user can upload one or more receipts. We show a **preview grid** of the selected images. The user can remove images or add more.
2. **Confirmation & Processing**: Once the user accepts the previews, they click "Analyze X Receipts". A premium laser-scanning animation plays over the images. We process the images concurrently via the LLM.
3. **Partial Success (Error Handling)**: If some images are clear but others are blurry, we **do not stop the whole process**. We move forward with the successfully scanned items, and show a clear alert at the top of the screen (e.g., "⚠️ 1 receipt was too blurry to read") allowing them to retry just the failed ones later.
4. **Bulk Review Form**: A new `BulkReviewForm` slides in, displaying a list of all extracted items from the successful receipts. 
5. **Editing & Saving**: The user can edit the amount/category/note of any item, delete items, or manually add a new row if the AI missed something. Finally, they click "Save All X Expenses".

### Layout Visualization (Wireframe)

```text
+---------------------------------------------------+
|               Add Expense (Modal)                 |
|                                                   |
|  [ Back to Manual ]                               |
|                                                   |
|  [⚠️ 1 receipt was too blurry. Try again]         |
|                                                   |
|  Review Scanned Items                             |
|  ------------------------------------------------ |
|  Item 1: [ Note Input ] [$ Amount] [Category ▾] ✕ |
|  Item 2: [ Note Input ] [$ Amount] [Category ▾] ✕ |
|  Item 3: [ Note Input ] [$ Amount] [Category ▾] ✕ |
|  ------------------------------------------------ |
|  + Add Missing Item                               |
|                                                   |
|                           [ Save All 3 Expenses ] |
+---------------------------------------------------+
```

## User Review Required

- **API Keys & CI/CD**: To keep your API keys secure in CI/CD (like GitHub Actions), you should store them as Repository Secrets (e.g., `OPENROUTER_API_KEY`). Then, in your GitHub Actions workflow file, you pass it to the environment for Vite to pick it up, like so:
  ```yaml
  env:
    VITE_OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  ```
  This ensures the key is available when the frontend builds or runs, without being exposed in your source code.

## Proposed Changes

### Library/Utils
#### [NEW] `src/lib/ReceiptLLMProvider.js`
- Create a class `ReceiptLLMProvider`.
- Configure it to use `google/gemini-1.5-flash` via OpenRouter (fast, cost-effective, and highly capable for vision tasks).
- Include a system prompt instructing the LLM to return a JSON array of items (each with `amount`, `category`, `date`, and `note`).
- Implement a `parseReceipt(base64Image)` method that makes a `fetch` request to the OpenRouter API using `import.meta.env.VITE_OPENROUTER_API_KEY`.

### Components
#### [NEW] `src/components/ReceiptScanner.jsx`
- Create a responsive component for image upload with `multiple` file support.
- Manage states for selected files, allowing users to preview thumbnails, remove them, or add more before confirming.
- On confirmation, show the "laser scanning" effect and process all files concurrently.
- Pass an array of successful results and an array of errors to the parent.

#### [NEW] `src/components/BulkReviewForm.jsx`
- A new component that receives an array of expenses from the LLM.
- Renders a list of editable rows (amount, category, note).
- Allows deleting rows or adding blank rows.
- Returns the final array to the parent to be saved.

#### [MODIFY] `src/components/ExpenseForm.jsx`
- Add a view state manager: `mode: 'manual' | 'scanning' | 'reviewing'`.
- Pass the scanned array to `BulkReviewForm`.
- Handle a `saveMultipleExpenses(items)` function that loops over the array and calls the existing save logic for each item.

#### [MODIFY] `src/index.css`
- Add `@keyframes scanner-laser` and a `.scanner-laser` utility class for the custom scanning animation.

## Verification Plan

### Manual Verification
- Test the desktop drag-and-drop experience.
- Test the mobile camera/gallery selection using responsive design mode.
- Mock the API response to test success (valid JSON returned) and failure (unclear image) flows.
- Verify that the `ExpenseForm` correctly pre-fills with the LLM's data and allows manual overrides.
