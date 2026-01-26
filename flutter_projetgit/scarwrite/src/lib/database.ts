import Dexie, { Table } from 'dexie';

// Interfaces pour les données
export interface Product {
  id: string;
  name: string;
  unit_price: number;
  cost_price: number;
  quantity_available: number;
  is_active: boolean;
  is_service: boolean; // true pour services, false pour produits
  // Pourcentage de frais appliqué quand la vente est traitée via un service de paiement numérique
  service_fee_percentage?: number;
  created_at: string;
  updated_at: string;
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
}

export type TransferType =
  | 'zelle'
  | 'moncash'
  | 'natcash'
  | 'cam_transfert'
  | 'western_union'
  | 'moneygram'
  | 'autre';

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
  amount: number;
  usd_amount?: number;
  exchange_rate?: number;
  fees?: number;
  notes?: string;
  created_at: string;
}

export type OperationType = 'transfer' | 'deposit' | 'withdrawal';

export interface FinancialOperation {
  id: string;
  operation_number: number;
  operation_type: OperationType;
  service_name: TransferType; // Nom du service (Zelle, MonCash, etc.)
  custom_service_name?: string; // Pour "autre" type
  operation_date: string;

  // Identité
  sender_name?: string;
  sender_phone?: string;
  receiver_name?: string;
  receiver_phone?: string;

  // Devises
  amount_gdes: number; // Montant en GDES
  amount_usd?: number; // Montant en USD
  exchange_rate?: number;

  // Gains
  fees?: number; // Frais (cash ou numérique selon le type)
  commission?: number; // Commission

  // États des stocks (Avant/Après)
  cash_before: number;
  cash_after: number;
  digital_before: number;
  digital_after: number;

  notes?: string;
  created_at: string;
}

export interface Balance {
  id: string;
  type: 'cash' | 'digital';
  amount: number;
  updated_at: string;
}

// NEW: Service configuration for tracking if it's a proprietary service or brokerage
export interface ServiceConfig {
  id: string; // Will be the TransferType value (e.g., 'zelle', 'moncash', etc.)
  transfer_type: TransferType;
  custom_name?: string; // For 'autre' services
  is_own_service: boolean; // true = proprietary service (full montant to 706), false = brokerage (only fees to 706)
  default_fees_percent?: number; // Default fee percentage for this service
  default_commission_percent?: number; // Default commission percentage
  created_at: string;
  updated_at: string;
}

export interface TypeBalance {
  digital_balance: number;
  cash_balance: number;
}

export type CompanyType =
  | 'Entreprise Individuelle'
  | 'Societe Anonyme'
  | 'Societe par Actions Simplifiee'
  | 'Societe a Responsabilite Limitee'
  | 'Organisation Non Gouvernementale'
  | 'Fondation'
  | 'Organisation Internationale';

export interface CompanyProfile {
  id: string;
  company_type: CompanyType;
  company_name: string;
  fiscal_year_start: number;
  created_at: string;
  updated_at: string;
}

export interface ThirdParty {
  id: string;
  name: string;
  type: 'client' | 'supplier';
  balance: number; // positive = owed to us for clients, positive = we owe for suppliers
  created_at: string;
  updated_at?: string;
}

export interface Shareholder {
  id: string;
  encrypted_payload?: string; // encrypted { name, percentage }
  name_hash?: string;
  created_at: string;
  updated_at?: string;
}

export interface Settings {
  restaurant_name: string;
  currency_symbol: string;
  fiscal_year_start: number;
  language: string;
  company_type?: CompanyType;
  transfer_house_enabled?: boolean;
  exchange_rate?: number;
  default_transfer_fee?: number;
  initial_capital?: number;
}

export interface TaxConfig {
  id: string;
  name: string;
  percentage: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaxedTransaction {
  id: string;
  transaction_type: 'sale' | 'operation' | 'transfer';
  transaction_id: string;
  transaction_date: string;
  base_amount: number; // Montant HT
  tax_name: string;
  tax_percentage: number;
  tax_amount: number; // Montant de la taxe
  total_with_tax: number; // HT + Taxe
  created_at: string;
}

export interface Account {
  id: string;
  code: string; // e.g., 1010, 5120
  name: string; // e.g., Caisse, Banque
  type?: 'Actif' | 'Passif' | 'Charge' | 'Produit' | string;
  description?: string;
  created_at: string;
  updated_at?: string;
}

export interface AccountingEntry {
  id: string;
  journal_date: string;
  transaction_type: string; // sale, operation, transfer, etc.
  transaction_id?: string;
  account_code: string;
  account_name: string;
  debit: number;
  credit: number;
  description?: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  amount_owed: number;
  due_date: string;
  status: 'active' | 'settled';
  created_at: string;
  updated_at: string;
}

// Classe de base de données Dexie
export class AppDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  transfers!: Table<Transfer>;
  operations!: Table<FinancialOperation>;
  balances!: Table<Balance>;
  settings!: Table<Settings>;
  company_profile!: Table<CompanyProfile>;
  tax_config!: Table<TaxConfig>;
  taxed_transactions!: Table<TaxedTransaction>;
  accounts!: Table<Account>;
  accounting_entries!: Table<AccountingEntry>;
  tiers!: Table<ThirdParty>;
  shareholders!: Table<Shareholder>;
  suppliers!: Table<Supplier>;
  service_configs!: Table<ServiceConfig>;

