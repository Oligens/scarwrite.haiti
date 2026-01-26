# Copilot Instructions for ScarWrite (GoutBouche Rapport)

## Architecture Overview

**ScarWrite** is an offline-first PWA for financial management in restaurants and international businesses. It tracks:
- **Sales**: Product revenues with credit tracking
- **Transfers**: Money transfers via multiple services (Zelle, MonCash, Western Union, etc.) with USD/GDES amounts
- **Financial Operations**: Deposits/withdrawals maintaining dual cash and digital balances per service
- **Multi-entity Support**: Individual businesses, corporations, NGOs, nonprofits with separate accounting/tax configs
- **Accounting**: Chart of accounts (Caméléon system), tax management, supplier/client tracking

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite (SWC transpiler, no Babel)
- **Database**: Dexie.js (IndexedDB wrapper)—offline-first, no external API, fully browser-based
- **UI**: Tailwind + shadcn/ui primitives (copied locally to `src/components/ui/`, NOT from npm)
- **Forms**: Manual validation with useState/useEffect; no react-hook-form or Zod
- **State Management**: Direct storage calls; TanStack React Query NOT used for data mutations
- **Routing**: React Router v6 (25+ routes across sales, transfers, reports, accounting, admin)
- **PWA**: vite-plugin-pwa with service worker auto-update, works fully offline

---

## Critical Data Flow & Patterns

### 1. Data Layer Architecture (Single Source of Truth)
**Rule: Components NEVER call `db.*` directly.**

- **`src/lib/storage.ts`**: Public API (~70 synchronous + async functions) for all data operations. Every read/write goes through here.
- **`src/lib/database.ts`**: Dexie schema definition, interfaces, and `executeFinancialTransaction()` (atomic balance logic).
- **Flow**: Component → `storage.addSale()` / `storage.addOperation()` → (optionally) `executeFinancialTransaction()` → Dexie write → component refetch
- **No React Query mutations**: Use async/await directly in components; call storage functions in handleSubmit, then refetch data via setState.

**Example pattern** (see `SalesForm.tsx`):
```tsx
const handleSubmit = async () => {
  const sale = { id: uuid(), product_id, quantity, total, sale_date: date, ... };
  await addSale(sale); // storage.ts function
  toast({ description: 'Sale recorded' });
  onSuccess(); // refetch parent data
};
```

### 2. Balance Calculations (Dual Cash/Digital Ledger)
- Every `FinancialOperation` records `cash_before/after` and `digital_before/after`; never recompute without using storage helpers.
- Use `getCurrentBalancesForService(service: TransferType, customName?: string)` and `getLastOperationForService()` for correctness/audit.
- **Transfer balance rules**: Deposits/transfers increase cash + fees, decrease digital + commission; withdrawals are opposite.
- `getTypeBalance(service)` returns consolidated `{cash_balance, digital_balance}` across all operations.

### 3. Forms & Validation (Manual, No Zod/RHF)
- State: `useState` for each field (no form libraries).
- Validate in `handleSubmit()` before calling storage; show errors via toast or inline state.
- Use `parseDecimalInput(value: string): number` for currency inputs; always round to 2 decimals before storing.
- Tax calculations: Use `getTaxConfigs()` to fetch rules, compute amounts in component, then `recordTaxedTransaction()` to persist.

### 4. Dates & Currency
- Dates: stored/displayed as ISO strings (`YYYY-MM-DD`); use `format(date, 'yyyy-MM-dd')` from `date-fns` when passing to storage.
- Currency: dual GDES/USD; `settings.exchange_rate` and `settings.currency_symbol` control display.
- Exchange rates: retrieved from `getSettings()` (stored in IndexedDB `settings` table).

---

## Project-Specific Conventions & Patterns

### File Organization
- **`src/pages/`**: Route-level components (Dashboard, Reports, Accounting, etc.); typically fetch data in `useEffect` and render multiple sub-components.
- **`src/components/`**: Reusable form/UI components; import storage functions as needed.
- **`src/components/ui/`**: Local copies of shadcn primitives (Button, Input, Dialog, etc.); import directly, never add `@shadcn/ui` to npm.
- **`src/components/layout/`**: AppLayout, AppHeader for consistent page shell.
- **`src/lib/storage.ts`**: Public API for ALL Dexie writes/reads; ~2000 lines, well-organized by domain (sales, transfers, operations, accounting).
- **`src/lib/database.ts`**: Schema definitions + migration logic; extend `TransferType` union when adding new transfer services.

### Import Conventions
- Always use path alias `@/lib/storage` (not relative imports); defined in `vite.config.ts`.
```markdown
# Copilot instructions — ScarWrite (concise)

Purpose: give AI coding agents the specific, actionable rules to edit, extend and debug ScarWrite.

- Big picture: offline-first React + Vite PWA using Dexie (IndexedDB) as the single source of truth. UI is local shadcn primitives + Tailwind. No server APIs.

- Single-source data rule: NEVER write to IndexedDB directly from components. Use `src/lib/storage.ts` (public helpers) which wraps `src/lib/database.ts` (Dexie schema & `executeFinancialTransaction`). Example: call `await addSale(sale)` from `handleSubmit()` in forms.

- Key places to look:
  - `src/lib/storage.ts` — all reads/writes and domain helpers
  - `src/lib/database.ts` — schema, `TransferType`, migration logic, `executeFinancialTransaction()`
  - `src/components/ui/` — local shadcn components (do NOT install `@shadcn/ui`)
  - `src/pages/` and `src/components/` — route-level loaders and controlled forms
  - `src/lib/pdf.ts` — PDF receipts/exports

- Conventions agents must follow:
  - Use path alias imports (e.g. `@/lib/storage`) as configured in `vite.config.ts`.
  - Forms use controlled `useState` fields and validate in `handleSubmit()`; do not introduce `react-hook-form`/Zod.
  - Do NOT use React Query mutations for writes — call storage helpers directly and then refetch via state callbacks.
  - To add a transfer service: extend `TransferType` in `database.ts`, add storage helpers, and update fee logic in `TransferForm.tsx`/`OperationForm.tsx`.

- Debug & build commands (Windows-friendly):
  - Install: `npm i` (or `bun install`)
  - Dev: `npm run dev` (or `start-dev.bat` / `start-dev.ps1`)
  - Build: `npm run build`; Preview: `npm run preview`

- Debug tips:
  - Inspect IndexedDB via Chrome DevTools → Application → IndexedDB → `ScarWriteDB`.
  - For balance issues check `operations` table `cash_after`/`digital_after` and `getLastOperationForService()`.
  - When changing schema, bump Dexie version and add migrations in `src/lib/database.ts`.

- Quick don’ts (project-specific):
  - Don’t import `@shadcn/ui` from npm; use `src/components/ui/`.
  - Don’t bypass `src/lib/storage.ts` to read/write Dexie.
  - Don’t add external network sync — the app is intentionally offline-first.

If anything above is unclear or you need examples for a specific change (route, new transfer type, migration), say which area and I will expand with exact file edits.
```
### Offline Testing & PWA
