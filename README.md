# Financial Management Dashboard

A modern, comprehensive personal finance dashboard built with React and Vite. It goes beyond simple expense tracking by incorporating advanced features like AI-powered receipt scanning, subscription tracking, shared budgets with role-based access, and month-to-month carry-over momentum.

## 🌟 Key Features

### 🤖 AI Receipt Scanning (Highlight!)
Manually entering expenses is tedious. This app features an intelligent **AI Receipt Scanner** powered by Google's Gemini AI. 
- **Drag & Drop Upload:** Simply drop an image of your receipt (or multiple receipts) into the app.
- **Auto-Extraction:** The AI automatically scans the image and extracts the line items, mapping them to standard properties: `Amount`, `Category`, `Date`, and `Note`.
- **Bulk Review:** Review all AI-extracted expenses at once before saving them to your ledger.
- **Smart Error Handling:** Clean feedback if an unreadable file is uploaded or the AI model is overloaded.

### 👥 Shared Budgets & Roles
Manage finances together. Connect to Supabase to enable real-time collaboration with role-based access:
- **Owner:** Full control over budget and expenses.
- **Reviewer:** Can view expenses and leave comments on specific line items (e.g., a financial advisor or partner).
- **Viewer:** Read-only access to the dashboard.

### 📊 Comprehensive Financial Tracking
- **Expense Tracking:** Log your daily expenses with categorized data.
- **Subscription Management:** Keep track of fixed monthly costs and see how they eat into your baseline budget.
- **Carry-Over Momentum:** If you stay under budget this month, the surplus carries over to the next, encouraging long-term savings.
- **Analytics & Trends:** Visual breakdowns of where your money is going using interactive charts.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite
- **Styling:** Tailwind CSS, Framer Motion (for smooth micro-animations), Lucide React (icons)
- **Data Visualization:** Recharts
- **AI Integration:** `@google/generative-ai` (Gemini Flash model for receipt parsing)
- **Backend/Auth:** Supabase (Authentication, Row Level Security, Realtime Database)
- **State/Dates:** Custom hooks, `date-fns`, local storage fallback

## 🚀 Getting Started

### Prerequisites
- Node.js installed on your machine
- A Gemini API Key (for the AI Receipt Scanner)
- A Supabase Project (optional, for cloud sync and roles)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd "financial management"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up your environment variables:
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to the local URL provided by Vite (usually `http://localhost:5173`).

## 💡 How the AI Receipt Scanner Works
The receipt scanner uses the `ReceiptLLMProvider` which interfaces with the `gemini-3.5-flash` model. When an image is uploaded, it is converted to base64 and sent to the LLM along with a strict prompt instructing it to return raw JSON containing an array of categorized expenses. The frontend parses this JSON and presents it in a sleek `BulkReviewForm` for the user to approve.

## 🔒 Local vs Cloud Mode
The app supports both local-only usage (using `localStorage`) and cloud-synced usage (using Supabase). You can toggle `USE_SUPABASE` in `src/App.jsx` to switch between a fully local experience or a collaborative cloud workspace.
