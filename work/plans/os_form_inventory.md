# Codebase Form Element Inventory

This inventory documents all native HTML form elements (`<input>`, `<select>`, `<textarea>`, `<option>`, `<form>`), browser popup dialog calls (`prompt()`, `confirm()`, `alert()`), and existing custom form component architectures found within `/Users/letanthang/learning_software/financial mangement/src/`.

---

## 1. Native HTML Form Elements by File

### 1. `src/components/auth/LoginPage.jsx`
* **`<form>`**
  * **Purpose:** User authentication / password reset submit form
  * **ClassName:** `space-y-5 relative z-10`
  * **Style System:** Tailwind CSS
* **`<input>` (Email)**
  * **Type:** `email`
  * **Purpose:** User email address entry
  * **ClassName:** `input-shell w-full`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full`)
* **`<input>` (Password)**
  * **Type:** `password`
  * **Purpose:** User password entry (hidden during password reset flow)
  * **ClassName:** `input-shell w-full`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full`)

---

### 2. `src/components/comments/CommentDrawer.jsx`
* **`<form>`**
  * **Purpose:** Submit expense comment / note
  * **ClassName:** `border-t border-[var(--outline-variant)] px-5 py-5 sm:px-6`
  * **Style System:** Tailwind CSS
* **`<textarea>` (Draft Comment)**
  * **Purpose:** Multi-line text field for entering comments or context on an expense
  * **ClassName:** `input-shell min-h-[100px] resize-none w-full p-4`
  * **Style System:** `input-shell` + Tailwind CSS (`min-h-[100px] resize-none w-full p-4`)

---

### 3. `src/components/comments/MonthlyNoteModal.jsx`
* **`<textarea>` (Monthly Note)**
  * **Purpose:** Multi-line text field for writing monthly review notes and feedback
  * **ClassName:** `input-shell w-full resize-none p-4`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full resize-none p-4`)

---

### 4. `src/components/expenses/BulkReviewForm.jsx`
* **`<input>` (Amount)**
  * **Type:** `number` (`step="0.01" min="0"`)
  * **Purpose:** Dollar amount per item in bulk receipt review list
  * **ClassName:** `input-shell w-full h-10`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-10`)
* **`<select>` (Category)**
  * **Purpose:** Expense category selector per bulk item
  * **ClassName:** `input-shell w-full h-10`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-10`)
* **`<option>`**
  * **Purpose:** Dynamic category options mapped from `CATEGORIES` array
  * **ClassName:** None (default native browser styling)
  * **Style System:** Native HTML
* **`<input>` (Date)**
  * **Type:** `date`
  * **Purpose:** Date picker for bulk review item
  * **ClassName:** `input-shell w-full h-10`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-10`)
* **`<input>` (Note)**
  * **Type:** `text`
  * **Purpose:** Description / title of bulk receipt item
  * **ClassName:** `input-shell w-full h-10`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-10`)

---

### 5. `src/components/expenses/ExpenseForm.jsx`
* **`<form>`**
  * **Purpose:** Manual expense creation form submission container
  * **ClassName:** `flex flex-col gap-6`
  * **Style System:** Tailwind CSS
* **`<input>` (Amount)**
  * **Type:** `number` (`step="0.01" min="0"`)
  * **Name:** `amount`
  * **Purpose:** Expense dollar amount input field
  * **ClassName:** `input-shell w-full text-headline-md h-14`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full text-headline-md h-14`)
* **`<select>` (Category)**
  * **Name:** `category`
  * **Purpose:** Main category dropdown selector
  * **ClassName:** `input-shell w-full h-14`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-14`)
* **`<option>`**
  * **Purpose:** Expense category options mapped from `CATEGORIES` array
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Note)**
  * **Type:** `text`
  * **Name:** `note`
  * **Purpose:** Optional expense description field
  * **ClassName:** `input-shell w-full h-12`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-12`)
