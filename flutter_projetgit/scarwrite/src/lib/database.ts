import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface Product {
  id: string;
  name: string;
  unit_price: number;
  cost_price: number;
  quantity_available: number;
  is_active: boolean;
  is_service: boolean;
  service_fee_percentage?: number; 
  is_asset?: boolean;
  purchase_price?: number;
  accumulated_amortization?: number;
  last_amortization_date?: string;
  purchase_date?: string;
  life_months?: number;
  created_at: string;
  updated_at: string;
  entity_type?: string;
}

export interface Sale {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total: number;
  sale_date: string;
  is_credit: boolean;
  client_name?: string;
  paid_amount?: number;
  created_at: string;
  entity_type?: string;
}

export type TransferType = 'zelle' | 'moncash' | 'natcash' | 'cam_transfert' | 'western_union' | 'moneygram' | 'autre';
export type OperationType = 'transfer' | 'deposit' | 'withdrawal';

export interface Transfer {
  id: string;
  report_number: number;
  transfer_type: TransferType;
  custom_type_name?: string;
  transfer_date: string;
  sender_name?: string;
  sender_phone?: string;
  receiver_name?: string;
  receiver_phone?: string;
  amount_usd?: number;
  amount_gourdes: number;
  exchange_rate?: number;
  transfer_fee: number;
  commission?: number;
  created_at: string;
  entity_type?: string;
}

export interface FinancialOperation {
  id: string;
  operation_number: number;
  operation_type: OperationType;
  service_name: TransferType;
  custom_service_name?: string;
  operation_date: string;
  sender_name?: string;
  sender_phone?: string; // Ajouté pour MonCash/NatCash
  receiver_name?: string;
  receiver_phone?: string; // Ajouté pour MonCash/NatCash
  // historic field name may be `amount_gdes` in older records — prefer `amount_gourdes`
  amount_gdes?: number;
  amount_gourdes: number;
  amount_usd?: number;
  exchange_rate?: number;
  fees?: number;
  commission?: number;
  cash_before: number;
  cash_after: number;
  digital_before: number;
  digital_after: number;
  created_at: string;
  entity_type?: string;
}

// Additional shared types used across storage and UI
export type CompanyType =
  | 'Entreprise Individuelle'
  | 'Societe Anonyme'
  | 'Societe a Responsabilite Limitee'
  | 'Organisation Non Gouvernementale'
  | 'Fondation'
  | 'Organisation Internationale'
  | string;

export interface CompanyProfile {
  id: string;
  company_type: CompanyType;
  company_name: string;
  fiscal_year_start: number;
  created_at: string;
  updated_at: string;
  vat_number?: string;
  address?: string;
}

export interface Settings {
  restaurant_name?: string;
  currency_symbol?: string;
  fiscal_year_start?: number;
  language?: string;
  income_tax_rate?: number;
  transfer_house_enabled?: boolean;
  exchange_rate?: number;
  default_transfer_fee?: number;
  initial_capital?: number;
  company_type?: CompanyType;
}

export interface TaxConfig {
  id: string;
  name: string;
  rate?: number;
  percentage?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface TypeBalance {
  cash_balance: number;
  digital_balance: number;
  last_updated?: string;
}

export interface AccountingEntry {
  id: string;
  journal_date: string;
  transaction_type?: string;
  transaction_id?: string;
  account_code?: string;
  account_name?: string;
  debit?: number;
  credit?: number;
  description?: string;
  created_at?: string;
}

export interface ThirdParty {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
  balance?: number;
}

export interface ServiceConfig {
  id: string;
  transfer_type: string;
  name?: string;
  custom_name?: string;
  is_own_service?: boolean;
  settings?: Record<string, unknown>;
  created_at?: string;
}

export interface Shareholder {
  id: string;
  name: string;
  percentage: number;
  created_at?: string;
  updated_at?: string;
}

export interface Balance {
  id: string;
  type: 'cash' | 'digital';
  amount: number;
  updated_at: string;
}

export interface TaxedTransaction {
  id: string;
  transaction_type: 'sale' | 'operation' | 'transfer';
  transaction_id?: string;
  transaction_date: string;
  base_amount: number;
  tax_name: string;
  tax_percentage: number;
  tax_amount: number;
  total_with_tax: number;
  created_at: string;
}

// --- BASE DE DONNÉES ---
export class AppDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  transfers!: Table<Transfer>;
  operations!: Table<FinancialOperation>;
  taxed_transactions!: Table<TaxedTransaction>;
  balances!: Table<Balance>;
  settings!: Table<any>;
  company_profile!: Table<any>;
  tax_config!: Table<any>;
  accounts!: Table<any>;
  accounting_entries!: Table<any>;
  tiers!: Table<any>;
  shareholders!: Table<any>;
  suppliers!: Table<any>;
  service_configs!: Table<any>;

