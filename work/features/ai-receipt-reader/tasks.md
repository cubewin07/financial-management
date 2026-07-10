# Tasks: AI Receipt Reader

## Overview
Implementation plan for the AI Receipt Reader, breaking down the work into the Service Layer, UX/UI Components, and Orchestration. The tasks are grouped into execution waves.

## Tasks

- [ ] 1. Core Services & API
  - [ ] 1.1 Create `ReceiptLLMProvider`
    - `src/lib/ReceiptLLMProvider.js`: Implement class with OpenRouter API integration.
    - Set `google/gemini-1.5-flash` as default model.
    - Implement system prompt for multi-item JSON extraction.
    - _Requirements: 1.2, 1.3, 5.1_
  - [ ] 1.2 Implement error handling and JSON validation
    - Ensure `parseReceipt` handles blurry images and malformed JSON gracefully.
    - _Requirements: 3.2_

- [ ] 2. UI: Scanner & Preview
  - [ ] 2.1 Create base `ReceiptScanner` layout
    - `src/components/ReceiptScanner.jsx`: Drag & drop for desktop, file input for mobile.
    - _Requirements: 2.1_
  - [ ] 2.2 Implement multi-file preview
    - Add state for selected files and render a thumbnail grid. Allow removal of files.
    - _Requirements: 2.2_
  - [ ] 2.3 Implement laser scanning animation
    - `src/index.css`: Add `@keyframes scanner-laser`.
    - `src/components/ReceiptScanner.jsx`: Apply animation overlay during processing.
    - _Requirements: 2.3_

- [ ] 3. UI: Bulk Review
  - [ ] 3.1 Create `BulkReviewForm` component
    - `src/components/BulkReviewForm.jsx`: Render a list of editable rows based on LLM output.
    - _Requirements: 4.1, 4.2_
  - [ ] 3.2 Implement row management
    - Add functions to delete rows and add blank rows manually.
    - _Requirements: 4.3_

- [ ] 4. Orchestration & Integration
  - [ ] 4.1 Update `ExpenseForm` state management
    - Modify `src/components/ExpenseForm.jsx` to use a `mode` state (`manual`, `scanning`, `reviewing`).
    - Use `framer-motion` for smooth transitions between modes.
    - _Requirements: 2.4_
  - [ ] 4.2 Implement concurrent processing & partial success
    - Connect `ReceiptScanner` to `ReceiptLLMProvider`. Process multiple images concurrently using `Promise.allSettled`.
    - Pass successful items and error counts to `ExpenseForm`.
    - _Requirements: 1.1, 3.1_
  - [ ] 4.3 Implement Bulk Save logic
    - Update `ExpenseForm` to iterate over the reviewed array and save each expense.
    - _Requirements: 4.4_

- [ ] 5. Testing & Polish
  - [ ] 5.1 Manual verification of desktop/mobile UX.
  - [ ] 5.2 Test edge cases (all images fail, some fail, LLM returns invalid JSON).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1"] },
    { "id": 1, "tasks": ["2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2"] },
    { "id": 4, "tasks": ["4.3"] },
    { "id": 5, "tasks": ["5.1", "5.2"] }
  ]
}
```
