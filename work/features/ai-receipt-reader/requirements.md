# Requirements: AI Receipt Reader

## 1. Core Functionality
- **1.1 Multi-File Upload**: Users can upload one or multiple receipt images at once.
- **1.2 Image Parsing**: The system extracts expense data (amount, category, date, note) from the images using an LLM (OpenRouter API).
- **1.3 Multi-Item Extraction**: A single receipt may contain multiple line items. The system must extract all individual items.

## 2. User Experience (UX)
- **2.1 Upload Interface**: Provide a drag-and-drop zone on desktop and native camera/gallery selection on mobile.
- **2.2 Pre-Processing Preview**: Display a grid of image thumbnails before processing. Allow users to add or remove images.
- **2.3 Loading Animation**: Display a premium "laser scanning" glassmorphism animation while the LLM is processing.
- **2.4 In-Place Flow**: The scanning interface should replace the manual form in-place using fluid animations, avoiding page redirects.

## 3. Error Handling
- **3.1 Partial Success**: If processing multiple images and some fail (e.g., blurry), the system must proceed with the successful ones and notify the user of the failures.
- **3.2 Complete Failure**: If all images fail, return to the scanner interface with an appropriate error message.

## 4. Bulk Review
- **4.1 Bulk Review Form**: Display all successfully extracted items in a list.
- **4.2 Editable Rows**: Users can edit the amount, category, date, or note for any extracted item.
- **4.3 Row Management**: Users can delete incorrect items or manually add new rows.
- **4.4 Bulk Save**: A single action to save all reviewed expenses to the database.

## 5. Security & Configuration
- **5.1 API Key Protection**: The OpenRouter API key must be managed via CI/CD secrets and injected via environment variables (`VITE_OPENROUTER_API_KEY`), never hardcoded.