* **`<input>` (Date)**
  * **Type:** `date`
  * **Name:** `date`
  * **Purpose:** Expense date picker
  * **ClassName:** `input-shell w-full h-12`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full h-12`)

---

### 6. `src/components/expenses/ReceiptScanner.jsx`
* **`<input>` (File Picker)**
  * **Type:** `file` (`multiple accept="image/*"`)
  * **Purpose:** Hidden file input triggered by custom button to upload receipt images for AI processing
  * **ClassName:** `hidden`
  * **Style System:** Pure Tailwind CSS (`hidden`)

---

### 7. `src/components/shell/Topbar.jsx`
* **`<input>` (Search Bar)**
  * **Type:** `text`
  * **Purpose:** Global header search bar
  * **ClassName:** `bg-[rgba(255,255,255,0.05)] border border-white/10 rounded-full py-1.5 pl-9 pr-4 h-9 w-64 text-label-md text-[var(--on-surface)] placeholder:text-[var(--outline)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/40 transition-all`
  * **Style System:** Pure Tailwind CSS (Does **not** use `input-shell`)

---

### 8. `src/components/subscriptions/AddSubscriptionModal.jsx`
* **`<form>`**
  * **Purpose:** Add subscription modal submission container
  * **ClassName:** `flex flex-col gap-4`
  * **Style System:** Tailwind CSS
* **`<input>` (Service Name)**
  * **Type:** `text`
  * **Purpose:** Subscription title/name (e.g. Netflix, Gym)
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<input>` (Amount)**
  * **Type:** `number` (`min="0.01" step="0.01"`)
  * **Purpose:** Recurring billing amount
  * **ClassName:** `input-shell w-full pl-7`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full pl-7`)
* **`<select>` (Currency)**
  * **Purpose:** Subscription currency picker
  * **ClassName:** `input-shell appearance-none bg-[var(--surface-container)]`
  * **Style System:** `input-shell` + Tailwind CSS (`appearance-none bg-[var(--surface-container)]`)
* **`<option>`**
  * **Purpose:** Hardcoded currency codes (USD, EUR, GBP, CAD, AUD, VND)
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Brand Domain)**
  * **Type:** `text`
  * **Purpose:** Optional domain for fetching service logos (e.g. netflix.com)
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<input>` (Plan Tier)**
  * **Type:** `text`
  * **Purpose:** Optional tier description (e.g. Premium, Family)
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<select>` (Frequency)**
  * **Purpose:** Billing frequency selection
  * **ClassName:** `input-shell appearance-none bg-[var(--surface-container)]`
  * **Style System:** `input-shell` + Tailwind CSS (`appearance-none bg-[var(--surface-container)]`)
* **`<option>`**
  * **Purpose:** Options for "weekly" and "monthly"
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Start Date)**
  * **Type:** `date`
  * **Purpose:** First billing cycle date
  * **ClassName:** `input-shell w-full bg-[var(--surface-container)] text-[var(--on-surface)] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`
  * **Style System:** `input-shell` + Tailwind CSS
* **`<input>` (Remind Enabled Checkbox)**
  * **Type:** `checkbox`
  * **Purpose:** Toggle reminder alert feature
  * **ClassName:** `w-4 h-4 rounded accent-[var(--primary)]`
  * **Style System:** Pure Tailwind CSS
* **`<input>` (Remind Days Prior)**
  * **Type:** `number` (`min="1" max="30"`)
  * **Purpose:** Number of days before billing date to notify user
  * **ClassName:** `input-shell py-1 px-2 w-16 text-center text-xs`
  * **Style System:** `input-shell` + Tailwind CSS (`py-1 px-2 w-16 text-center text-xs`)

---

### 9. `src/components/subscriptions/SubscriptionCard.jsx`
* **`<input>` (Active Status Toggle Checkbox)**
  * **Type:** `checkbox`
  * **Purpose:** Peer checkbox backing a custom switch toggle for active/inactive status
  * **ClassName:** `sr-only peer`
  * **Style System:** Pure Tailwind CSS (`sr-only peer`)

---

### 10. `src/components/subscriptions/SubscriptionDetailModal.jsx`
* **`<form>` (Edit Mode)**
  * **Purpose:** Form for editing subscription details
  * **ClassName:** `flex flex-col gap-4`
  * **Style System:** Tailwind CSS
* **`<input>` (Service Name)**
  * **Type:** `text`
  * **Purpose:** Edit subscription name
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<input>` (Amount)**
  * **Type:** `number` (`min="0.01" step="0.01"`)
  * **Purpose:** Edit subscription amount
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<select>` (Currency)**
  * **Purpose:** Edit currency dropdown
  * **ClassName:** `input-shell bg-[var(--surface-container)]`
  * **Style System:** `input-shell` + Tailwind CSS (`bg-[var(--surface-container)]`)
* **`<option>`**
  * **Purpose:** Hardcoded currency choices
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Domain)**
  * **Type:** `text`
  * **Purpose:** Edit service domain
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<input>` (Plan Tier)**
  * **Type:** `text`
  * **Purpose:** Edit plan tier string
  * **ClassName:** `input-shell`
  * **Style System:** `input-shell`
* **`<select>` (Frequency)**
  * **Purpose:** Edit frequency dropdown
  * **ClassName:** `input-shell bg-[var(--surface-container)]`
  * **Style System:** `input-shell` + Tailwind CSS (`bg-[var(--surface-container)]`)
* **`<option>`**
  * **Purpose:** Weekly/Monthly choices
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Remind Checkbox)**
  * **Type:** `checkbox`
  * **Purpose:** Edit reminder toggle status
  * **ClassName:** `w-4 h-4 rounded accent-[var(--primary)]`
  * **Style System:** Pure Tailwind CSS
