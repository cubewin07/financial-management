TASK 1.0: Phase 1 Foundation — design tokens, AppShell, Sidebar, Topbar, AuthGuard, LoginPage, SummaryMetricCard, react-router routing

You are the foundation lane worker for Luminous Velocity redesign. Work ONLY in this session. Do not spawn subagents.

SCOPE (create/modify only these — nothing else):
- package.json / package-lock.json (add react-router-dom only)
- index.html (Plus Jakarta Sans font link if needed)
- src/styles/design-tokens.css (NEW)
- src/index.css (import tokens; replace old purple/teal token roots with Luminous Velocity; keep Tailwind directives)
- src/components/shell/AppShell.jsx (NEW)
- src/components/shell/Sidebar.jsx (NEW)
- src/components/shell/Topbar.jsx (NEW)
- src/components/auth/AuthGuard.jsx (NEW)
- src/components/auth/LoginPage.jsx (NEW)
- src/components/ui/SummaryMetricCard.jsx (NEW)
- src/App.jsx (wire AuthGuard + AppShell + routes; extract session gate; keep existing data hooks/expense logic working for old pages temporarily)
- src/main.jsx (BrowserRouter if needed)

DO NOT rewrite or restyle: DashboardPage, SubscriptionsPage, SpendingBreakdownPage, or any other STALE page components yet (Phases 2–4). Temporary: render existing pages inside AppShell content slot so app still runs.
DO NOT modify the 13 REUSABLE files (hooks/*, lib/*, utils/*) — import them only.
DO NOT add Investments, Budget, Reports, Settings, Savings nav items.
DO NOT invent savings goals, brand logos, multi-currency, plan tiers, membership badges, next-billing schema columns.

LOCKED TOKENS (verbatim — do not paraphrase or substitute):
Colors:
- background/surface: #15121b
- surface-container-lowest: #0f0d15
- surface-container / -low / -high / -highest: #211e27 / #1d1a23 / #2c2832 / #37333d
- on-surface: #e7e0ed
- on-surface-variant: #cbc3d7
- outline / outline-variant: #958ea0 / #494454
- primary (Electric Violet): #d0bcff
- on-primary: #3b0091
- primary-container: #9f78ff
- secondary (Cyan Neon): #d3fbff / container #00eefc
- tertiary (Neon Pink): #ffb0ca / container #f15999
- error / error-container: #ffb4ab / #93000a

Typography — Plus Jakarta Sans:
- display: 48px / 700 / 1.2, -0.02em
- headline-lg: 32px / 700 / 1.2 (28px mobile)
- headline-md: 24px / 600 / 1.3
- body-lg: 18px / 500 / 1.6
- body-md: 16px / 400 / 1.6
- label-md: 14px / 500 / 1.4, +0.01em
- label-sm: 12px / 500 / 1.4, +0.02em

Shape & Spacing:
- rounded-xl: 1.5rem (24px) glass cards
- rounded-lg: 1rem (16px) buttons/inputs
- rounded-full: pill progress bars / active indicator
- sidebar-width: 260px fixed
- gutter: 24px
- margins: 40px desktop / 24px tablet / 16px mobile

Elevation & Glass:
- Glass surface: rgba(255,255,255,0.05) + backdrop-filter: blur(20px)
- Card border: 1px rgba(255,255,255,0.1) + 1px white-10% top inner highlight
- Primary buttons: linear gradient violet→pink with matching soft outer glow
- Secondary buttons: ghost-glass with subtle border
- Inputs: dark bg, primary glow on focus

DOES (implement all of 1.1–1.8):

1.1 design-tokens.css — CSS custom properties for all tokens above + utility classes: .glass-card, .btn-primary, .btn-secondary, .input-shell, type scale classes.

1.2 AppShell — layout: fixed 260px Sidebar left + Topbar + scrollable main content {children}. Desktop persistent sidebar. Mobile (<md): sidebar hidden; hamburger opens overlay drawer (NOT shrink-to-rail, NOT bottom nav). Content offset accounts for sidebar on desktop.

1.3 Sidebar — brand text "Luminous" at top. Nav EXACTLY three items: Dashboard (/), Subscriptions (/subscriptions), Spending Breakdown (/breakdown). Active state: low-opacity primary tint bg + 4px vertical pill light bar on left edge. Avatar/session area at bottom showing user email + Sign out. Use lucide-react icons (LayoutDashboard, CreditCard, PieChart or similar).

1.4 Topbar — minimal glass: page title (from route), optional search input (visual only / client filter stub — no backend), no notification spam. Violet focus rings. Do NOT put primary nav here.

1.5 AuthGuard — extract/reuse existing Supabase session logic from App.jsx (getSession, onAuthStateChange). While checking: glass loading state. No session → render LoginPage (no shell). Session present → children. Keep membership/role loading in App for now if already there — AuthGuard only needs session gate for Phase 1; do not break existing membership load.

1.6 LoginPage — full-page auth (NO sidebar/topbar). Email/password sign-in via supabase.auth.signInWithPassword. Optional forgot-password via resetPasswordForEmail. Match Luminous tokens (glass card centered on #15121b). Sign-up only if existing SupabaseAuthExample already supported it; otherwise sign-in + reset only.

1.7 SummaryMetricCard — reusable glass card: label, value, optional delta/hint props. Tokens only; no data fetching.

1.8 Routing — install react-router-dom. Routes:
  / → DashboardPage (existing, temporary)
  /subscriptions → SubscriptionsPage (existing)
  /breakdown → SpendingBreakdownPage (existing)
  Wrap authenticated tree in AppShell. Nav Links use react-router. Remove horizontal pill-tab nav from old App header.

ORCHESTRATOR DECISIONS (do not re-decide):
- Brand: "Luminous"
- Mobile: hamburger overlay
- MONTHLY_BUDGET: leave constant as-is for Phase 1 (do not change budget value this phase)
- No new schema

SUBAGENT BUDGET: 0. Do this yourself in this session. Do not spawn subagents.

ACCEPTANCE CRITERIA:
- Tokens match Shell Lock hex/radii/blur exactly
- Nav is only Dashboard / Subscriptions / Spending Breakdown
- Login has no sidebar/topbar
- Mobile sidebar is hamburger overlay not rail
- REUSABLE hooks/lib/utils imported not rewritten
- npm run build succeeds
- App still loads existing pages inside new shell when authenticated

REPORT BACK:
1. Files changed (list)
2. Any token/spec deviation and why
3. Build result
4. Then STAGE ONLY your Phase 1 files and commit with message exactly:

Phase 1: Foundation — design tokens, AppShell, auth, routing

Tasks: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8
Design decisions: brand Luminous; hamburger mobile overlay; react-router-dom v6
Deviations from spec: none (or list)
Flags for review: none

5. Confirm with `git log -1 --oneline` and paste hash.

Start now. Read work/plans/Luminous_Velocity_Shell_Lock.md and existing src/App.jsx auth blocks before coding.