  constructor() {
    super('ScarWriteDB');
    this.version(8).stores({
      products: 'id, name, is_active, created_at, updated_at',
      sales: 'id, product_id, sale_date, created_at',
      transfers: 'id, report_number, transfer_type, transfer_date, created_at',
      operations: 'id, operation_number, operation_type, service_name, operation_date, created_at, cash_before, cash_after, digital_before, digital_after',
      balances: 'id, type, updated_at',
      settings: '++id',
      company_profile: 'id, company_type, created_at, updated_at',
      tax_config: 'id, name, is_active, created_at, updated_at',
      taxed_transactions: 'id, transaction_type, transaction_id, transaction_date, tax_name, created_at',
      accounts: 'id, code, name, created_at, updated_at',
      accounting_entries: 'id, journal_date, transaction_type, transaction_id, account_code, created_at',
      tiers: 'id, name, type, created_at, updated_at',
      shareholders: 'id, name_hash, created_at, updated_at',
      suppliers: 'id, name, status, due_date, created_at, updated_at',
      service_configs: 'id, transfer_type, created_at, updated_at',
    });
  }
}

// Instance de la base de données
export const db = new AppDatabase();

// Fonctions utilitaires pour la migration depuis localStorage
export const migrateFromLocalStorage = async () => {
  try {
    // Migrer les produits
    const products = JSON.parse(localStorage.getItem('goutbouche_products') || '[]');
    if (products.length > 0) {
      await db.products.bulkAdd(products);
    }

    // Migrer les ventes
    const sales = JSON.parse(localStorage.getItem('goutbouche_sales') || '[]');
    if (sales.length > 0) {
      await db.sales.bulkAdd(sales);
    }

    // Migrer les transferts
    const transfers = JSON.parse(localStorage.getItem('reporta_transfers') || '[]');
    if (transfers.length > 0) {
      await db.transfers.bulkAdd(transfers);
    }

    // Migrer les opérations
    const operations = JSON.parse(localStorage.getItem('reporta_operations') || '[]');
    if (operations.length > 0) {
      await db.operations.bulkAdd(operations);
    }

    // Migrer les balances
    const balances = JSON.parse(localStorage.getItem('reporta_balances') || '[]');
    if (balances.length > 0) {
      await db.balances.bulkAdd(balances);
    }

    // Migrer les settings
    const settings = JSON.parse(localStorage.getItem('goutbouche_settings') || null);
    if (settings) {
      await db.settings.add(settings);
    }

    console.log('Migration depuis localStorage terminée');
  } catch (error) {
    console.error('Erreur lors de la migration:', error);
  }
};

// Initialiser la base de données et migrer si nécessaire
export const initDatabase = async () => {
  try {
    await db.open();
    // Vérifier si la migration est nécessaire
    const productCount = await db.products.count();
    if (productCount === 0) {
      await migrateFromLocalStorage();
    }
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
  }
};

// Fonction pour récupérer le dernier état d'un service
export const getLastOperationForService = async (serviceName: TransferType): Promise<FinancialOperation | null> => {
  try {
    const operations = await db.operations
      .where('service_name')
      .equals(serviceName)
      .reverse()
      .sortBy('created_at');

    return operations.length > 0 ? operations[0] : null;
  } catch (error) {
    console.error('Erreur récupération dernière opération:', error);
    return null;
  }
};

