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
- Icons from `@/lib/lucide-react` (re-export; Lucide dependency is bundled).
- UI components from `@/components/ui/button`, etc. (local copies).

### Transfer Services (TransferType Union)
Located in `src/lib/database.ts`:
```typescript
export type TransferType = 'zelle' | 'moncash' | 'natcash' | 'cam_transfert' | 'western_union' | 'moneygram' | 'autre';
```
To add a new service: extend union, add to storage helper lookups, optionally set fee rules in `OperationForm.tsx` and `TransferForm.tsx`.

### Settings & Configuration
- **PIN**: Stored in `localStorage` (via `getPIN()`, `setPIN()`, `verifyPIN()`); not in Dexie.
- **Company profile**: Dexie table `companyProfiles` (multi-entity support).
- **Tax configs**: Dexie table `taxConfigs` (retrieve via `getTaxConfigs()`).
- **Exchange rates**: In `settings` table, accessed via `getSettings().exchange_rate`.
- **PDF options**: Form-level state; `generateClientReceipt()` and `generatePaymentReceipt()` in `src/lib/pdf.ts`.

### Error Handling & Logging
- Use `useToast()` from `@/hooks/use-toast` for user feedback (errors, success messages).
- Console.error for diagnostic logs (errors in async operations, Dexie failures).
- No Sentry or external logging; errors are local diagnostics only.
- Validation errors shown as toast before storage calls; network N/A (offline-first).

### Accounting Integration (Caméléon System)
- Chart of accounts seeded via `seedCammeleonChart()` (~100 predefined accounts for restaurants/transfers).
- Each transaction can create `AccountingEntry` records via `createAccountingTransaction()`.
- Account linking is optional for sales/transfers; tax tracking is mandatory.
- Account codes follow French chart format (701 = Sales, 641 = Salaries, 5311 = Main Cash, etc.).

---

## Dev & Debugging Commands (Windows-friendly)

### Setup & Run
- Install: `npm i` (or `bun install` if using Bun; `bun.lockb` present)
- Dev server: `npm run dev` (or run `start-dev.bat` / `start-dev.ps1` on Windows) — listens on `http://localhost:8080`
- Build: `npm run build`; Preview: `npm run preview`
- Lint: `npm run lint` (ESLint with TypeScript plugin; strict rules enforce `no-explicit-any`)

### Offline Testing & PWA
- Service worker auto-registers via `vite-plugin-pwa`.
- Dev server auto-updates service worker; to clear cache manually: DevTools → Application → Cache Storage → delete "ScarWrite" cache.
- Offline: Disable network in DevTools or use "Offline" mode in Network tab; app continues to function.
- All data persists in IndexedDB locally; sync to cloud is NOT implemented (intentionally offline-first).

### Database Inspection
- Chrome DevTools → Application → IndexedDB → `ScarWriteDB`.
- Explore tables: `operations`, `sales`, `transfers`, `balances`, `products`, `settings`, `accounts`, `accountingEntries`, etc.
- Query by opening DevTools console and using Dexie directly:
  ```javascript
  const { db } = await import('./src/lib/database');
  db.sales.where('sale_date').equals('2025-01-25').toArray().then(sales => console.log(sales));
  ```

### Common Debugging Tasks
- **Balance issues**: Check `getLastOperationForService()` output in console, verify `cash_after` / `digital_after` in `operations` table.
- **Form not submitting**: Check `handleSubmit()` for validation errors, trace through toast messages.
- **Missing data**: Verify Dexie version hasn't changed without migration; check schema in `src/lib/database.ts`.
- **Styling issues**: Ensure Tailwind classes are in content paths (`src/**/*.{ts,tsx}`); rebuild CSS if needed (`npm run build`).

---

## Data Loading Patterns in Pages & Components

### Page-Level Data Loading (useEffect + useState)
Pages fetch data on mount and expose state to sub-components. Example (Dashboard):
```tsx
useEffect(() => {
  const loadData = async () => {
    const balance = getTypeBalance('zelle');
    const revenue = await getDailyRevenue(todayStr);
    setCashBalance(balance.cash_balance);
    setRevenue(revenue);
  };
  loadData().catch(err => console.error('Load error:', err));
}, []);
```

### Form Components (Controlled Inputs)
Forms maintain local state and call storage functions in handleSubmit:
```tsx
const [quantity, setQuantity] = useState(1);
const handleSubmit = async () => {
  if (!selectedProduct) { toast({ description: 'Select product' }); return; }
  await addSale({ id: uuid(), product_id: selectedProduct, quantity, ... });
  onSuccess(); // Parent refetches
};
```

### Avoid: React Query with Mutations
DO NOT use `useMutation()` for data writes. Instead call storage functions directly in event handlers and refetch via setState/callback.
- `useQuery()` is acceptable for expensive reads (if needed), but most data is fetched directly via synchronous storage helpers.
- TanStack React Query is installed but NOT used for mutations to keep offline-first logic simple.

## Migrations & Schema Changes
- If you change `src/lib/database.ts` (schema/interfaces), bump Dexie version and add migration logic there. Also update `src/lib/storage.ts` wrappers.
- Dexie migrations: `db.version(3).stores({ ... })` creates versioned schema; old data persists via automatic upgrade.
- Always test migrations locally by clearing IndexedDB and reloading.

---

## Debugging Balance Issues (short checklist)
- Check `getLastOperationForService()` for last-state.
- Inspect `executeFinancialTransaction()` in `src/lib/database.ts` for fee/commission logic.
- Verify final `cash_after` / `digital_after` stored in `operations` table in DevTools.

---

## Quick Don’ts
- Do not add `@shadcn/ui` to dependencies — primitives are local.
- Do not write directly to IndexedDB outside `src/lib/storage.ts`.
- Do not add external APIs — fully offline-first.
- Do not use `useMutation()` from React Query for writes; call storage functions directly.
- Do not import from `lucide-react` directly; use `@/lib/lucide-react` (re-export).
- Do not add `react-hook-form`, `Zod`, or other form libraries; use manual useState validation.

## Where to Extend Functionality
- Add new UI form in `src/components/` and call `src/lib/storage.ts` for persistence.
- Add new types or tables in `src/lib/database.ts` + Dexie migration + expose helper(s) in `src/lib/storage.ts`.
- Add new routes in `src/App.tsx` and create corresponding page in `src/pages/`.
- New Transfer Service: extend `TransferType` union in `database.ts`, add fee logic in `TransferForm.tsx`, and storage helpers in `storage.ts`.
- PDF exports: modify `src/lib/pdf.ts` or create new export function; integrate into form component's report options.