  constructor() {
    super('ScarWriteDB');
    this.version(11).stores({ // Version incrémentée à 11 (force schema update when needed)
      products: 'id, name, is_active, created_at, updated_at, entity_type',
      sales: 'id, product_id, sale_date, created_at, entity_type',
      transfers: 'id, report_number, transfer_type, transfer_date, created_at, entity_type',
      operations: 'id, operation_number, operation_type, service_name, operation_date, created_at, entity_type',
      taxed_transactions: 'id, transaction_date, transaction_type, transaction_id, tax_name, created_at',
      balances: 'id, type, updated_at',
      settings: '++id',
      company_profile: 'id, created_at, updated_at',
      tax_config: 'id, name, is_active, created_at, updated_at',
      accounts: 'id, code, name',
      accounting_entries: 'id, journal_date, transaction_type, transaction_id, account_code',
      tiers: 'id, name, type, entity_type',
      shareholders: 'id, created_at',
      suppliers: 'id, name, status, entity_type',
      service_configs: 'id, transfer_type',
    });
  }
}

export const db = new AppDatabase();

// --- FONCTIONS UTILITAIRES ---

export const initDatabase = async () => {
  try {
    if (!db.isOpen()) {
      await db.open();
    }
  } catch (error) {
    console.error("Erreur initialisation DB:", error);
  }
};

// Ensure minimal seeded data (balances) exists for transfer services
export const seedDefaultBalances = async () => {
  try {
    if (!db.isOpen()) await db.open();
    const count = await db.balances.count();
    if (count === 0) {
      const now = new Date().toISOString();
      const defaults = [
        { id: 'balance_cash', type: 'cash', amount: 0, updated_at: now },
        { id: 'balance_zelle', type: 'digital', amount: 0, updated_at: now },
        { id: 'balance_moncash', type: 'digital', amount: 0, updated_at: now },
        { id: 'balance_natcash', type: 'digital', amount: 0, updated_at: now },
        { id: 'balance_western_union', type: 'digital', amount: 0, updated_at: now },
        { id: 'balance_moneygram', type: 'digital', amount: 0, updated_at: now },
        { id: 'balance_autre', type: 'digital', amount: 0, updated_at: now },
      ];
      await db.balances.bulkAdd(defaults as any);
      console.log('Balances initialisées par défaut.');
    }
  } catch (err) {
    console.warn('seedDefaultBalances failed:', err);
  }
};

// Run seed after DB open
seedDefaultBalances().catch(() => {});

// --- FONCTIONS POUR TRANSFERTFORM ---

export const getNextReportNumber = async (): Promise<number> => {
  const count = await db.transfers.count();
  return count + 1;
};

export const getCurrentBalancesForService = async (serviceName: TransferType, customName?: string) => {
  const ops = await db.operations
    .where('service_name')
    .equals(serviceName)
    .reverse()
    .sortBy('created_at');

  const relevantOp = customName 
    ? ops.find(op => op.custom_service_name === customName)
    : ops[0];

  if (relevantOp) {
    return { cash: relevantOp.cash_after, digital: relevantOp.digital_after };
  }
  return { cash: 0, digital: 0 };
};

export const addTransfer = async (data: any) => {
  return await db.transfers.add({
    id: crypto.randomUUID(),
    ...data,
    created_at: new Date().toISOString()
  });
};