// Fonction pour exécuter une transaction avec calcul des soldes
export const executeFinancialTransaction = async (transactionData: {
  operation_type: OperationType;
  service_name: TransferType;
  custom_service_name?: string;
  operation_date: string;
  sender_name?: string;
  sender_phone?: string;
  receiver_name?: string;
  receiver_phone?: string;
  amount_gdes: number;
  amount_usd?: number;
  exchange_rate?: number;
  fees?: number;
  commission?: number;
  notes?: string;
}): Promise<FinancialOperation> => {
  try {
    // CORRECTION: Read from localStorage first (manual pre-registered balances take priority)
    // Then fallback to last operation in DB
    let cashBefore = 0;
    let digitalBefore = 0;
    
    try {
      const key = transactionData.custom_service_name 
        ? `${transactionData.service_name}_${transactionData.custom_service_name}`
        : transactionData.service_name;
      const stored = localStorage.getItem(`balance_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        cashBefore = parsed.cash_balance ?? 0;
        digitalBefore = parsed.digital_balance ?? 0;
        console.log(`[executeFinancialTransaction] Read from localStorage:`, { cashBefore, digitalBefore });
      }
    } catch (e) {
      console.log(`[executeFinancialTransaction] Could not read from localStorage, trying DB...`);
    }
    
    // If localStorage balance is still 0/0, try to get last operation from DB as fallback
    if (cashBefore === 0 && digitalBefore === 0) {
      const lastOperation = await getLastOperationForService(transactionData.service_name);
      if (lastOperation) {
        cashBefore = lastOperation.cash_after ?? 0;
        digitalBefore = lastOperation.digital_after ?? 0;
        console.log(`[executeFinancialTransaction] Read from last DB operation:`, { cashBefore, digitalBefore, lastOp: lastOperation.id });
      }
    }
    
    console.log(`[executeFinancialTransaction] START for ${transactionData.operation_type}/${transactionData.service_name}:`, 
      { cashBefore, digitalBefore });

    // 2. Calculer les "After" selon les règles
    let cashAfter = cashBefore;
    let digitalAfter = digitalBefore;

    const { operation_type, amount_gdes, fees = 0, commission = 0 } = transactionData;

    switch (operation_type) {
      case 'deposit':
        // DÉPÔT : 
        // Cash = Cash Before + Montant + Frais (vous encaissez l'argent physique + les frais)
        // Digital = Digital Before - Montant + Commission (vous envoyez le montant, gagnez la commission)
        cashAfter = cashBefore + amount_gdes + fees;
        digitalAfter = digitalBefore - amount_gdes + commission;
        break;

      case 'withdrawal':
        // RETRAIT : 
        // Cash = Cash Before - Montant (vous donnez l'argent au client)
        // Digital = Digital Before + Montant + Frais + Commission (vous recevez tout dans votre compte)
        cashAfter = cashBefore - amount_gdes;
        digitalAfter = digitalBefore + amount_gdes + fees + commission;
        break;

      case 'transfer':
        // TRANSFERT : Même logique que le DÉPÔT
        // Cash = Cash Before + Montant + Frais
        // Digital = Digital Before - Montant + Commission
        cashAfter = cashBefore + amount_gdes + fees;
        digitalAfter = digitalBefore - amount_gdes + commission;
        break;
    }
    
    console.log(`[executeFinancialTransaction] Calculated After:`, { 
      operation: operation_type, 
      amount: amount_gdes, 
      fees, 
      commission,
      cashAfter, 
      digitalAfter 
    });

    // 3. Créer la nouvelle opération
    const operationNumber = await getNextOperationNumber();

    const newOperation: FinancialOperation = {
      id: crypto.randomUUID(),
      operation_number: operationNumber,
      operation_type: transactionData.operation_type,
      service_name: transactionData.service_name,
      custom_service_name: transactionData.custom_service_name,
      operation_date: transactionData.operation_date,
      sender_name: transactionData.sender_name,
      sender_phone: transactionData.sender_phone,
      receiver_name: transactionData.receiver_name,
      receiver_phone: transactionData.receiver_phone,
      amount_gdes: transactionData.amount_gdes,
      amount_usd: transactionData.amount_usd,
      exchange_rate: transactionData.exchange_rate,
      fees: transactionData.fees,
      commission: transactionData.commission,
      cash_before: cashBefore,
      cash_after: cashAfter,
      digital_before: digitalBefore,
      digital_after: digitalAfter,
      notes: transactionData.notes,
      created_at: new Date().toISOString(),
    };

    // 4. Insérer dans la base de données
    await db.operations.add(newOperation);
    
    console.log(`[executeFinancialTransaction] CREATED operation:`, { 
      id: newOperation.id, 
      cashBefore, cashAfter, 
      digitalBefore, digitalAfter 
    });

    return newOperation;

  } catch (error) {
    console.error('Erreur exécution transaction:', error);
    throw error;
  }
};

// Fonction utilitaire pour obtenir le prochain numéro d'opération
const getNextOperationNumber = async (): Promise<number> => {
  try {
    const operations = await db.operations.toArray();
    const maxNumber = operations.length > 0 ? Math.max(...operations.map(op => op.operation_number)) : 0;
    return maxNumber + 1;
  } catch (error) {
    console.error('Erreur récupération numéro opération:', error);
    return 1;
  }
};