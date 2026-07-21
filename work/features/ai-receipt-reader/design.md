# Design: AI Receipt Reader

## 1. Architecture Overview
The feature integrates entirely on the frontend, utilizing the Google AI Studio (Gemini) API directly to parse images.
- **Service Layer**: `ReceiptLLMProvider` class handles API communication (via `@google/generative-ai` SDK), prompt construction, and response validation.
- **UI Components**:
  - `ReceiptScanner`: Handles drag-and-drop, file selection, preview grid, and loading animations.
  - `BulkReviewForm`: Manages the state of an array of extracted expense items, allowing CRUD operations before final submission.
  - `ExpenseForm` (Modified): Acts as the parent orchestrator. It manages the view state (`manual` | `scanning` | `reviewing`) and handles the final save logic.

## 2. Workflows
1. **User clicks "Scan Receipt"**: `ExpenseForm` state changes to `scanning`. `ReceiptScanner` mounts with a slide-in animation.
2. **User selects files**: `ReceiptScanner` displays thumbnail previews.
3. **User confirms**:
   - `ReceiptScanner` enters loading state (laser animation).
   - Base64 encoded images are sent concurrently to `ReceiptLLMProvider`.
4. **LLM Processing**:
   - The LLM parses each image, returning a JSON array of items per image.
   - Errors (blurry images) are caught and separated from successful parses.
5. **Review**:
   - `ExpenseForm` state changes to `reviewing`.
   - `BulkReviewForm` mounts, displaying successful items.
   - A warning alert is shown if any images failed.
6. **Save**: User clicks "Save All". `ExpenseForm` iterates through the items, creating individual expense records.

## 3. UI/UX Design (Wireframes)
- **Scanning State**: Dashed border with glassmorphism background. Central icon. On file select, a horizontal list of square thumbnails with 'X' buttons in the top right.
- **Processing State**: The image grid dims/blurs. A horizontal glowing line (laser) animates up and down over the container.
- **Review State**: A vertically scrolling list. Each row contains input fields for Note, Amount, Category (dropdown), and Date, plus a trash can icon to delete. A "+ Add Row" button sits at the bottom.

## 4. LLM Prompt Design
The system prompt strictly enforces a JSON output format. It instructs the model to return an array of items, mapping to predefined categories (`Food`, `Groceries`, etc.), and enforcing a specific error schema if the image is unreadable.