// Convenience helper: save a transfer record AND execute the corresponding
// financial transaction that updates `operations` and `balances`.
export const addTransferWithTransaction = async (data: any, transactionOverride?: any) => {
  try {
    // 1) persist the transfer (report/receipt record)
    const transferId = await addTransfer(data);

    // 2) build transaction payload for executeFinancialTransaction
    const transactionPayload: any = {
      operation_type: transactionOverride?.operation_type || (data.operation_type || 'transfer'),
      service_name: transactionOverride?.service_name || data.transfer_type,
      custom_service_name: transactionOverride?.custom_service_name || data.custom_type_name,
      amount_gourdes: Number(transactionOverride?.amount_gourdes ?? data.amount_gourdes ?? data.amount_gdes ?? 0),
      fees: Number(transactionOverride?.fees ?? data.transfer_fee ?? data.fees ?? 0),
      commission: Number(transactionOverride?.commission ?? data.commission ?? 0),
      sender_name: data.sender_name,
      sender_phone: data.sender_phone,
      receiver_name: data.receiver_name,
      receiver_phone: data.receiver_phone,
      operation_date: data.transfer_date || new Date().toISOString(),
    };

    // 3) execute the financial side (this updates balances and creates an operation)
    const operation = await executeFinancialTransaction(transactionPayload);

    return { transferId, operation };
  } catch (err) {
    console.error('addTransferWithTransaction failed:', err);
    throw err;
  }
};

export const updateTransfer = async (id: string, data: Partial<Transfer>) => {
  return await db.transfers.update(id, data);
};

export const parseDecimalInput = (val: string | number): number => {
  if (!val) return 0;
  const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(num) ? 0 : num;
};

// --- LOGIQUE FINANCIÈRE ---

const getNextOperationNumber = async (): Promise<number> => {
  const count = await db.operations.count();
  return count + 1;
};

export const getLastOperationForService = async (serviceName: TransferType): Promise<FinancialOperation | null> => {
  const ops = await db.operations.where('service_name').equals(serviceName).reverse().sortBy('created_at');
  return ops.length > 0 ? ops[0] : null;
};

export const executeFinancialTransaction = async (transactionData: any): Promise<FinancialOperation> => {
  try {
    const balances = await getCurrentBalancesForService(transactionData.service_name, transactionData.custom_service_name);
    let cashBefore = balances.cash;
    let digitalBefore = balances.digital;

    let cashAfter = cashBefore;
    let digitalAfter = digitalBefore;
    
    const amount = Number(transactionData.amount_gdes || transactionData.amount_gourdes || 0);
    const fees = Number(transactionData.fees || 0);
    const commission = Number(transactionData.commission || 0);

    if (transactionData.operation_type === 'deposit' || transactionData.operation_type === 'transfer') {
      cashAfter = cashBefore + amount + fees + commission;
      digitalAfter = digitalBefore - amount + commission;
    } else if (transactionData.operation_type === 'withdrawal') {
      cashAfter = cashBefore - amount;
      digitalAfter = digitalBefore + amount + fees + commission;
    }

    const nextNum = await getNextOperationNumber();

    const newOperation: FinancialOperation = {
      id: crypto.randomUUID(),
      operation_number: nextNum,
      ...transactionData,
      amount_gdes: amount,
      amount_gourdes: amount,
      fees: fees,
      commission: commission,
      cash_before: cashBefore,
      cash_after: cashAfter,
      digital_before: digitalBefore,
      digital_after: digitalAfter,
      created_at: new Date().toISOString(),
    };

    // Persist per-account balances so UI showing global cash/digital balances updates immediately
    try {
      // cash stored under id 'balance_cash'
      await db.balances.put({ id: 'balance_cash', type: 'cash', amount: cashAfter, updated_at: new Date().toISOString() } as any);

      // map service to a digital balance id
      const digitalKeyMap: Record<string, string> = {
        moncash: 'balance_moncash',
        natcash: 'balance_natcash',
        zelle: 'balance_zelle',
        western_union: 'balance_western_union',
        moneygram: 'balance_moneygram',
        cam_transfert: 'balance_autre',
        autre: 'balance_autre'
      } as any;
      const digitalId = digitalKeyMap[transactionData.service_name] || 'balance_autre';
      await db.balances.put({ id: digitalId, type: 'digital', amount: digitalAfter, updated_at: new Date().toISOString() } as any);
    } catch (balanceErr) {
      console.warn('Could not update balances table:', balanceErr);
    }

    await db.operations.add(newOperation);
    return newOperation;
  } catch (error) {
    console.error('Erreur transaction:', error);
    throw error;
  }
};

// Fonction comptable (statique pour éviter les erreurs de compilation)
export const createAccountingTransaction = async (entries: any[]) => {
  for (const entry of entries) {
    await db.accounting_entries.add({
      id: crypto.randomUUID(),
      ...entry,
      created_at: new Date().toISOString()
    });
  }
};