* **`<input>` (Remind Days)**
  * **Type:** `number` (`min="1" max="30"`)
  * **Purpose:** Edit lead days for billing reminder
  * **ClassName:** `input-shell py-1 px-2 w-16 text-center text-xs`
  * **Style System:** `input-shell` + Tailwind CSS (`py-1 px-2 w-16 text-center text-xs`)

---

### 11. `src/pages/BudgetSettingsPage.jsx`
* **`<form>`**
  * **Purpose:** Save budget baseline and income source settings
  * **ClassName:** `glass-card p-6 sm:p-8 rounded-2xl space-y-6 border border-[var(--outline-variant)]/40 transition-all duration-300`
  * **Style System:** Tailwind CSS
* **`<input>` (Fixed Base Budget)**
  * **Type:** `number` (`step="0.01" min="0"`)
  * **Purpose:** Monthly fixed base budget input
  * **ClassName:** `input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/30`
  * **Style System:** `input-shell` + Tailwind CSS
* **`<input>` (Full-Time Salary Allocation)**
  * **Type:** `number` (`step="0.01" min="0"`)
  * **Purpose:** Monthly salary allocation for budget computation
  * **ClassName:** `input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--tertiary)] focus:ring-2 focus:ring-[var(--tertiary)]/30`
  * **Style System:** `input-shell` + Tailwind CSS
* **`<input>` (Part-Time Hours)**
  * **Type:** `number` (`step="0.5" min="0"`)
  * **Purpose:** Part-time monthly hours input
  * **ClassName:** `input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/30`
  * **Style System:** `input-shell` + Tailwind CSS
* **`<input>` (Part-Time Hourly Rate)**
  * **Type:** `number` (`step="0.5" min="0"`)
  * **Purpose:** Part-time hourly rate input
  * **ClassName:** `input-shell w-full no-spinners transition-all duration-300 focus:border-[var(--secondary)] focus:ring-2 focus:ring-[var(--secondary)]/30`
  * **Style System:** `input-shell` + Tailwind CSS

---

### 12. `src/pages/SavingsGoalsPage.jsx`
* **`<form>` (Add Goal Modal)**
  * **Purpose:** Form submission for creating a new savings goal
  * **ClassName:** `space-y-4`
  * **Style System:** Tailwind CSS
* **`<input>` (Goal Name)**
  * **Type:** `text`
  * **Purpose:** Name of savings target (e.g. New Laptop)
  * **ClassName:** `input-shell w-full`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full`)
* **`<input>` (Target Amount)**
  * **Type:** `number` (`min="1"`)
  * **Purpose:** Total savings amount target (NZD)
  * **ClassName:** `input-shell w-full`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full`)
* **`<input>` (Initial Savings)**
  * **Type:** `number` (`min="0"`)
  * **Purpose:** Starting funded balance amount (NZD)
  * **ClassName:** `input-shell w-full`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full`)
* **`<select>` (Priority)**
  * **Purpose:** Goal priority dropdown (low, medium, high)
  * **ClassName:** `input-shell w-full bg-[var(--surface-container)]`
  * **Style System:** `input-shell` + Tailwind CSS (`w-full bg-[var(--surface-container)]`)
* **`<option>`**
  * **Purpose:** Options for Low, Medium, High priorities
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Deadline Date)**
  * **Type:** `date`
  * **Purpose:** Target deadline date picker
  * **ClassName:** `input-shell w-full bg-[var(--surface-container)] text-[var(--on-surface)] [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert`
  * **Style System:** `input-shell` + Tailwind CSS

---

### 13. `src/pages/SpendingBreakdownPage.jsx`
* **`<select>` (Period Selector)**
  * **Purpose:** Date period filtering for spending reports
  * **ClassName:** `input-shell h-10 px-3 min-w-[160px] cursor-pointer appearance-none bg-[var(--surface-container)] text-[var(--on-surface)] bg-no-repeat`
  * **Style System:** `input-shell` + Tailwind CSS
* **`<option>`**
  * **Purpose:** Period choices mapped from `PERIOD_OPTIONS` array
  * **ClassName:** None
  * **Style System:** Native HTML
* **`<input>` (Custom Start Date)**
  * **Type:** `date`
  * **Purpose:** Start date for custom period filtering
  * **ClassName:** `input-shell h-10 px-3 w-[140px] bg-[var(--surface-container)] text-[var(--on-surface)]`
  * **Style System:** `input-shell` + Tailwind CSS (`h-10 px-3 w-[140px] bg-[var(--surface-container)] text-[var(--on-surface)]`)
* **`<input>` (Custom End Date)**
  * **Type:** `date`
  * **Purpose:** End date for custom period filtering
  * **ClassName:** `input-shell h-10 px-3 w-[140px] bg-[var(--surface-container)] text-[var(--on-surface)]`
  * **Style System:** `input-shell` + Tailwind CSS (`h-10 px-3 w-[140px] bg-[var(--surface-container)] text-[var(--on-surface)]`)

---

## 2. Browser Window Dialog Calls (`prompt()`, `confirm()`, `alert()`)

* **`prompt()`**: 1 occurrence found
  * **File:** `src/pages/SavingsGoalsPage.jsx` (Line 194)
  * **Code:** `const amount = prompt(\`Add deposit to \${goal.name} (NZD):\`, '100');`
  * **Purpose:** Prompts the user to quickly input a deposit amount for a savings goal.
* **`confirm()`**: 0 occurrences found
* **`alert()`**: 0 occurrences found

---

## 3. Existing Custom Form Components Evaluation

* **Custom Form Abstractions:** **None exist**.
* **Architecture Summary:** The codebase does not use custom React wrapper components for form controls (such as `<Input />`, `<Select />`, `<TextField />`, or `<FormGroup />`). All form inputs throughout the application render raw HTML tags directly (`<input>`, `<select>`, `<textarea>`, `<option>`, `<form>`).
* **Styling Strategy:** Inputs are styled by attaching the global `.input-shell` CSS class (defined in `src/styles/design-tokens.css` and `src/index.css`) alongside inline Tailwind CSS helper utility classes (such as `w-full`, `h-10`, `resize-none`, etc.), or purely using Tailwind CSS classes for specialty controls (e.g. checkboxes and search bar).
