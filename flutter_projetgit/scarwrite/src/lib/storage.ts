import { db, initDatabase, executeFinancialTransaction, getLastOperationForService } from './database';
import type { Product, Sale, Transfer, TransferType, FinancialOperation, OperationType, Balance, TypeBalance, Settings, CompanyType, CompanyProfile, TaxConfig, TaxedTransaction, Account, AccountingEntry, ThirdParty, ServiceConfig } from './database';
import CryptoJS from 'crypto-js';

// Seed a comprehensive Caméléon chart (pre-enregistre ~100 comptes utiles pour boucherie / transfert)
export const seedCammeleonChart = async (): Promise<void> => {
  try {
    const count = await db.accounts.count();
    if (count > 0) return; // don't overwrite existing chart

    const accountsToSeed: Array<{ code: string; name: string; type?: string; description?: string }> = [
      { code: '101', name: 'Capital social', type: 'Passif' },
      { code: '106', name: 'Réserves', type: 'Passif' },
      { code: '121', name: 'Résultat net de l\'exercice', type: 'Passif' },
      { code: '164', name: 'Emprunts bancaires', type: 'Passif' },
      { code: '211', name: 'Terrains / Emplacements', type: 'Actif' },
      { code: '213', name: 'Bâtiments / Aménagements Boutique', type: 'Actif' },
      { code: '215', name: 'Matériel de boucherie', type: 'Actif' },
      { code: '218', name: 'Matériel informatique', type: 'Actif' },
      { code: '219', name: 'Matériel de transport', type: 'Actif' },
      { code: '311', name: 'Stock de Viandes', type: 'Actif' },
      { code: '312', name: 'Stock de produits finis', type: 'Actif' },
      { code: '313', name: 'Stock de boissons / Épicerie', type: 'Actif' },
      { code: '321', name: 'Emballages', type: 'Actif' },
      { code: '401', name: 'Fournisseurs', type: 'Passif' },
      { code: '4010', name: 'Fournisseurs de viande', type: 'Passif' },
      { code: '402', name: 'Fournisseurs de matériel', type: 'Passif' },
      { code: '403', name: 'Fournisseurs de services', type: 'Passif' },
      { code: '4110', name: 'Clients', type: 'Actif' },
      { code: '4111', name: 'Clients Fidèles', type: 'Actif' },
      { code: '4112', name: 'Clients Maison de Transfert', type: 'Actif' },
      { code: '421', name: 'Personnel (salaires à payer)', type: 'Passif' },
      { code: '431', name: 'Sécurité Sociale / ONA', type: 'Passif' },
      { code: '444', name: 'État : Impôts sur les bénéfices', type: 'Passif' },
      { code: '445', name: 'État : Taxes collectées (TCA)', type: 'Passif' },
      { code: '446', name: 'État : Taxes déductibles', type: 'Actif' },
      { code: '467', name: 'Associés / Partage des parts', type: 'Passif' },
      { code: '521', name: 'Banque (Compte principal)', type: 'Actif' },
      { code: '5311', name: 'Caisse Centrale', type: 'Actif' },
      { code: '517', name: 'Argent Numérique (MonCash/NatCash)', type: 'Actif' },
      { code: '53111', name: 'Caisse MonCash', type: 'Actif' },
      { code: '53112', name: 'Caisse NatCash', type: 'Actif' },
      { code: '5313', name: 'Caisse Transfert International', type: 'Actif' },
      { code: '5314', name: 'Coffre-fort', type: 'Actif' },
      { code: '585', name: 'Virements internes', type: 'Actif' },
      { code: '601', name: 'Achats de viandes', type: 'Charge' },
      { code: '602', name: 'Achats de recharges', type: 'Charge' },
      { code: '604', name: 'Achats d\'emballages', type: 'Charge' },
      { code: '605', name: 'Électricité', type: 'Charge' },
      { code: '606', name: 'Eau et Glace', type: 'Charge' },
      { code: '611', name: 'Loyer de la boutique', type: 'Charge' },
      { code: '613', name: 'Entretien et réparations', type: 'Charge' },
      { code: '615', name: 'Primes d\'assurance', type: 'Charge' },
      { code: '616', name: 'Transports et déplacements', type: 'Charge' },
      { code: '618', name: 'Fournitures de bureau', type: 'Charge' },
      { code: '621', name: 'Publicité', type: 'Charge' },
      { code: '625', name: 'Frais de télécommunication', type: 'Charge' },
      { code: '627', name: 'Services bancaires', type: 'Charge' },
      { code: '628', name: 'Frais de transfert opérateurs', type: 'Charge' },
      { code: '641', name: 'Salaires des bouchers', type: 'Charge' },
      { code: '642', name: 'Salaires administratifs', type: 'Charge' },
      { code: '645', name: 'Charges sociales', type: 'Charge' },
      { code: '661', name: 'Impôts et taxes', type: 'Charge' },
      { code: '701', name: 'Ventes de viandes (Détail)', type: 'Produit' },
      { code: '7011', name: 'Ventes de viandes (Gros)', type: 'Produit' },
      { code: '702', name: 'Ventes de boissons / Divers', type: 'Produit' },
      { code: '706', name: 'Prestations de services', type: 'Produit' },
      { code: '7061', name: 'Commissions Transferts Envois', type: 'Produit' },
      { code: '7062', name: 'Commissions Transferts Retraits', type: 'Produit' },
      { code: '7063', name: 'Commissions Envois NatCash', type: 'Produit' },
      { code: '7064', name: 'Commissions Retraits NatCash', type: 'Produit' },
      { code: '7065', name: 'Commissions Transferts Internationaux', type: 'Produit' },
      { code: '707', name: 'Revenus de change', type: 'Produit' },
      { code: '708', name: 'Autres produits accessoires', type: 'Produit' },
      { code: '771', name: 'Revenus exceptionnels', type: 'Produit' },
      { code: '4118', name: 'Clients en attente de versement', type: 'Actif' },
    ];

    const now = new Date().toISOString();
    const toAdd = accountsToSeed.map(a => ({ id: crypto.randomUUID(), code: a.code, name: a.name, type: a.type || '', description: a.description || '', created_at: now, updated_at: now }));
    await db.accounts.bulkAdd(toAdd);
    try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ledger-updated')); window.dispatchEvent(new CustomEvent('financials-updated')); } } catch (e) { console.debug('dispatch events failed', e); }
  } catch (err) {
    console.error('Erreur seed Caméléon chart:', err);
  }
};

// Initialiser la base de données au chargement du module
initDatabase();

// Seed default chart of accounts based on common conventions (Caméléon)
const ensureDefaultChart = async () => {
  try {
    const existing = await db.accounts.toArray();
    const existsCode = (code: string) => existing.some(a => a.code === code);

    const defaults = [
      { code: '5311', name: 'Caisse Centrale' },
      { code: '517', name: 'Argent Numérique' },
      { code: '5120', name: 'Banque' },
      { code: '4110', name: 'Clients' },
      { code: '4010', name: 'Fournisseurs' },
      { code: '701', name: 'Ventes de marchandises' },
      { code: '706', name: 'Prestations de services' },
      { code: '6010', name: 'Dépenses courantes' },
      { code: '4457', name: 'TVA à payer' },
      { code: '7010', name: 'Ventes' },
    ];

    for (const acc of defaults) {
      if (!existsCode(acc.code)) {
        await db.accounts.add({ id: crypto.randomUUID(), code: acc.code, name: acc.name, created_at: new Date().toISOString() });
      }
    }
  } catch (err) {
    console.error('Erreur seed chart accounts:', err);
  }
};

// run seeding asynchronously
ensureDefaultChart().catch(() => {});
// seed the larger Caméléon chart if empty
seedCammeleonChart().catch((e) => { console.error('seedCammeleonChart failed', e); });

// Local stored types for records that contain encrypted payloads
type StoredThirdParty = ThirdParty & { encrypted_payload?: string; name_hash?: string };
type StoredShareholder = import('./database').Shareholder & { encrypted_payload?: string; name_hash?: string };
type StoredAccountingEntry = AccountingEntry & { encrypted_payload?: string };

// Fonctions utilitaires
const STORAGE_KEYS = {
  PIN: 'goutbouche_pin',
};

// Encryption helpers (AES-256 via crypto-js)
const DEVICE_ID_KEY = 'scarwrite_device_id';

const getDeviceId = (): string => {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'unknown-device';
  }
};

const getStorageSecret = (): string => {
  // Prefer Vite env variable; fallback to empty string
  try {
    const meta = import.meta as unknown as { env?: Record<string, string> };
    const s = meta.env?.VITE_STORAGE_SECRET;
    return s || '';
  } catch (e) {
    console.error('getStorageSecret error', e);
    return '';
  }
};

const deriveKey = (): string => {
  const secret = getStorageSecret();
  const device = getDeviceId();
  return CryptoJS.SHA256(`${secret}::${device}`).toString();
};

const encryptObject = (obj: unknown): string => {
  const key = deriveKey();
  return CryptoJS.AES.encrypt(JSON.stringify(obj), key).toString();
};

const decryptObject = (cipher: string): unknown | null => {
  try {
    const key = deriveKey();
    const bytes = CryptoJS.AES.decrypt(cipher, key);
    const text = bytes.toString(CryptoJS.enc.Utf8);
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.error('decryptObject error', err);
    return null;
  }
};

export { Product, Sale, Transfer, TransferType, FinancialOperation, OperationType, Balance, TypeBalance, CompanyType, CompanyProfile, TaxConfig, TaxedTransaction };

// PIN functions (toujours localStorage pour la sécurité)
export const getPIN = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.PIN);
};

export const setPIN = (pin: string): void => {
  localStorage.setItem(STORAGE_KEYS.PIN, pin);
};

export const verifyPIN = (pin: string): boolean => {
  return getPIN() === pin;
};

export const clearPIN = (): void => {
  localStorage.removeItem(STORAGE_KEYS.PIN);
};

// Settings
export const getSettings = (): Settings => {
  const defaults: Settings = {
    restaurant_name: 'Ma Boucherie',
    currency_symbol: 'G',
    fiscal_year_start: 10,
    language: 'fr',
    income_tax_rate: 30,
  };

  try {
    const settings = localStorage.getItem('goutbouche_settings');
    const base = settings ? { ...defaults, ...JSON.parse(settings) } : defaults;
    return {
      ...base,
      transfer_house_enabled: base.transfer_house_enabled !== undefined ? base.transfer_house_enabled : true,
      exchange_rate: base.exchange_rate || 133,
      default_transfer_fee: base.default_transfer_fee || 0,
      initial_capital: base.initial_capital || 0,
    };
  } catch {
    return defaults;
  }
};

export const saveSettings = async (settings: Partial<Settings>): Promise<void> => {
  const current = getSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('goutbouche_settings', JSON.stringify(updated));

  // Sauvegarder aussi dans IndexedDB pour persistance
  try {
    await db.settings.clear();
    await db.settings.add(updated);
  } catch (error) {
    console.error('Erreur sauvegarde settings:', error);
  }
};

// Active entity (multi-tenancy): store active entity in localStorage
export const getActiveEntity = (): string => {
  try {
    const e = localStorage.getItem('scarwrite_active_entity');
    if (e) return e;
    const profile = getSettings();
    return profile.company_type || 'Entreprise Individuelle';
  } catch (err) {
    return 'Entreprise Individuelle';
  }
};

export const setActiveEntity = (entity: string): void => {
  try {
    localStorage.setItem('scarwrite_active_entity', entity);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('entity-changed'));
        window.dispatchEvent(new CustomEvent('ledger-updated'));
        window.dispatchEvent(new CustomEvent('financials-updated'));
      }
    } catch (e) { }
  } catch (err) {
    console.error('Erreur setActiveEntity:', err);
  }
};

// Company Profile Functions
export const getCompanyProfile = async (): Promise<CompanyProfile | null> => {
  try {
    const profile = await db.company_profile.toArray();
    return profile.length > 0 ? profile[0] : null;
  } catch (error) {
    console.error('Erreur récupération profil entreprise:', error);
    return null;
  }
};

export const saveCompanyProfile = async (profile: Omit<CompanyProfile, 'id' | 'created_at' | 'updated_at'>): Promise<CompanyProfile> => {
  try {
    const existing = await getCompanyProfile();
    const now = new Date().toISOString();

    if (existing) {
      const updated: CompanyProfile = {
        ...existing,
        ...profile,
        updated_at: now,
      };
      await db.company_profile.put(updated);
      return updated;
    } else {
      const newProfile: CompanyProfile = {
        id: crypto.randomUUID(),
        ...profile,
        created_at: now,
        updated_at: now,
      };
      await db.company_profile.add(newProfile);
      return newProfile;
    }
  } catch (error) {
    console.error('Erreur sauvegarde profil entreprise:', error);
    throw error;
  }
};

export const getCompanyType = async (): Promise<CompanyType | null> => {
  const profile = await getCompanyProfile();
  return profile ? profile.company_type : null;
};

export const isSocialEntity = async (): Promise<boolean> => {
  const companyType = await getCompanyType();
  return ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType || '');
};

// Products
export const getProducts = async (): Promise<Product[]> => {
  try {
    const active = getActiveEntity();
    // Only return products matching the active entity
    return await db.products.filter(p => (p as any).entity_type === active).toArray();
  } catch (error) {
    console.error('Erreur récupération produits:', error);
    return [];
  }
};

export const getActiveProducts = async (): Promise<Product[]> => {
  try {
    return await db.products.filter(product => product.is_active === true).toArray();
  } catch (error) {
    console.error('Erreur récupération produits actifs:', error);
    return [];
  }
};

export const addProduct = async (name: string, unitPrice: number, costPrice: number = 0, quantityAvailable: number = 0, service_fee_percentage: number = 0): Promise<void> => {
  const now = new Date().toISOString();
  const product: Product = {
    id: crypto.randomUUID(),
    name,
    unit_price: unitPrice,
    cost_price: costPrice,
    quantity_available: quantityAvailable,
    is_active: true,
    is_service: false,
    service_fee_percentage: service_fee_percentage,
    created_at: now,
    updated_at: now,
    entity_type: getActiveEntity(),
  };

  try {
    await db.products.add(product);
  } catch (error) {
    console.error('Erreur ajout produit:', error);
    throw error;
  }
};

export const addService = async (name: string, unitPrice: number, service_fee_percentage: number = 0): Promise<void> => {
  const now = new Date().toISOString();
  const service: Product = {
    id: crypto.randomUUID(),
    name,
    unit_price: unitPrice,
    cost_price: 0,
    quantity_available: 0,
    is_active: true,
    is_service: true,
    service_fee_percentage: service_fee_percentage,
    created_at: now,
    updated_at: now,
    entity_type: getActiveEntity(),
  };

  try {
    await db.products.add(service);
  } catch (error) {
    console.error('Erreur ajout service:', error);
    throw error;
  }
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  try {
    await db.products.update(id, { ...updates, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Erreur mise à jour produit:', error);
    throw error;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  try {
    await db.products.delete(id);
  } catch (error) {
    console.error('Erreur suppression produit:', error);
    throw error;
  }
};

// Add a fixed asset (immobilisation) record and optionally create the initial accounting entry
export const addFixedAsset = async (name: string, purchasePrice: number, purchaseDate: string, lifeMonths: number, paidFromAccountCode: string | null = '5311') : Promise<void> => {
  const now = new Date().toISOString();
  const asset: Product = {
    id: crypto.randomUUID(),
    name,
    unit_price: 0,
    cost_price: purchasePrice,
    quantity_available: 0,
    is_active: true,
    is_service: false,
    is_asset: true,
    purchase_price: purchasePrice,
    purchase_date: purchaseDate,
    life_months: lifeMonths,
    accumulated_amortization: 0,
    last_amortization_date: null as unknown as string,
    created_at: now,
    updated_at: now,
    entity_type: getActiveEntity(),
  };

  try {
    // Prevent duplicate asset (same name + purchase date + entity)
    const active = getActiveEntity();
    const exists = await db.products.filter(p => (p as any).is_asset === true && p.name === name && p.purchase_date === purchaseDate && (p as any).entity_type === active).first();
    if (exists) {
      // Do not add duplicate; ensure an initial purchase transaction exists but do not duplicate records
      console.warn('Asset already exists, skipping duplicate add:', name, purchaseDate);
      return;
    }

    await db.products.add(asset);

    // Create initial accounting transaction: Debit Asset account (215 Matériel) Credit Cash/Bank
    const journalDate = purchaseDate;
    const entries = [
      { journal_date: journalDate, transaction_type: 'asset_purchase', account_code: '215', account_name: name, debit: purchasePrice, credit: 0, description: `Achat immobilisation: ${name}` },
      { journal_date: journalDate, transaction_type: 'asset_purchase', account_code: paidFromAccountCode || '5311', account_name: paidFromAccountCode ? paidFromAccountCode : 'Caisse', debit: 0, credit: purchasePrice, description: `Paiement achat immobilisation: ${name}` },
    ];
    await createAccountingTransaction(entries as any);
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('financials-updated')); } catch (e) {}
  } catch (err) {
    console.error('Erreur ajout immobilisation:', err);
    throw err;
  }
};

// Compute days between two ISO dates (toIso - fromIso)
const daysBetween = (fromIso: string, toIso: string): number => {
  try {
    const f = new Date(fromIso);
    const t = new Date(toIso);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((t.getTime() - f.getTime()) / msPerDay));
  } catch (e) { return 0; }
};

// NOTE: Amortizations are simulated in views and not persisted as journal lines.
// This function is retained for compatibility but performs no writes to the journal.
export const applyAmortizationsUpTo = async (upToDate: string): Promise<void> => {
  console.warn('applyAmortizationsUpTo is a no-op: amortizations are simulated in reports and not written to the Journal.');
  return Promise.resolve();
};

// Sales
export const getSales = async (): Promise<Sale[]> => {
  try {
    const active = getActiveEntity();
    return await db.sales.filter(s => (s as any).entity_type === active).toArray();
  } catch (error) {
    console.error('Erreur récupération ventes:', error);
    return [];
  }
};

export const getSalesByDate = async (date: string): Promise<Sale[]> => {
  try {
    return await db.sales.where('sale_date').equals(date).toArray();
  } catch (error) {
    console.error('Erreur récupération ventes par date:', error);
    return [];
  }
};

export const getSalesByMonth = async (year: number, month: number): Promise<Sale[]> => {
  try {
    return await db.sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate.getFullYear() === year && saleDate.getMonth() === month - 1;
    }).toArray();
  } catch (error) {
    console.error('Erreur récupération ventes par mois:', error);
    return [];
  }
};

export const getSalesByFiscalYear = async (startYear: number): Promise<Sale[]> => {
  const startDate = new Date(startYear, 9, 1); // October 1
  const endDate = new Date(startYear + 1, 8, 30); // September 30

  try {
    return await db.sales.filter(sale => {
      const saleDate = new Date(sale.sale_date);
      return saleDate >= startDate && saleDate <= endDate;
    }).toArray();
  } catch (error) {
    console.error('Erreur récupération ventes année fiscale:', error);
    return [];
  }
};

export const getSaleById = async (id: string): Promise<Sale | null> => {
  try {
    const s = await db.sales.get(id);
    return s || null;
  } catch (error) {
    console.error('Erreur getSaleById:', error);
    return null;
  }
};

export const addSale = async (
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number,
  date: string,
  isCredit: boolean = false,
  clientName?: string,
  paidAmount: number = 0,
  paymentMethod: 'cash' | 'digital' = 'cash',
  paymentService?: TransferType,
  serviceFeePercent: number = 0
): Promise<string> => {
  const base = Math.round(unitPrice * quantity * 100) / 100; // montant HT
  const saleId = crypto.randomUUID();
  const sale: Sale = {
    id: saleId,
    product_id: productId,
    product_name: productName,
    quantity,
    unit_price: unitPrice,
    total: base,
    sale_date: date,
    is_credit: isCredit,
    client_name: clientName,
    paid_amount: Number.isFinite(paidAmount) ? paidAmount : 0,
    created_at: new Date().toISOString(),
  };

  try {
    (sale as any).entity_type = getActiveEntity();
    await db.sales.add(sale);

    // Immediately create double-entry accounting entries for this sale
    try {
      const companyType = (await getCompanyProfile())?.company_type || undefined;
      // Determine if the sold item is a service or a product to choose the correct sales account
      const productRecord = await db.products.get(productId);
      const isService = !!productRecord?.is_service;
      const salesAccountCode = isService ? '706' : '701';
      const salesAccountName = isService
        ? 'Prestations de services'
        : (companyType && ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType)
            ? 'Produits de la générosité'
            : 'Ventes de marchandises');

      // Compute active taxes for this sale to include tax liabilities
      const taxes = await getTaxConfigs();
      const taxDetails = taxes.map(t => ({ ...t, amount: Math.round(base * (t.percentage / 100) * 100) / 100 }));
      const taxTotal = taxDetails.reduce((s, t) => s + t.amount, 0);
      const subtotalWithTax = Math.round((base + taxTotal) * 100) / 100;

      // Compute payment service fee when using digital payment
      const feePercent = serviceFeePercent || (selectedProductDefaultFee(productRecord) ?? 0);
      const feeAmount = paymentMethod === 'digital' ? Math.round(subtotalWithTax * (feePercent / 100) * 100) / 100 : 0;
      const totalWithTaxAndFee = Math.round((subtotalWithTax + feeAmount) * 100) / 100;

      const entries = [] as Array<{
        journal_date: string;
        transaction_type: string;
        transaction_id?: string;
        account_code: string;
        account_name: string;
        debit?: number;
        credit?: number;
        description?: string;
      }>;

      const mapServiceAccount = (service?: TransferType) => {
        switch (service) {
          case 'moncash':
          case 'natcash':
            return { code: '517', name: 'Argent Numérique' };
          case 'zelle':
          case 'western_union':
          case 'moneygram':
          case 'cam_transfert':
            return { code: '5120', name: 'Banque' };
          default:
            return { code: '5311', name: 'Caisse Centrale' };
        }
      };

      const paymentAccount = paymentMethod === 'digital' ? mapServiceAccount(paymentService) : { code: '5311', name: 'Caisse Centrale' };

      if (isCredit) {
        const paidAmountVal = Number.isFinite(paidAmount) ? paidAmount : 0;
        const unpaid = Math.round((totalWithTaxAndFee - paidAmountVal) * 100) / 100;

        // If customer paid some now, debit payment account (cash or digital)
        if (paidAmountVal > 0) {
          entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: paymentAccount.code, account_name: paymentAccount.name, debit: paidAmountVal, credit: 0, description: `Acompte vente ${productName}` });
        }

        // Debit accounts receivable for unpaid (total including taxes and fees minus paid)
        if (unpaid > 0) {
          entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4110', account_name: 'Clients', debit: unpaid, credit: 0, description: `Créance client ${clientName || ''}` });
        }

        // Credit sales HT (base)
        entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: salesAccountCode, account_name: salesAccountName, debit: 0, credit: base, description: `Vente HT ${productName}` });

        // Credit tax liability
        if (taxTotal > 0) {
          entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4457', account_name: 'TVA à payer', debit: 0, credit: taxTotal, description: `TVA sur vente ${productName}` });
        }

        // Credit service/payment fees to 706 (Honoraires)
        if (feeAmount > 0) {
          entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '706', account_name: 'Honoraires / Commissions', debit: 0, credit: feeAmount, description: `Frais paiement ${paymentService || ''}` });
        }
      } else {
        // Cash or immediate payment sale
        // Debit payment account for full received (includes fees if any)
        entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: paymentAccount.code, account_name: paymentAccount.name, debit: totalWithTaxAndFee, credit: 0, description: `Vente ${productName}` });
        // Credit sales HT
        entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: salesAccountCode, account_name: salesAccountName, debit: 0, credit: base, description: `Vente HT ${productName}` });
        // Credit tax liability
        if (taxTotal > 0) {
          entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4457', account_name: 'TVA à payer', debit: 0, credit: taxTotal, description: `TVA sur vente ${productName}` });
        }
        // Credit payment fees
        if (feeAmount > 0) {
          entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '706', account_name: 'Honoraires / Commissions', debit: 0, credit: feeAmount, description: `Frais paiement ${paymentService || ''}` });
        }
      }

      await createAccountingTransaction(entries);
    } catch (acctErr) {
      console.error('Erreur enregistrement écritures comptables vente:', acctErr);
    }

    // NEW: Record COGS (Cost of Goods Sold) and update inventory
    try {
      const productRecord = await db.products.get(productId);
      if (productRecord && !productRecord.is_service) {
        // Only record COGS for physical products, not services
        const costOfGoodsSold = Math.round(productRecord.cost_price * quantity * 100) / 100;
        const cogsEntries = [];
        
        // Debit 607 (COGS / Achats) = cost_price * quantity
        cogsEntries.push({
          journal_date: date,
          transaction_type: 'sale',
          transaction_id: saleId,
          account_code: '607',
          account_name: 'Achats et charges externes',
          debit: costOfGoodsSold,
          credit: 0,
          description: `COGS - Déstockage ${productName} (${quantity}u @ ${productRecord.cost_price})`
        });
        
        // Credit 31 (Inventory / Stock) = cost_price * quantity
        cogsEntries.push({
          journal_date: date,
          transaction_type: 'sale',
          transaction_id: saleId,
          account_code: '31',
          account_name: 'Stock de marchandises',
          debit: 0,
          credit: costOfGoodsSold,
          description: `Stock diminué - ${productName} (${quantity}u)`
        });
        
        // Validate COGS entries are balanced
        const cogsDebits = cogsEntries.reduce((s, e) => s + (e.debit || 0), 0);
        const cogsCredits = cogsEntries.reduce((s, e) => s + (e.credit || 0), 0);
        console.log(`[addSale] COGS entries: Debits=${cogsDebits}, Credits=${cogsCredits}`);
        
        if (Math.abs(cogsDebits - cogsCredits) < 0.01) {
          await createAccountingTransaction(cogsEntries);
          console.log(`[addSale] COGS entries created, amount: ${costOfGoodsSold}`);
        } else {
          console.warn(`[addSale] COGS entries unbalanced, skipping: Debits ${cogsDebits} vs Credits ${cogsCredits}`);
        }
        
        // Decrement inventory
        const updatedQuantity = Math.max(0, productRecord.quantity_available - quantity);
        await db.products.update(productId, {
          quantity_available: updatedQuantity,
          updated_at: new Date().toISOString(),
        });
        console.log(`[addSale] Inventory decremented: ${productRecord.quantity_available} → ${updatedQuantity}`);
      }
    } catch (cogsErr) {
      console.error('Erreur enregistrement COGS ou déstockage:', cogsErr);
    }
  } catch (error) {
    console.error('Erreur ajout vente:', error);
    throw error;
  }
};

export const deleteSale = async (id: string): Promise<boolean> => {
  try {
    await db.sales.delete(id);
    return true;
  } catch (error) {
    console.error('Erreur suppression vente:', error);
    return false;
  }
};

// Revenue calculations
export const getDailyRevenue = async (date: string): Promise<number> => {
  const sales = await getSalesByDate(date);
  return sales.reduce((sum, s) => sum + s.total, 0);
};

export const getMonthlyRevenue = async (year: number, month: number): Promise<number> => {
  const sales = await getSalesByMonth(year, month);
  return sales.reduce((sum, s) => sum + s.total, 0);
};

export const getFiscalYearRevenue = async (startYear: number): Promise<number> => {
  const sales = await getSalesByFiscalYear(startYear);
  return sales.reduce((sum, s) => sum + s.total, 0);
};

export const getMonthlyTotals = async (startYear: number): Promise<Array<{ month: number; year: number; total: number; label: string; value: string }>> => {
  const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const months = [];
  for (let i = 0; i < 12; i++) {
    const year = startYear + Math.floor((9 + i) / 12);
    const month = ((9 + i) % 12) + 1;
    const total = await getMonthlyRevenue(year, month);
    months.push({
      month,
      year,
      total,
      // label should reflect the actual chronological month name (Oct -> Sep fiscal year)
      label: `${MONTHS_FR[month - 1]} ${year}`,
      // value should be a route-safe year-month string used by MonthlyReport
      value: `${year}-${String(month).padStart(2, '0')}`,
    });
  }
  return months;
};

// Transfers
export const getTransfers = async (): Promise<Transfer[]> => {
  try {
    const active = getActiveEntity();
    return await db.transfers.filter(t => (t as any).entity_type === active).toArray();
  } catch (error) {
    console.error('Erreur récupération transferts:', error);
    return [];
  }
};

export const getTransferById = async (id: string): Promise<Transfer | undefined> => {
  try {
    return await db.transfers.get(id);
  } catch (error) {
    console.error('Erreur récupération transfert:', error);
    return undefined;
  }
};

export const addTransfer = async (transfer: Omit<Transfer, 'id' | 'created_at'>): Promise<void> => {
  const newTransfer: Transfer = {
    ...transfer,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    entity_type: getActiveEntity(),
  };

  try {
    await db.transfers.add(newTransfer);
  } catch (error) {
    console.error('Erreur ajout transfert:', error);
    throw error;
  }
};

// Convenience for non-profit mission reports: stored in `transfers` with `transfer_type: 'autre'` and `custom_type_name: 'mission'`
export const addMissionReport = async (data: {
  transfer_date: string;
  amount: number;
  beneficiaries?: number;
  notes?: string;
  custom_type_name?: string;
}): Promise<void> => {
  const report = {
    report_number: getNextReportNumber(),
    transfer_type: 'autre' as TransferType,
    custom_type_name: data.custom_type_name || 'mission',
    transfer_date: data.transfer_date,
    amount: data.amount,
    notes: JSON.stringify({ beneficiaries: data.beneficiaries, notes: data.notes }),
  };

  try {
    await addTransfer(report as Omit<Transfer, 'id' | 'created_at'>);
  } catch (error) {
    console.error('Erreur ajout rapport mission:', error);
    throw error;
  }
};

export const updateTransfer = async (id: string, updates: Partial<Transfer>): Promise<void> => {
  try {
    await db.transfers.update(id, updates);
  } catch (error) {
    console.error('Erreur mise à jour transfert:', error);
    throw error;
  }
};

export const deleteTransfer = async (id: string): Promise<void> => {
  try {
    await db.transfers.delete(id);
  } catch (error) {
    console.error('Erreur suppression transfert:', error);
    throw error;
  }
};

export const deleteOperation = async (id: string): Promise<void> => {
  try {
    await db.operations.delete(id);
  } catch (error) {
    console.error('Erreur suppression opération:', error);
    throw error;
  }
};

export const getNextReportNumber = (): number => {
  // Pour simplifier, on utilise localStorage pour le compteur
  const current = parseInt(localStorage.getItem('reporta_next_report_number') || '1');
  localStorage.setItem('reporta_next_report_number', (current + 1).toString());
  return current;
};

// Operations
export const getOperations = async (): Promise<FinancialOperation[]> => {
  try {
    const active = getActiveEntity();
    return await db.operations.filter(o => (o as any).entity_type === active).toArray();
  } catch (error) {
    console.error('Erreur récupération opérations:', error);
    return [];
  }
};

export const addOperation = async (operation: Omit<{
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
}, 'id' | 'created_at'>): Promise<import("./database").FinancialOperation> => {
  // Business rule: Create accounting entries for every operation
  try {
    const today = operation.operation_date || new Date().toISOString().slice(0,10);
    const principal = Number.isFinite(operation.amount_gdes) ? operation.amount_gdes : 0;
    const fees = Number.isFinite(operation.fees) ? operation.fees : 0;
    const commission = Number.isFinite(operation.commission) ? operation.commission : 0;
    
    console.log(`[addOperation] Processing ${operation.operation_type} for ${operation.service_name}:`, { principal, fees, commission });

    // NEW: Check if this is an own service (proprietary) or brokerage
    const serviceConfig = await getServiceConfig(operation.service_name, operation.custom_service_name);
    const isOwnService = serviceConfig?.is_own_service ?? false;
    console.log(`[addOperation] Service config: is_own_service=${isOwnService}`);

    const entries: Array<{
      journal_date: string;
      transaction_type: string;
      transaction_id?: string;
      account_code: string;
      account_name: string;
      debit?: number;
      credit?: number;
      description?: string;
    }> = [];

    // Account codes
    const cashAccount = '5311';      // Caisse Centrale
    const cashName = 'Caisse Centrale';
    const digitalAccount = '517';    // Argent Numérique
    const digitalName = 'Argent Numérique';
    const feeAccount = '706';        // Honoraires / Commissions
    const feeName = 'Honoraires / Commissions';

    if (operation.operation_type === 'withdrawal') {
      // RETRAIT: Le client retire du cash
      if (isOwnService) {
        // OWN SERVICE: Le montant principal + frais + commission vont à 706 (service propre)
        // Ligne 1: Débit 517 (Argent Numérique) = montant + frais + commission
        const digitalDebit = Math.round((principal + fees + commission) * 100) / 100;
        entries.push({ 
          journal_date: today, 
          transaction_type: 'operation', 
          account_code: digitalAccount, 
          account_name: digitalName, 
          debit: digitalDebit, 
          credit: 0, 
          description: `RETRAIT - Service propre ${operation.service_name}` 
        });
        
        // Ligne 2: Crédit 706 (Prestations) = montant + frais + commission (le service reçoit tout)
        if (digitalDebit > 0) {
          entries.push({ 
            journal_date: today, 
            transaction_type: 'operation', 
            account_code: feeAccount, 
            account_name: 'Prestations de services',
            debit: 0, 
            credit: digitalDebit, 
            description: `RETRAIT - Service propre ${operation.service_name}, montant: ${principal}` 
          });
        }
      } else {
        // BROKERAGE: Le montant va à caisse, frais vont à 706
        // Ligne 1: Débit 517 (Argent Numérique) = montant + frais + commission
        const digitalDebit = Math.round((principal + fees + commission) * 100) / 100;
        entries.push({ 
          journal_date: today, 
          transaction_type: 'operation', 
          account_code: digitalAccount, 
          account_name: digitalName, 
          debit: digitalDebit, 
          credit: 0, 
          description: `RETRAIT - Courtage ${operation.service_name}` 
        });
        
        // Ligne 2: Crédit 5311 (Caisse Centrale) = montant
        if (principal > 0) {
          entries.push({ 
            journal_date: today, 
            transaction_type: 'operation', 
            account_code: cashAccount, 
            account_name: cashName, 
            debit: 0, 
            credit: principal, 
            description: `RETRAIT - Cash donné au client` 
          });
        }
        
        // Ligne 3: Crédit 706 (Honoraires) = frais + commission
        const feeCredit = Math.round((fees + commission) * 100) / 100;
        if (feeCredit > 0) {
          entries.push({ 
            journal_date: today, 
            transaction_type: 'operation', 
            account_code: feeAccount, 
            account_name: feeName, 
            debit: 0, 
            credit: feeCredit, 
            description: `RETRAIT - Frais ${fees} + Commission ${commission}` 
          });
        }
      }
    } else if (operation.operation_type === 'deposit' || operation.operation_type === 'transfer') {
      // DÉPÔT / TRANSFERT: Le client envoie du cash
      if (isOwnService) {
        // OWN SERVICE: Le montant principal + frais + commission vont à 706 (service propre)
        // Ligne 1: Débit 5311 (Caisse) = montant + frais + commission
        const cashDebit = Math.round((principal + fees + commission) * 100) / 100;
        entries.push({ 
          journal_date: today, 
          transaction_type: 'operation', 
          account_code: cashAccount, 
          account_name: cashName, 
          debit: cashDebit, 
          credit: 0, 
          description: `${operation.operation_type.toUpperCase()} - Service propre ${operation.service_name}` 
        });
        
        // Ligne 2: Crédit 706 (Prestations) = montant + frais + commission
        if (cashDebit > 0) {
          entries.push({ 
            journal_date: today, 
            transaction_type: 'operation', 
            account_code: feeAccount, 
            account_name: 'Prestations de services',
            debit: 0, 
            credit: cashDebit, 
            description: `${operation.operation_type.toUpperCase()} - Service propre ${operation.service_name}, montant: ${principal}` 
          });
        }
      } else {
        // BROKERAGE: Le montant va à digital, frais vont à 706
        // Ligne 1: Débit 5311 (Caisse) = montant + frais
        const cashDebit = Math.round((principal + fees) * 100) / 100;
        entries.push({ 
          journal_date: today, 
          transaction_type: 'operation', 
          account_code: cashAccount, 
          account_name: cashName, 
          debit: cashDebit, 
          credit: 0, 
          description: `${operation.operation_type.toUpperCase()} - Courtage ${operation.service_name}` 
        });
        
        // Ligne 2: Crédit 517 (Argent Numérique) = montant
        if (principal > 0) {
          entries.push({ 
            journal_date: today, 
            transaction_type: 'operation', 
            account_code: digitalAccount, 
            account_name: digitalName, 
            debit: 0, 
            credit: principal, 
            description: `${operation.operation_type.toUpperCase()} - Montant versé` 
          });
        }
        
        // Ligne 3: Crédit 706 (Honoraires) = frais + commission
        const feeCredit = Math.round((fees + commission) * 100) / 100;
        if (feeCredit > 0) {
          entries.push({ 
            journal_date: today, 
            transaction_type: 'operation', 
            account_code: feeAccount, 
            account_name: feeName, 
            debit: 0, 
            credit: feeCredit, 
            description: `${operation.operation_type.toUpperCase()} - Frais ${fees} + Commission ${commission}` 
          });
        }
      }
    }

    // Only record if entries present and balanced
    if (entries.length > 0) {
      console.log(`[addOperation] Creating ${entries.length} accounting entries:`, entries);
      await createAccountingTransaction(entries);
      console.log(`[addOperation] Accounting entries created successfully`);
    }
  } catch (err) {
    console.error('Erreur enregistrement écritures comptables opération:', err);
  }

  // Now persist the operational balances (kept for audit) via executeFinancialTransaction
  // executeFinancialTransaction now returns the created FinancialOperation so we can update per-type balances (localStorage)
  const createdOp = await executeFinancialTransaction(operation);
  
  console.log(`[addOperation] After executeFinancialTransaction:`, { 
    cash_before: createdOp.cash_before, 
    cash_after: createdOp.cash_after,
    digital_before: createdOp.digital_before,
    digital_after: createdOp.digital_after
  });

  try {
    // Update the per-transfer-type balance stored in localStorage so the 'Gérer les soldes par type' page updates immediately
    // Use the custom_service_name if present, otherwise undefined (matching the key generation logic)
    updateTypeBalance(createdOp.service_name, createdOp.custom_service_name || undefined, { cash_balance: createdOp.cash_after, digital_balance: createdOp.digital_after });
    console.log(`[addOperation] Updated localStorage balance for ${createdOp.service_name}/${createdOp.custom_service_name}`);
    // Dispatch events for other UI parts to listen and refresh
    try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ledger-updated')); window.dispatchEvent(new CustomEvent('financials-updated')); } } catch (e) { /* ignore */ }
  } catch (err) {
    console.error('Erreur mise à jour balance par type après opération:', err);
  }

  // Return created operation so callers (forms) can display receipts
  return createdOp;
};

export const getOperationById = async (id: string): Promise<FinancialOperation | undefined> => {
  try {
    return await db.operations.get(id);
  } catch (error) {
    console.error('Erreur récupération opération:', error);
    return undefined;
  }
};

export const updateOperation = async (id: string, updates: Partial<Omit<FinancialOperation, 'id' | 'created_at' | 'operation_number'>>): Promise<void> => {
  try {
    const operation = await db.operations.get(id);
    if (!operation) {
      throw new Error('Opération non trouvée');
    }
    
    const updated = {
      ...operation,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    
    await db.operations.put(updated);
  } catch (error) {
    console.error('Erreur mise à jour opération:', error);
    throw error;
  }
};

export const getCurrentBalancesForService = async (serviceName: TransferType, customTypeName?: string): Promise<{ cash: number; digital: number }> => {
  // NEW: Read from accounting_entries (True Single Source of Truth)
  // This ensures balances are derived from actual financial movements, not manual entries
  const balance = await getTypeBalanceFromAccounting(serviceName, customTypeName);
  return {
    cash: balance.cash_balance,
    digital: balance.digital_balance,
  };
};

export const getOperationsByService = async (serviceName: TransferType): Promise<FinancialOperation[]> => {
  try {
    return await db.operations.where('service_name').equals(serviceName).toArray();
  } catch (error) {
    console.error('Erreur récupération opérations par service:', error);
    return [];
  }
};

export const getOperationsByDateRange = async (startDate: string, endDate: string): Promise<FinancialOperation[]> => {
  try {
    return await db.operations
      .where('operation_date')
      .between(startDate, endDate, true, true)
      .toArray();
  } catch (error) {
    console.error('Erreur récupération opérations par période:', error);
    return [];
  }
};

// Balances
export const getBalances = async (): Promise<Balance[]> => {
  try {
    return await db.balances.toArray();
  } catch (error) {
    console.error('Erreur récupération balances:', error);
    return [];
  }
};

export const getBalanceByType = async (type: 'cash' | 'digital'): Promise<number> => {
  try {
    const balance = await db.balances.where('type').equals(type).first();
    return balance?.amount || 0;
  } catch (error) {
    console.error('Erreur récupération balance:', error);
    return 0;
  }
};

export const updateBalance = async (type: 'cash' | 'digital', amount: number): Promise<void> => {
  const balance: Balance = {
    id: type,
    type,
    amount,
    updated_at: new Date().toISOString(),
  };

  try {
    await db.balances.put(balance);
  } catch (error) {
    console.error('Erreur mise à jour balance:', error);
    throw error;
  }
};

// Transfer type balances
export const getTypeBalance = (transferType: TransferType, customTypeName?: string): TypeBalance => {
  try {
    const key = customTypeName ? `${transferType}_${customTypeName}` : transferType;
    const stored = localStorage.getItem(`balance_${key}`);
    console.log(`[getTypeBalance] Reading balance_${key}:`, stored);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur récupération balance par type:', error);
  }
  
  // Return default balance
  console.log(`[getTypeBalance] No balance found, returning defaults`);
  return {
    digital_balance: 0,
    cash_balance: 0,
  };
};

export const updateTypeBalance = (transferType: TransferType, customTypeName: string | undefined, updates: Partial<TypeBalance>): TypeBalance => {
  const current = getTypeBalance(transferType, customTypeName);
  const updated = { ...current, ...updates };
  
  try {
    const key = customTypeName ? `${transferType}_${customTypeName}` : transferType;
    console.log(`[updateTypeBalance] Saving balance_${key}:`, updated);
    localStorage.setItem(`balance_${key}`, JSON.stringify(updated));
  } catch (error) {
    console.error('Erreur sauvegarde balance:', error);
  }
  
  return updated;
};

// ====== NEW: Calculate balances from accounting entries (True Source of Truth) ======
// This function reads from accounting_entries table instead of localStorage
// Maps service types to their accounting codes:
// - Cash (5311): Caisse Centrale
// - Digital (517): Argent Numérique
// - MonCash/NatCash: both use 517
// - Zelle/Western Union: both use 512 (Banque)

const getAccountCodesForService = (transferType: TransferType): { assets: string[] } => {
  // Map transfer services to their asset accounts in chart of accounts
  switch (transferType) {
    case 'moncash':
    case 'natcash':
      return { assets: ['517'] }; // Digital accounts
    case 'zelle':
    case 'cam_transfert':
    case 'western_union':
    case 'moneygram':
      return { assets: ['512', '5120'] }; // Bank accounts
    case 'autre':
    default:
      return { assets: ['5311', '517'] }; // Both cash and digital
  }
};

export const getTypeBalanceFromAccounting = async (transferType: TransferType, customTypeName?: string): Promise<{ cash_balance: number; digital_balance: number }> => {
  try {
    // Get all accounting entries for this service
    const entries = await db.accounting_entries.toArray();
    
    let cashBalance = 0;
    let digitalBalance = 0;
    
    entries.forEach((entry: any) => {
      // Decrypt the payload if encrypted
      let payload: any = entry;
      if (entry.encrypted_payload) {
        try {
          payload = decryptObject(entry.encrypted_payload) || {};
        } catch (e) {
          console.warn('Failed to decrypt entry:', e);
          return;
        }
      }
      
      const code = payload.account_code || entry.account_code || '';
      const debit = (payload.debit ?? entry.debit) || 0;
      const credit = (payload.credit ?? entry.credit) || 0;
      const balance = debit - credit; // Assets: Debit is positive
      
      // 5311 = Caisse Centrale (Cash)
      if (code === '5311') {
        cashBalance += balance;
      }
      
      // 517 = Argent Numérique (Digital)
      if (code === '517') {
        digitalBalance += balance;
      }
    });
    
    console.log(`[getTypeBalanceFromAccounting] ${transferType}:`, { cashBalance, digitalBalance });
    
    return {
      cash_balance: Math.round(cashBalance * 100) / 100,
      digital_balance: Math.round(digitalBalance * 100) / 100,
    };
  } catch (err) {
    console.error('[getTypeBalanceFromAccounting] Error:', err);
    // Fallback to localStorage if accounting entries fail
    return getTypeBalance(transferType, customTypeName);
  }
};

// Utility functions
export const parseDecimalInput = (value: string): number => {
  // Remove spaces and replace comma with dot for decimal
  const cleaned = value.replace(/\s/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const getDatesWithSales = async (): Promise<string[]> => {
  try {
    const sales = await db.sales.toArray();
    const dates = [...new Set(sales.map(s => s.sale_date))];
    return dates.sort();
  } catch (error) {
    console.error('Erreur récupération dates avec ventes:', error);
    return [];
  }
};

export const getDailyTotals = async (year: number, month: number): Promise<Array<{ date: string; total: number; dayName: string; dayNum: number }>> => {
  const sales = await getSalesByMonth(year, month);
  const salesByDate = sales.reduce((acc, sale) => {
    if (!acc[sale.sale_date]) {
      acc[sale.sale_date] = 0;
    }
    acc[sale.sale_date] += sale.total;
    return acc;
  }, {} as Record<string, number>);

  const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  return Object.entries(salesByDate).map(([date, total]) => {
    const dateObj = new Date(date + 'T00:00:00');
    return {
      date,
      total,
      dayName: DAYS_FR[dateObj.getDay()],
      dayNum: dateObj.getDate(),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

export const formatCurrency = (amount: number, symbol: string = 'G'): string => {
  const value = Number.isFinite(amount) ? amount : 0;
  return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
};

// Fonctions pour transferts
export const getDatesWithTransfers = async (): Promise<string[]> => {
  try {
    const transfers = await db.transfers.toArray();
    const dates = [...new Set(transfers.map(t => t.transfer_date))];
    return dates.sort();
  } catch (error) {
    console.error('Erreur récupération dates avec transferts:', error);
    return [];
  }
};

export const getTransfersByDate = async (date: string): Promise<Transfer[]> => {
  try {
    return await db.transfers.where('transfer_date').equals(date).toArray();
  } catch (error) {
    console.error('Erreur récupération transferts par date:', error);
    return [];
  }
};

export const getTransfersByMonth = async (year: number, month: number): Promise<Transfer[]> => {
  try {
    return await db.transfers.filter(transfer => {
      const transferDate = new Date(transfer.transfer_date);
      return transferDate.getFullYear() === year && transferDate.getMonth() === month - 1;
    }).toArray();
  } catch (error) {
    console.error('Erreur récupération transferts par mois:', error);
    return [];
  }
};

export const getMonthlyTransferRevenue = async (year: number, month: number): Promise<number> => {
  const transfers = await getTransfersByMonth(year, month);
  return transfers.reduce((sum, t) => sum + t.amount, 0);
};

export const getDailyTransferRevenue = async (date: string): Promise<number> => {
  const transfers = await getTransfersByDate(date);
  return transfers.reduce((sum, t) => sum + t.amount, 0);
};

export const getFiscalYearTransferRevenue = async (startYear: number): Promise<number> => {
  const startDate = new Date(startYear, 9, 1); // October 1
  const endDate = new Date(startYear + 1, 8, 30); // September 30

  try {
    const transfers = await db.transfers.filter(transfer => {
      const transferDate = new Date(transfer.transfer_date);
      return transferDate >= startDate && transferDate <= endDate;
    }).toArray();
    return transfers.reduce((sum, t) => sum + t.amount, 0);
  } catch (error) {
    console.error('Erreur récupération revenus transferts année fiscale:', error);
    return 0;
  }
};

export const getTransferDailyTotals = async (year: number, month: number): Promise<Array<{ date: string; total: number; dayName: string; dayNum: number }>> => {
  const transfers = await getTransfersByMonth(year, month);
  const transfersByDate = transfers.reduce((acc, transfer) => {
    if (!acc[transfer.transfer_date]) {
      acc[transfer.transfer_date] = 0;
    }
    acc[transfer.transfer_date] += transfer.amount;
    return acc;
  }, {} as Record<string, number>);

  const DAYS_FR = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

  return Object.entries(transfersByDate).map(([date, total]) => {
    const dateObj = new Date(date + 'T00:00:00');
    return {
      date,
      total,
      dayName: DAYS_FR[dateObj.getDay()],
      dayNum: dateObj.getDate(),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));
};

export const getTransferMonthlyTotals = async (startYear: number): Promise<Array<{ month: number; year: number; total: number; label: string; value: string }>> => {
  const MONTHS_FR = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const months = [];
  for (let i = 0; i < 12; i++) {
    const year = startYear + Math.floor((9 + i) / 12);
    const month = ((9 + i) % 12) + 1;
    const total = await getMonthlyTransferRevenue(year, month);
    months.push({
      month,
      year,
      total,
      label: `${MONTHS_FR[i]} ${year}`,
      value: total.toFixed(2),
    });
  }
  return months;
};

// Fonctions d'export/import
export const exportAllData = async (): Promise<string> => {
  try {
    const data = {
      products: await getProducts(),
      sales: await getSales(),
      transfers: await getTransfers(),
      operations: await getOperations(),
      balances: await getBalances(),
      settings: getSettings(),
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Erreur export données:', error);
    throw error;
  }
};

export const importAllData = async (jsonData: string): Promise<void> => {
  try {
    const data = JSON.parse(jsonData);

    // Validation basique
    if (!data.version || !data.products || !data.sales) {
      throw new Error('Format de données invalide');
    }

    // Importer les données
    await db.products.clear();
    await db.products.bulkAdd(data.products);

    await db.sales.clear();
    await db.sales.bulkAdd(data.sales);

    if (data.transfers) {
      await db.transfers.clear();
      await db.transfers.bulkAdd(data.transfers);
    }

    if (data.operations) {
      await db.operations.clear();
      await db.operations.bulkAdd(data.operations);
    }

    if (data.balances) {
      await db.balances.clear();
      await db.balances.bulkAdd(data.balances);
    }

    if (data.settings) {
      await saveSettings(data.settings);
    }

    console.log('Importation terminée');
  } catch (error) {
    console.error('Erreur import données:', error);
    throw error;
  }
};

// Tax Management Functions
export const getTaxConfigs = async (): Promise<TaxConfig[]> => {
  try {
    return await db.tax_config.where('is_active').equals(true).toArray();
  } catch (error) {
    console.error('Erreur récupération taxes:', error);
    return [];
  }
};

export const getAllTaxConfigs = async (): Promise<TaxConfig[]> => {
  try {
    return await db.tax_config.toArray();
  } catch (error) {
    console.error('Erreur récupération taxes:', error);
    return [];
  }
};

export const addTaxConfig = async (name: string, percentage: number): Promise<void> => {
  const now = new Date().toISOString();
  const taxConfig: TaxConfig = {
    id: crypto.randomUUID(),
    name,
    percentage,
    is_active: true,
    created_at: now,
    updated_at: now,
  };

  try {
    await db.tax_config.add(taxConfig);
  } catch (error) {
    console.error('Erreur ajout taxe:', error);
    throw error;
  }
};

export const updateTaxConfig = async (id: string, updates: Partial<TaxConfig>): Promise<void> => {
  try {
    await db.tax_config.update(id, { ...updates, updated_at: new Date().toISOString() });
  } catch (error) {
    console.error('Erreur mise à jour taxe:', error);
    throw error;
  }
};

export const deleteTaxConfig = async (id: string): Promise<void> => {
  try {
    await db.tax_config.delete(id);
  } catch (error) {
    console.error('Erreur suppression taxe:', error);
    throw error;
  }
};

export const recordTaxedTransaction = async (
  transactionType: 'sale' | 'operation' | 'transfer',
  transactionId: string,
  transactionDate: string,
  baseAmount: number,
  taxName: string,
  taxPercentage: number
): Promise<void> => {
  try {
    const taxAmount = Math.round(baseAmount * (taxPercentage / 100) * 100) / 100;
    const totalWithTax = Math.round((baseAmount + taxAmount) * 100) / 100;

    const taxedTransaction: TaxedTransaction = {
      id: crypto.randomUUID(),
      transaction_type: transactionType,
      transaction_id: transactionId,
      transaction_date: transactionDate,
      base_amount: baseAmount,
      tax_name: taxName,
      tax_percentage: taxPercentage,
      tax_amount: taxAmount,
      total_with_tax: totalWithTax,
      created_at: new Date().toISOString(),
    };

    await db.taxed_transactions.add(taxedTransaction);
  } catch (error) {
    console.error('Erreur enregistrement transaction fiscale:', error);
    throw error;
  }
};

// ====== NEW: Automated Tax Calculation Engine ======
// Reads from accounting_entries and calculates taxes based on account codes
// 701 (Produits) and 706 (Services/Courtage)

export const calculateTaxesFromAccounting = async (
  startDate: string, 
  endDate: string
): Promise<{
  taxableProductSales: number;
  taxableServices: number;
  totalTaxableBase: number;
  appliedTaxRate: number;
  totalTaxes: number;
  breakdown: { [key: string]: { base: number; tax: number } };
}> => {
  try {
    const entries = await db.accounting_entries.toArray();
    const taxConfigs = await getTaxConfigs();
    const activeTax = taxConfigs.find(t => t.is_active) || taxConfigs[0];
    const taxRate = activeTax?.percentage || 10;
    
    let productSalesBase = 0;
    let serviceFeesBase = 0;
    const breakdown: { [key: string]: { base: number; tax: number } } = {
      '701_products': { base: 0, tax: 0 },
      '706_services': { base: 0, tax: 0 },
    };
    
    entries.forEach((entry: any) => {
      // Skip entries outside date range
      if (entry.journal_date < startDate || entry.journal_date > endDate) return;
      
      // Decrypt payload if needed
      let payload: any = entry;
      if (entry.encrypted_payload) {
        try {
          payload = decryptObject(entry.encrypted_payload) || {};
        } catch (e) {
          console.warn('Failed to decrypt tax entry:', e);
          return;
        }
      }
      
      const code = payload.account_code || entry.account_code || '';
      const credit = (payload.credit ?? entry.credit) || 0;
      
      // 701: Product Sales (revenues)
      if (code === '701' && credit > 0) {
        productSalesBase += credit;
        breakdown['701_products'].base += credit;
      }
      
      // 706: Honoraires / Services / Courtage
      if (code === '706' && credit > 0) {
        serviceFeesBase += credit;
        breakdown['706_services'].base += credit;
      }
    });
    
    // Calculate taxes for each category
    const productTax = Math.round(productSalesBase * (taxRate / 100) * 100) / 100;
    const serviceTax = Math.round(serviceFeesBase * (taxRate / 100) * 100) / 100;
    
    breakdown['701_products'].tax = productTax;
    breakdown['706_services'].tax = serviceTax;
    
    const totalBase = productSalesBase + serviceFeesBase;
    const totalTax = productTax + serviceTax;
    
    console.log(`[calculateTaxesFromAccounting] ${startDate} to ${endDate}:`, {
      productSalesBase,
      serviceFeesBase,
      totalBase,
      totalTax,
    });
    
    return {
      taxableProductSales: Math.round(productSalesBase * 100) / 100,
      taxableServices: Math.round(serviceFeesBase * 100) / 100,
      totalTaxableBase: Math.round(totalBase * 100) / 100,
      appliedTaxRate: taxRate,
      totalTaxes: Math.round(totalTax * 100) / 100,
      breakdown,
    };
  } catch (err) {
    console.error('[calculateTaxesFromAccounting] Error:', err);
    return {
      taxableProductSales: 0,
      taxableServices: 0,
      totalTaxableBase: 0,
      appliedTaxRate: 0,
      totalTaxes: 0,
      breakdown: {},
    };
  }
};

// --- Third party (clients / suppliers) helpers ---
export const addOrUpdateThirdParty = async (name: string, type: 'client' | 'supplier', delta: number = 0): Promise<ThirdParty> => {
  try {
    const nameKey = name.trim().toLowerCase();
    const now = new Date().toISOString();

    // For suppliers, use db.suppliers as the canonical store
    if (type === 'supplier') {
      const found = await db.suppliers.filter((s: any) => (s.name || '').toLowerCase() === nameKey).toArray();
      if (found.length > 0) {
        const sup: any = found[0];
        const newAmount = (sup.amount_owed || 0) + delta;
        await db.suppliers.update(sup.id, { amount_owed: newAmount, updated_at: now });
        return { id: sup.id, name: sup.name, type: 'supplier', balance: newAmount, created_at: sup.created_at, updated_at: now } as ThirdParty;
      }

      // Create supplier entry when missing (delta may be 0)
      const newId = crypto.randomUUID();
      await db.suppliers.add({ id: newId, name, amount_owed: delta, due_date: now, status: delta > 0 ? 'active' : 'settled', entity_type: getActiveEntity(), created_at: now, updated_at: now });
      return { id: newId, name, type: 'supplier', balance: delta, created_at: now, updated_at: now } as ThirdParty;
    }

    // For clients (and other third parties) keep the encrypted db.tiers store
    const nameHash = nameKey;
    const found = await db.tiers.filter(t => (t as unknown as StoredThirdParty).name_hash === nameHash && t.type === type).toArray();
    if (found.length > 0) {
      const tp = found[0] as StoredThirdParty;
      const payload = tp.encrypted_payload ? decryptObject(tp.encrypted_payload) as { name?: string; balance?: number } : { name: tp.name, balance: tp.balance };
      const newBalance = (payload?.balance ?? tp.balance ?? 0) + delta;
      const newPayload = { ...(payload || {}), name, balance: newBalance };
      const encrypted = encryptObject(newPayload);
      await db.tiers.update(tp.id, { encrypted_payload: encrypted, name_hash: nameHash, updated_at: now });
      return { id: tp.id, name, type: tp.type, balance: newBalance, created_at: tp.created_at, updated_at: now } as ThirdParty;
    }

    const payload = { name, balance: delta };
    const encrypted = encryptObject(payload);
    const newTp = { id: crypto.randomUUID(), name_hash: nameHash, type, balance: delta, created_at: now, encrypted_payload: encrypted } as StoredThirdParty;
    await db.tiers.add(newTp);
    return { id: newTp.id, name, type: newTp.type, balance: delta, created_at: now } as ThirdParty;
  } catch (err) {
    console.error('Erreur addOrUpdateThirdParty:', err);
    throw err;
  }
};

export const getThirdParties = async (type?: 'client' | 'supplier'): Promise<ThirdParty[]> => {
  try {
    if (type === 'supplier') {
      const suppliers = await getSuppliers();
      return suppliers.map(s => ({ id: s.id, name: s.name, type: 'supplier', balance: s.amount_owed || 0, created_at: s.created_at, updated_at: s.updated_at } as ThirdParty));
    }

    const rows = type ? await db.tiers.where('type').equals(type).toArray() : await db.tiers.toArray();
    return rows.map((r: StoredThirdParty) => {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { name?: string; balance?: number } : { name: r.name, balance: r.balance };
      return {
        id: r.id,
        name: payload?.name || r.name,
        type: r.type,
        balance: payload?.balance ?? r.balance ?? 0,
        created_at: r.created_at,
        updated_at: r.updated_at,
      } as ThirdParty;
    });
  } catch (err) {
    console.error('Erreur getThirdParties:', err);
    return [];
  }
};

export const deleteThirdParty = async (id: string): Promise<void> => {
  try {
    // Try suppliers first (canonical)
    try {
      const sup = await db.suppliers.get(id);
      if (sup) {
        await db.suppliers.delete(id);
        try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ledger-updated')); } catch (e) { console.debug('ledger-updated dispatch failed', e); }
        return;
      }
    } catch (e) {
      // ignore and try tiers
    }

    await db.tiers.delete(id);
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ledger-updated')); } catch (e) { console.debug('ledger-updated dispatch failed', e); }
  } catch (err) {
    console.error('Erreur suppression tiers:', err);
    throw err;
  }
};

// --- Shareholders (Actionnaires) helpers ---
export const saveShareholders = async (shareholders: Array<{ name: string; percentage: number }>): Promise<void> => {
  try {
    // validation: percentages sum to 100
    const total = shareholders.reduce((s, sh) => s + (Number(sh.percentage) || 0), 0);
    if (Math.round(total) !== 100) throw new Error('La somme des parts doit être égale à 100%');

    const now = new Date().toISOString();
    // clear existing shareholders and add encrypted entries
    const all = await db.shareholders.toArray();
    for (const s of all) await db.shareholders.delete(s.id);

    for (const sh of shareholders) {
      const payload = { name: sh.name, percentage: sh.percentage };
      const encrypted = encryptObject(payload);
      const nameHash = sh.name.toLowerCase();
      const record = { id: crypto.randomUUID(), encrypted_payload: encrypted, name_hash: nameHash, created_at: now, updated_at: now } as StoredShareholder;
      await db.shareholders.add(record);
    }

    // If settings declare an initial capital, create constitution entry
    const initialCapital = getSettings().initial_capital || 0;
    if (initialCapital && initialCapital > 0) {
      // Create a single accounting entry: Debit Bank (5120) / Credit 101 (Capital Social)
      const today = new Date().toISOString().slice(0,10);
      // Use Cash (5311) for initial capital per requirement: Debit 5311 / Credit 101
      await createAccountingTransaction([
        { journal_date: today, transaction_type: 'shareholders', account_code: '5311', account_name: 'Caisse', debit: initialCapital, credit: 0, description: 'Apports des actionnaires (constitution)'} ,
        { journal_date: today, transaction_type: 'shareholders', account_code: '101', account_name: 'Capital social', debit: 0, credit: initialCapital, description: 'Apports des actionnaires (constitution)'}
      ]);
    }
  } catch (err) {
    console.error('Erreur sauvegarde actionnaires:', err);
    throw err;
  }
};

export const getShareholders = async (): Promise<Array<{ id: string; name: string; percentage: number }>> => {
  try {
    const rows = await db.shareholders.toArray();
    return rows.map((r: StoredShareholder) => {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { name?: string; percentage?: number } : null;
      return { id: r.id, name: payload?.name || '', percentage: payload?.percentage || 0 };
    });
  } catch (err) {
    console.error('Erreur récupération actionnaires:', err);
    return [];
  }
};

export const clearShareholders = async (): Promise<void> => {
  try {
    await db.shareholders.clear();
  } catch (err) {
    console.error('Erreur suppression actionnaires:', err);
    throw err;
  }
};


export const getTaxedTransactionsByDate = async (startDate: string, endDate: string): Promise<TaxedTransaction[]> => {
  try {
    return await db.taxed_transactions
      .where('transaction_date')
      .between(startDate, endDate)
      .toArray();
  } catch (error) {
    console.error('Erreur récupération transactions fiscales:', error);
    return [];
  }
};

export const getTaxedTransactionsByMonth = async (year: number, month: number): Promise<TaxedTransaction[]> => {
  try {
    return await db.taxed_transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getFullYear() === year && date.getMonth() === month - 1;
    }).toArray();
  } catch (error) {
    console.error('Erreur récupération transactions fiscales par mois:', error);
    return [];
  }
};

export const getTaxSummaryByMonth = async (year: number, month: number): Promise<Record<string, number>> => {
  const transactions = await getTaxedTransactionsByMonth(year, month);
  const summary: Record<string, number> = {};

  transactions.forEach(t => {
    if (!summary[t.tax_name]) {
      summary[t.tax_name] = 0;
    }
    summary[t.tax_name] += t.tax_amount;
  });

  return summary;
};

export const getTaxSummaryByYear = async (year: number): Promise<Record<string, number>> => {
  try {
    const transactions = await db.taxed_transactions.filter(t => {
      const date = new Date(t.transaction_date);
      return date.getFullYear() === year;
    }).toArray();

    const summary: Record<string, number> = {};
    transactions.forEach(t => {
      if (!summary[t.tax_name]) {
        summary[t.tax_name] = 0;
      }
      summary[t.tax_name] += t.tax_amount;
    });

    return summary;
  } catch (error) {
    console.error('Erreur récupération résumé fiscal annuel:', error);
    return {};
  }
};

// --- Accounting helpers ---
export const addAccount = async (code: string, name: string, type?: 'Actif' | 'Passif' | 'Charge' | 'Produit' | string, description?: string): Promise<Account> => {
  const now = new Date().toISOString();
  const acc: Account = { id: crypto.randomUUID(), code, name, type: type || '', description: description || '', created_at: now, updated_at: now };
  try {
    await db.accounts.add(acc);
    // Notify UI to refresh account lists and financials
    try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ledger-updated')); window.dispatchEvent(new CustomEvent('financials-updated')); } } catch (e) { console.debug('dispatch events failed', e); }
    return acc;
  } catch (err) {
    console.error('Erreur ajout compte:', err);
    throw err;
  }
};
// seedCammeleonChart moved to top of file to avoid initialization timing issues

export const getAccounts = async (): Promise<Account[]> => {
  try {
    return await db.accounts.toArray();
  } catch (err) {
    console.error('Erreur récupération comptes:', err);
    return [];
  }
};

export const recordAccountingEntries = async (entries: Array<{
  journal_date: string;
  transaction_type: string;
  transaction_id?: string;
  account_code: string;
  account_name: string;
  debit?: number;
  credit?: number;
  description?: string;
}>): Promise<void> => {
  try {
    const now = new Date().toISOString();
    // For security, encrypt the sensitive payload (account_code, account_name, debit, credit, description)
    const stored = entries.map(e => {
      const id = crypto.randomUUID();
      const payload = {
        account_code: e.account_code,
        account_name: e.account_name,
        debit: Number.isFinite(e.debit) ? e.debit : 0,
        credit: Number.isFinite(e.credit) ? e.credit : 0,
        description: e.description,
        transaction_id: e.transaction_id,
      };
      return {
        id,
        journal_date: e.journal_date,
        transaction_type: e.transaction_type,
        transaction_id: e.transaction_id,
        encrypted_payload: encryptObject(payload),
        created_at: now,
      } as StoredAccountingEntry;
    });

    await db.accounting_entries.bulkAdd(stored);
    // Notify UI that ledger changed
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ledger-updated'));
        // also notify that financial statements may need recomputation
        window.dispatchEvent(new CustomEvent('financials-updated'));
      }
    } catch (e) {
      // ignore
    }
  } catch (err) {
    console.error('Erreur enregistrement écritures comptables:', err);
    throw err;
  }
};

// Wrapper that validates a double-entry (total debits == total credits) before recording
export const createAccountingTransaction = async (entries: Array<{
  journal_date: string;
  transaction_type: string;
  transaction_id?: string;
  account_code: string;
  account_name: string;
  debit?: number;
  credit?: number;
  description?: string;
}>): Promise<void> => {
  const totalDebit = entries.reduce((s, e) => s + (Number.isFinite(e.debit) ? e.debit! : 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (Number.isFinite(e.credit) ? e.credit! : 0), 0);
  const round = (n: number) => Math.round(n * 100) / 100;
  if (round(totalDebit) !== round(totalCredit)) {
    throw new Error(`Transaction déséquilibrée: débits=${totalDebit} crédits=${totalCredit}`);
  }

  await recordAccountingEntries(entries);
};

// Profit & Loss (Compte de résultat) between two dates (inclusive)
export const getProfitAndLoss = async (startDate: string, endDate: string): Promise<{ revenues: number; expenses: number; taxes: number; net: number }> => {
  try {
    const entries = await getJournalEntriesByDate(startDate, endDate);
    let revenues = 0;
    let expenses = 0;
    // Heuristic: sales / revenue accounts start with '7' or specific codes (701,706), expenses start with '6'
    entries.forEach(e => {
      const code = e.account_code || '';
      if (/^7/.test(code) || ['701','706','707'].includes(code)) {
        revenues += e.credit || 0;
        revenues -= e.debit || 0;
      } else if (/^6/.test(code)) {
        expenses += e.debit || 0;
        expenses -= e.credit || 0;
      }
    });

    // Taxes collected from taxed_transactions in period
    const taxed = await db.taxed_transactions.filter(t => t.transaction_date >= startDate && t.transaction_date <= endDate).toArray();
    const taxes = taxed.reduce((s, t) => s + (t.tax_amount || 0), 0);

    const net = Math.round((revenues - expenses - taxes) * 100) / 100;
    return { revenues: Math.round(revenues * 100) / 100, expenses: Math.round(expenses * 100) / 100, taxes: Math.round(taxes * 100) / 100, net };
  } catch (err) {
    console.error('Erreur calcul compte de résultat:', err);
    return { revenues: 0, expenses: 0, taxes: 0, net: 0 };
  }
};

// Dynamic P&L that aggregates sales (products + services) and fees/commissions,
// applies active tax configurations to sales, and computes shareholder distributions.
export const getDynamicProfitAndLoss = async (startDate: string, endDate: string): Promise<{
  revenuesProducts: number;
  revenuesServices: number;
  feesAndCommissions: number;
  totalRevenues: number;
  expenses: number;
  taxes: number;
  netBeforeTaxes: number;
  netAfterTaxes: number;
  dividendsDistributed: number;
  shareholderAllocations: Array<{ name: string; percentage: number; amount: number }>;
}> => {
  try {
    // 1) Aggregate journal entries for revenue/fees/expenses
    const entries = await getJournalEntriesByDate(startDate, endDate);
    let revenuesProducts = 0;
    let revenuesServices = 0;
    let feesAndCommissions = 0;
    let expenses = 0;

    entries.forEach(e => {
      const code = e.account_code || '';
      // Products sales (701)
      if (code === '701') {
        revenuesProducts += (e.credit || 0) - (e.debit || 0);
      }
      // Services and general 7xx accounts
      if (code === '706') {
        const desc = (e.description || '').toString().toLowerCase();
        // heuristics: if description contains 'frais' or 'commission' treat as fee
        if (/frais|commission|honoraires|frais paiement/.test(desc)) {
          feesAndCommissions += (e.credit || 0) - (e.debit || 0);
        } else {
          revenuesServices += (e.credit || 0) - (e.debit || 0);
        }
      }
      if (code === '707') {
        feesAndCommissions += (e.credit || 0) - (e.debit || 0);
      }

      // expenses: accounts starting with 6
      if (/^6/.test(code)) {
        expenses += (e.debit || 0) - (e.credit || 0);
      }
    });

    // 2) Compute taxes collected (TCA) from the Fiscalité module (taxed_transactions)
    let taxes = 0;
    try {
      const taxedTx = await getTaxedTransactionsByDate(startDate, endDate);
      taxes = taxedTx.reduce((s, t) => s + (t.tax_amount || 0), 0);
    } catch (e) {
      console.warn('Erreur récupération taxes collectées:', e);
      taxes = 0;
    }

    const totalRevenues = Math.round((revenuesProducts + revenuesServices + feesAndCommissions) * 100) / 100;
    // Compute amortization for assets up to endDate (simulated, not persisted) using days-based formula
    const assets: Product[] = await db.products.filter(p => (p as any).is_asset === true).toArray();
    let amortizationTotal = 0;
    for (const a of assets) {
      const purchase = a.purchase_price || 0;
      const lifeMonths = a.life_months || 0;
      if (!a.purchase_date || !purchase || !lifeMonths) continue;
      const lifeDays = Math.max(1, Math.round((lifeMonths / 12) * 365));
      const daysElapsed = daysBetween(a.purchase_date, endDate + 'T23:59:59');
      const daysToCharge = Math.min(daysElapsed, lifeDays);
      const dailyAmount = (purchase / lifeDays);
      const amortForAsset = Math.round(dailyAmount * daysToCharge * 100) / 100;
      amortizationTotal += Math.min(amortForAsset, purchase);
    }

    // Add amortization to expenses but do not persist amortization entries
    const expensesWithAmort = expenses + amortizationTotal;

    // Compute CMV (Coût des Marchandises Vendues)
    // Prefer scanning Journal entries marked as 'COGS' or 'Déstockage' in description
    let cmvFromJournal = 0;
    try {
      entries.forEach(e => {
        const desc = (e.description || '').toString().toLowerCase();
        if (desc.includes('cogs') || desc.includes('déstock') || desc.includes('destock') || desc.includes('déstockage')) {
          // Sum the debit side of COGS entries (expense side)
          cmvFromJournal += (e.debit || 0);
        }
      });
    } catch (e) { console.warn('Erreur scan journal pour CMV:', e); }

    // Fallback: compute CMV from sales * product cost_price when journal markers are not present
    let cmvFromSales = 0;
    try {
      const salesRows: Sale[] = await db.sales.filter(s => s.sale_date >= startDate && s.sale_date <= endDate).toArray();
      if (salesRows.length > 0) {
        const productIds = Array.from(new Set(salesRows.map(s => s.product_id).filter(Boolean)));
        const prods = await db.products.bulkGet(productIds as any);
        const prodMap: Record<string, Product | undefined> = {};
        for (const p of prods) if (p) prodMap[p.id] = p;
        for (const s of salesRows) {
          const prod = prodMap[s.product_id as string];
          const cost = prod ? (prod.cost_price || prod.purchase_price || 0) : 0;
          cmvFromSales += Math.round((cost * (s.quantity || 0)) * 100) / 100;
        }
      }
    } catch (e) { console.warn('Erreur calcul CMV par ventes:', e); }

    const cmvTotal = Math.round(((cmvFromJournal || cmvFromSales) || 0) * 100) / 100;

    const netBeforeTaxes = Math.round((totalRevenues - expensesWithAmort - cmvTotal) * 100) / 100;

    // Income tax calculation: use configured rate from settings (percent)
    let INCOME_TAX_RATE = 0.30;
    try {
      const s = getSettings();
      const rate = Number(s?.income_tax_rate ?? 30);
      INCOME_TAX_RATE = isNaN(rate) ? 0.30 : (rate / 100);
    } catch (e) {
      INCOME_TAX_RATE = 0.30;
    }
    const incomeTax = Math.round(Math.max(0, netBeforeTaxes) * INCOME_TAX_RATE * 100) / 100;

    // Net after taxes = NetBeforeTaxes - (TCA collected) - (Income tax)
    const netAfterTaxes = Math.round((netBeforeTaxes - taxes - incomeTax) * 100) / 100;

    // 3) Shareholder allocation (for SA/SARL-like companies) based on settings/shareholders
    const shareholders = await getShareholders();
    // Compute dynamic dividends per shareholder as NetAfterTaxes * shareholder% (preview only)
    let dividendsDistributed = 0;
    const shareholderAllocations: Array<{ name: string; percentage: number; amount: number }> = [];
    const companyType = (await getCompanyProfile())?.company_type || '';
    const isSocial = ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType || '');
    if (!isSocial && shareholders.length > 0) {
      for (const sh of shareholders) {
        const amount = Math.round((netAfterTaxes * ((sh.percentage || 0) / 100)) * 100) / 100;
        shareholderAllocations.push({ name: sh.name, percentage: sh.percentage, amount });
        dividendsDistributed += amount;
      }
      dividendsDistributed = Math.round(dividendsDistributed * 100) / 100;
    }

    // Expose computed incomeTax and taxes collected as part of the result for UI

    return {
      revenuesProducts: Math.round(revenuesProducts * 100) / 100,
      revenuesServices: Math.round(revenuesServices * 100) / 100,
      feesAndCommissions: Math.round(feesAndCommissions * 100) / 100,
      totalRevenues,
      expenses: Math.round(expensesWithAmort * 100) / 100,
      amortization: Math.round(amortizationTotal * 100) / 100,
      cmv: Math.round((cmvTotal || 0) * 100) / 100,
      taxes: Math.round(taxes * 100) / 100,
      incomeTax: Math.round((incomeTax || 0) * 100) / 100,
      netBeforeTaxes,
      netAfterTaxes,
      dividendsDistributed: Math.round(dividendsDistributed * 100) / 100,
      shareholderAllocations,
    };
  } catch (err) {
    console.error('Erreur calcul dynamique compte de résultat:', err);
    return { revenuesProducts: 0, revenuesServices: 0, feesAndCommissions: 0, totalRevenues: 0, expenses: 0, taxes: 0, netBeforeTaxes: 0, netAfterTaxes: 0, dividendsDistributed: 0, shareholderAllocations: [] };
  }
};

// Balance Sheet as of a date: aggregate trial balance up to that date into Assets and Liabilities
export const getBalanceSheet = async (asOfDate: string): Promise<{ assets: number; liabilities: number; equity: number; breakdown: { [key: string]: number } }> => {
  try {
    // Get entries up to date (inclusive)
    const rows: StoredAccountingEntry[] = await db.accounting_entries.where('journal_date').belowOrEqual(asOfDate).toArray();
    const map: Record<string, number> = {};
    for (const r of rows) {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { account_code?: string; debit?: number; credit?: number } : null;
      const code = payload?.account_code || r.account_code || 'UNKNOWN';
      const debit = payload?.debit ?? r.debit ?? 0;
      const credit = payload?.credit ?? r.credit ?? 0;
      if (!map[code]) map[code] = 0;
      map[code] += (debit - credit);
    }

    // Classify account balances into assets, liabilities, equity (positive values)
    let assets = 0; let liabilities = 0; let equity = 0;
    const breakdown: Record<string, number> = {};
    for (const [code, balance] of Object.entries(map)) {
      breakdown[code] = Math.round(balance * 100) / 100;
      // Asset accounts: debit balances
      if (/^1/.test(code) || ['5311','5120','31','7010','311','312','313'].includes(code)) {
        assets += Math.max(0, balance);
      } else if (/^4/.test(code) || ['4457','4010','4110'].includes(code)) {
        // Liability accounts: credits (negative net in debit-credit), take positive
        liabilities += Math.max(0, -balance);
      } else {
        // Treat other accounts (capital, reserves) as equity-like (credit balances)
        equity += Math.max(0, -balance);
      }
    }

    // Compute assets from product immobilisations and amortization (days-based)
    const assetsList: Product[] = await db.products.filter(p => (p as any).is_asset === true).toArray();
    let amortizationTotal = 0;
    let assetsGross = 0;
    const assetsItems: Array<{ name: string; gross: number; amort: number; net: number }> = [];
    for (const a of assetsList) {
      const purchase = a.purchase_price || 0;
      assetsGross += purchase;
      let amort = 0;
      if (a.purchase_date && a.life_months && purchase > 0) {
        const lifeMonths = a.life_months || 0;
        const lifeDays = Math.max(1, Math.round((lifeMonths / 12) * 365));
        const daysElapsed = daysBetween(a.purchase_date, asOfDate);
        const daysToCharge = Math.min(daysElapsed, lifeDays);
        const daily = (purchase / lifeDays);
        amort = Math.round(Math.min(purchase, daily * daysToCharge) * 100) / 100;
      }
      amortizationTotal += amort;
      assetsItems.push({ name: a.name, gross: Math.round(purchase * 100) / 100, amort, net: Math.round((purchase - amort) * 100) / 100 });
    }

    // Combine journal asset balances and product net book values
    const assetsNetFromProducts = Math.round((assetsGross - amortizationTotal) * 100) / 100;
    const finalAssets = Math.round((Math.max(0, assets) + assetsNetFromProducts) * 100) / 100;
    const finalLiabilities = Math.round(liabilities * 100) / 100;

    // Explicitly extract Passif from Fournisseurs (401*) as credits - debits
    let passif401 = 0;
    for (const [code, balance] of Object.entries(map)) {
      if (/^401/.test(code)) {
        passif401 += Math.max(0, -balance);
      }
    }

    // Ensure passif401 contributes to overall liabilities (avoid double counting if already included)
    // If passif401 is greater than current recorded liabilities for 4xx, add the difference
    // (Most of the time it's already included via the liabilities loop above)
    // We'll keep liabilities as aggregated but ensure passif401 is visible in breakdown

    // Compute Capitaux Propres = Apports (capital accounts) + BNR (retained earnings) + Résultat Net (P&L)
    let apports = 0;
    for (const [code, balance] of Object.entries(map)) {
      // Capital / apports typically on accounts starting with 10 (e.g., 101)
      if (/^10/.test(code)) {
        apports += Math.max(0, -balance);
      }
    }

    // If settings declare an initial capital but no corresponding accounting entry exists,
    // ensure the initial capital appears in the apports total so the balance sheet balances.
    try {
      const settings = getSettings();
      const initialCapital = Number(settings?.initial_capital || 0);
      if (initialCapital > 0) {
        apports = Math.max(apports, initialCapital);
      }
    } catch (err) {
      // ignore settings read errors
    }

    // BNR: use retained earnings computation up to asOfDate
    const bnrObj = await getRetainedEarnings('1970-01-01', asOfDate);
    const bnr = bnrObj.closing || 0;

    // Résultat Net: compute P&L for the current calendar year up to asOfDate
    const asDate = new Date(asOfDate);
    const yearStart = new Date(asDate.getFullYear(), 0, 1).toISOString().slice(0,10);
    const resultPnl = await getDynamicProfitAndLoss(yearStart, asOfDate.slice(0,10));
    const resultNet = Number.isFinite(resultPnl.netAfterTaxes) ? resultPnl.netAfterTaxes : 0;

    const computedEquity = Math.round((apports + (bnr || 0) + resultNet) * 100) / 100;

    // Compute income tax provision (non-persistent) for display in Bilan
    const provision444 = Number.isFinite(resultPnl.incomeTax) ? resultPnl.incomeTax : 0;
    const liabilitiesWithProvision = Math.round((finalLiabilities + provision444) * 100) / 100;

    // Validation: check accounting identity Actif = Passif + Capitaux (without simulated provision)
    const discrepancy = Math.round((finalAssets - (finalLiabilities + computedEquity)) * 100) / 100;
    const balanced = Math.abs(discrepancy) < 0.01;
    // Also compute identity if we include the simulated provision (for informational purposes)
    const discrepancyWithProvision = Math.round((finalAssets - (liabilitiesWithProvision + computedEquity)) * 100) / 100;
    const balancedWithProvision = Math.abs(discrepancyWithProvision) < 0.01;

    return {
      assets: finalAssets,
      liabilities: finalLiabilities,
      equity: computedEquity,
      breakdown,
      assetsGross: Math.round(assetsGross * 100) / 100,
      assetsAmortization: Math.round(amortizationTotal * 100) / 100,
      assetsItems,
      passif401: Math.round(passif401 * 100) / 100,
      apports: Math.round(apports * 100) / 100,
      bnr: Math.round(bnr * 100) / 100,
      resultNet: Math.round(resultNet * 100) / 100,
      balanced,
      discrepancy,
      provision444: Math.round(provision444 * 100) / 100,
      liabilitiesWithProvision,
      balancedWithProvision,
      discrepancyWithProvision,
    };
  } catch (err) {
    console.error('Erreur génération bilan:', err);
    return { assets: 0, liabilities: 0, equity: 0, breakdown: {} };
  }
};

// Retained earnings (Bénéfices non répartis) calculation over time
export const getRetainedEarnings = async (fromDate: string, toDate: string): Promise<{ opening: number; netIncome: number; dividends: number; closing: number }> => {
  try {
    // Opening: sum of equity accounts up to fromDate-1
    const openingRows: StoredAccountingEntry[] = await db.accounting_entries.where('journal_date').below(fromDate).toArray();
    let opening = 0;
    for (const r of openingRows) {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { account_code?: string; debit?: number; credit?: number } : null;
      const code = payload?.account_code || r.account_code || '';
      if (/^1/.test(code) || /^3/.test(code) || /^2/.test(code)) continue; // skip asset/stock/liab
      // treat retained earnings as part of equity totals
      if (/^10|^101|^11/.test(code) || ['310','320'].includes(code)) {
        opening += (payload?.debit ?? r.debit ?? 0) - (payload?.credit ?? r.credit ?? 0);
      }
    }

    const pnl = await getProfitAndLoss(fromDate, toDate);
    // Dividends: look for transactions that reference 'dividende' in description
    const periodRows: StoredAccountingEntry[] = await db.accounting_entries.where('journal_date').between(fromDate, toDate, true, true).toArray();
    let dividends = 0;
    for (const r of periodRows) {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { description?: string; debit?: number; credit?: number } : null;
      const desc = (payload?.description || r.description || '').toString().toLowerCase();
      if (desc.includes('divid') || desc.includes('partage')) {
        dividends += (payload?.debit ?? r.debit ?? 0) + (payload?.credit ?? r.credit ?? 0);
      }
    }

    const closing = Math.round((opening + pnl.net - dividends) * 100) / 100;
    return { opening: Math.round(opening * 100) / 100, netIncome: pnl.net, dividends: Math.round(dividends * 100) / 100, closing };
  } catch (err) {
    console.error('Erreur calcul BMR:', err);
    return { opening: 0, netIncome: 0, dividends: 0, closing: 0 };
  }
};

// Pay dividends: create accounting entries to pay from cash (5311) and debit BNR (119)
export const payDividends = async (amount: number, payDate?: string): Promise<void> => {
  try {
    const journalDate = payDate ? payDate : new Date().toISOString().slice(0,10);
    const entries = [
      { journal_date: journalDate, transaction_type: 'dividend_payment', account_code: '119', account_name: 'Bénéfices non répartis', debit: amount, credit: 0, description: `Paiement dividendes` },
      { journal_date: journalDate, transaction_type: 'dividend_payment', account_code: '5311', account_name: 'Caisse', debit: 0, credit: amount, description: `Paiement dividendes` },
    ];
    await createAccountingTransaction(entries as any);
    try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ledger-updated')); window.dispatchEvent(new CustomEvent('financials-updated')); } } catch (e) {}
  } catch (err) {
    console.error('Erreur paiement dividendes:', err);
    throw err;
  }
};

// Transfer undistributed profit to BNR (create closing entry): Debit 121 (Résultat net) / Credit 119 (BNR)
export const transferUndistributedToBNR = async (startDate: string, endDate: string, transferDate?: string): Promise<{ transferred: number }> => {
  try {
    const pnl = await getDynamicProfitAndLoss(startDate, endDate);
    const totalDividends = (pnl.dividendsDistributed || 0);
    const undistributed = Math.round(Math.max(0, (pnl.netAfterTaxes || 0) - totalDividends) * 100) / 100;
    if (undistributed <= 0) return { transferred: 0 };
    const journalDate = transferDate ? transferDate : new Date().toISOString().slice(0,10);
    const entries = [
      { journal_date: journalDate, transaction_type: 'close_results', account_code: '121', account_name: 'Résultat net de l\'exercice', debit: undistributed, credit: 0, description: 'Affectation résultat non distribué → BNR' },
      { journal_date: journalDate, transaction_type: 'close_results', account_code: '119', account_name: 'Bénéfices non répartis', debit: 0, credit: undistributed, description: 'Affectation résultat non distribué → BNR' },
    ];
    await createAccountingTransaction(entries as any);
    try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ledger-updated')); window.dispatchEvent(new CustomEvent('financials-updated')); } } catch (e) {}
    return { transferred: undistributed };
  } catch (err) {
    console.error('Erreur affectation BNR:', err);
    throw err;
  }
};

export const getJournalEntriesByDate = async (startDate: string, endDate: string): Promise<AccountingEntry[]> => {
  try {
    // Normalize date bounds to include full days when inputs are date-only (YYYY-MM-DD)
    const normalizeStart = (d: string) => d.length === 10 ? `${d}T00:00:00` : d;
    const normalizeEnd = (d: string) => d.length === 10 ? `${d}T23:59:59` : d;
    const lower = normalizeStart(startDate);
    const upper = normalizeEnd(endDate);

    // Use indexed range by journal_date when possible, fallback to full scan if needed
    let rows: StoredAccountingEntry[] = [];
    try {
      rows = await db.accounting_entries
        .where('journal_date')
        .between(lower, upper, true, true)
        .toArray();
    } catch (err) {
      // If index-based range fails for any reason, fallback to full table scan
      console.warn('Range query failed, falling back to full scan for journal entries:', err);
      const all = await db.accounting_entries.toArray();
      rows = all.filter(r => {
        const jd = r.journal_date || '';
        return jd >= lower && jd <= upper;
      });
    }
    // decrypt payloads
    return rows.map(r => {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { transaction_id?: string; account_code?: string; account_name?: string; debit?: number; credit?: number; description?: string } : null;
      return {
        id: r.id,
        journal_date: r.journal_date,
        transaction_type: r.transaction_type,
        transaction_id: payload?.transaction_id || r.transaction_id,
        account_code: payload?.account_code || r.account_code,
        account_name: payload?.account_name || r.account_name,
        debit: payload?.debit ?? r.debit ?? 0,
        credit: payload?.credit ?? r.credit ?? 0,
        description: payload?.description || r.description,
        created_at: r.created_at,
      } as AccountingEntry;
    });
  } catch (err) {
    console.error('Erreur récupération journal:', err);
    return [];
  }
};

export const getLedgerByAccount = async (accountCode: string): Promise<AccountingEntry[]> => {
  try {
    const rows: StoredAccountingEntry[] = await db.accounting_entries.toArray();
    const out: AccountingEntry[] = [];
    for (const r of rows) {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { account_code?: string; account_name?: string; debit?: number; credit?: number; transaction_id?: string; description?: string } : null;
      const code = payload?.account_code || r.account_code;
      if (code === accountCode) {
        out.push({
          id: r.id,
          journal_date: r.journal_date,
          transaction_type: r.transaction_type,
          transaction_id: payload?.transaction_id || r.transaction_id,
          account_code: code,
          account_name: payload?.account_name || r.account_name,
          debit: payload?.debit ?? r.debit ?? 0,
          credit: payload?.credit ?? r.credit ?? 0,
          description: payload?.description || r.description,
          created_at: r.created_at,
        });
      }
    }
    return out;
  } catch (err) {
    console.error('Erreur récupération grand livre:', err);
    return [];
  }
};

export const getTrialBalance = async (): Promise<Array<{ account_code: string; account_name: string; debit: number; credit: number }>> => {
  try {
    const rows: StoredAccountingEntry[] = await db.accounting_entries.toArray();
    const map: Record<string, { account_name: string; debit: number; credit: number }> = {};
    for (const r of rows) {
      const payload = r.encrypted_payload ? decryptObject(r.encrypted_payload) as { account_code?: string; account_name?: string; debit?: number; credit?: number } : null;
      const code = payload?.account_code || r.account_code || 'UNKNOWN';
      const name = payload?.account_name || r.account_name || '';
      const debit = payload?.debit ?? r.debit ?? 0;
      const credit = payload?.credit ?? r.credit ?? 0;
      if (!map[code]) map[code] = { account_name: name, debit: 0, credit: 0 };
      map[code].debit += debit;
      map[code].credit += credit;
    }
    return Object.entries(map).map(([code, v]) => ({ account_code: code, account_name: v.account_name, debit: v.debit, credit: v.credit }));
  } catch (err) {
    console.error('Erreur génération balance de vérification:', err);
    return [];
  }
};

export const getCashFlow = async (startDate: string, endDate: string): Promise<{ inflow: number; outflow: number }> => {
  try {
    const entries = await getJournalEntriesByDate(startDate, endDate);
    // Focus on movements for Caisse Centrale (5311) and Argent Numérique (517)
    const CASH_CODE = '5311';
    const DIGITAL_CODE = '517';
    let inflow = 0;
    let outflow = 0;
    entries.forEach(e => {
      if (e.account_code === CASH_CODE || e.account_code === DIGITAL_CODE) {
        // debit increases the account, credit decreases
        inflow += e.debit || 0;
        outflow += e.credit || 0;
      }
    });
    return { inflow: Math.round(inflow * 100) / 100, outflow: Math.round(outflow * 100) / 100 };
  } catch (err) {
    console.error('Erreur calcul flux trésorerie:', err);
    return { inflow: 0, outflow: 0 };
  }
};

// Expose decrypt helper for other modules (PDF generation, exports)
export const decryptData = decryptObject;

// ============ SUPPLIER MANAGEMENT ============
interface Supplier {
  id?: string;
  name: string;
  amount_owed: number;
  due_date: string;
  status: 'active' | 'settled';
  created_at?: string;
  updated_at?: string;
}

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const active = getActiveEntity();
    const suppliers = await db.suppliers.filter(s => (s as any).entity_type === active).toArray();
    return suppliers;
  } catch (err) {
    console.error('Erreur récupération fournisseurs:', err);
    return [];
  }
};

export const addSupplier = async (supplier: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
  try {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.suppliers.add({
      id,
      ...supplier,
      entity_type: getActiveEntity(),
      created_at: now,
      updated_at: now,
    });
    return id;
  } catch (err) {
    console.error('Erreur ajout fournisseur:', err);
    throw err;
  }
};

export const updateSupplier = async (id: string, updates: Partial<Supplier>): Promise<void> => {
  try {
    const now = new Date().toISOString();
    await db.suppliers.update(id, {
      ...updates,
      updated_at: now,
    });
  } catch (err) {
    console.error('Erreur mise à jour fournisseur:', err);
    throw err;
  }
};

export const deleteSupplier = async (id: string): Promise<void> => {
  try {
    await db.suppliers.delete(id);
  } catch (err) {
    console.error('Erreur suppression fournisseur:', err);
    throw err;
  }
};

// Clear transactional data but preserve configuration (accounts, settings, company profile)
export const clearAllTransactions = async (): Promise<void> => {
  try {
    // Clear main transactional tables
    await Promise.all([
      db.sales.clear(),
      db.transfers.clear(),
      db.operations.clear(),
      db.accounting_entries.clear(),
      db.tiers.clear(),
      db.suppliers.clear(),
      db.taxed_transactions.clear(),
    ]);

    // notify UI that ledger/financials changed
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ledger-updated'));
        window.dispatchEvent(new CustomEvent('financials-updated'));
      }
    } catch (e) {
      console.debug('dispatch ledger-updated failed', e);
    }
  } catch (err) {
    console.error('Erreur clearAllTransactions:', err);
    throw err;
  }
};

// Full factory reset: clear almost all user data including products, taxes, balances and settings.
// WARNING: This is irreversible. Caller must confirm with the user.
export const factoryReset = async (): Promise<void> => {
  try {
    // Clear localStorage first (user requested technique)
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('localStorage.clear() failed during factoryReset', e);
    }

    // Clear all relevant DB tables
    await Promise.all([
      db.sales.clear(),
      db.transfers.clear(),
      db.operations.clear(),
      db.accounting_entries.clear(),
      db.tiers.clear(),
      db.suppliers.clear(),
      db.taxed_transactions.clear(),
      db.products.clear(),
      db.tax_config.clear(),
      db.balances.clear(),
      db.service_configs.clear(),
      db.shareholders.clear(),
    ]);

    // Re-seed minimal chart accounts and default settings so the app can boot sensibly
    try {
      await db.accounts.clear();
      await ensureDefaultChart();
      // reset settings table with defaults
      await db.settings.clear();
      await db.settings.add(getSettings());
    } catch (e) {
      console.warn('Re-seed after factoryReset failed', e);
    }

    // Notify UI to refresh
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ledger-updated'));
        window.dispatchEvent(new CustomEvent('financials-updated'));
      }
    } catch (e) { console.debug('dispatch after factoryReset failed', e); }
  } catch (err) {
    console.error('Erreur factoryReset:', err);
    throw err;
  }
};

const selectedProductDefaultFee = (productRecord?: Product | undefined): number => {
  try {
    if (!productRecord) return 0;
    return typeof productRecord.service_fee_percentage === 'number' ? productRecord.service_fee_percentage : 0;
  } catch (e) {
    return 0;
  }
};

// Pure helper: compute accounting entries for a sale without writing to DB.
export const computeSaleEntries = async (opts: {
  saleId: string;
  productRecord?: Product | undefined;
  productName: string;
  quantity: number;
  unitPrice: number;
  date: string;
  isCredit?: boolean;
  clientName?: string;
  paidAmount?: number;
  paymentMethod?: 'cash' | 'digital';
  paymentService?: TransferType | undefined;
  serviceFeePercent?: number;
  taxConfigs?: Array<{ id?: string; name: string; percentage: number }>;
}): Promise<Array<{
  journal_date: string;
  transaction_type: string;
  transaction_id?: string;
  account_code: string;
  account_name: string;
  debit?: number;
  credit?: number;
  description?: string;
}>> => {
  const { saleId, productRecord, productName, quantity, unitPrice, date, isCredit = false, clientName, paidAmount = 0, paymentMethod = 'cash', paymentService, serviceFeePercent = 0, taxConfigs = [] } = opts;

  const base = Math.round(unitPrice * quantity * 100) / 100;
  const taxes = (taxConfigs || []);
  const taxDetails = taxes.map(t => ({ ...t, amount: Math.round(base * (t.percentage / 100) * 100) / 100 }));
  const taxTotal = taxDetails.reduce((s, t) => s + (t.amount || 0), 0);
  const subtotalWithTax = Math.round((base + taxTotal) * 100) / 100;
  const feePercent = serviceFeePercent || selectedProductDefaultFee(productRecord) || 0;
  const feeAmount = paymentMethod === 'digital' ? Math.round(subtotalWithTax * (feePercent / 100) * 100) / 100 : 0;
  const totalWithTaxAndFee = Math.round((subtotalWithTax + feeAmount) * 100) / 100;

  const entries: Array<any> = [];

  const mapServiceAccount = (service?: TransferType) => {
    switch (service) {
      case 'moncash':
      case 'natcash':
        return { code: '517', name: 'Argent Numérique' };
      case 'zelle':
      case 'western_union':
      case 'moneygram':
      case 'cam_transfert':
        return { code: '5120', name: 'Banque' };
      default:
        return { code: '5311', name: 'Caisse Centrale' };
    }
  };

  const paymentAccount = paymentMethod === 'digital' ? mapServiceAccount(paymentService) : { code: '5311', name: 'Caisse Centrale' };

  const companyType = (await getCompanyProfile())?.company_type || undefined;
  const isService = !!productRecord?.is_service;
  const salesAccountCode = isService ? '706' : '701';
  const salesAccountName = isService ? 'Prestations de services' : (companyType && ['Organisation Non Gouvernementale', 'Fondation', 'Organisation Internationale'].includes(companyType) ? 'Produits de la générosité' : 'Ventes de marchandises');

  if (isCredit) {
    const paidAmountVal = Number.isFinite(paidAmount) ? paidAmount : 0;
    const unpaid = Math.round((totalWithTaxAndFee - paidAmountVal) * 100) / 100;

    if (paidAmountVal > 0) {
      entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: paymentAccount.code, account_name: paymentAccount.name, debit: paidAmountVal, credit: 0, description: `Acompte vente ${productName}` });
    }
    if (unpaid > 0) {
      entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4110', account_name: 'Clients', debit: unpaid, credit: 0, description: `Créance client ${clientName || ''}` });
    }
    entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: salesAccountCode, account_name: salesAccountName, debit: 0, credit: base, description: `Vente HT ${productName}` });
    if (taxTotal > 0) {
      entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4457', account_name: 'TVA à payer', debit: 0, credit: taxTotal, description: `TVA sur vente ${productName}` });
    }
    if (feeAmount > 0) {
      entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '706', account_name: 'Honoraires / Commissions', debit: 0, credit: feeAmount, description: `Frais paiement ${paymentService || ''}` });
    }
  } else {
    // immediate payment
    entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: paymentAccount.code, account_name: paymentAccount.name, debit: totalWithTaxAndFee, credit: 0, description: `Vente ${productName}` });
    entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: salesAccountCode, account_name: salesAccountName, debit: 0, credit: base, description: `Vente HT ${productName}` });
    if (taxTotal > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '4457', account_name: 'TVA à payer', debit: 0, credit: taxTotal, description: `TVA sur vente ${productName}` });
    if (feeAmount > 0) entries.push({ journal_date: date, transaction_type: 'sale', transaction_id: saleId, account_code: '706', account_name: 'Honoraires / Commissions', debit: 0, credit: feeAmount, description: `Frais paiement ${paymentService || ''}` });
  }

  return entries;
};

// NEW: Service configuration management
export const getServiceConfig = async (serviceType: TransferType, customName?: string): Promise<ServiceConfig | undefined> => {
  try {
    const key = customName ? `${serviceType}_${customName}` : serviceType;
    return await db.service_configs.get(key);
  } catch (error) {
    console.error('Erreur récupération config service:', error);
    return undefined;
  }
};

export const setServiceConfig = async (config: Omit<ServiceConfig, 'created_at' | 'updated_at'>): Promise<void> => {
  try {
    const key = config.custom_name ? `${config.transfer_type}_${config.custom_name}` : config.transfer_type;
    const now = new Date().toISOString();
    
    // Check if exists
    const existing = await db.service_configs.get(key);
    if (existing) {
      // Update
      await db.service_configs.update(key, {
        ...config,
        updated_at: now,
      });
    } else {
      // Insert
      await db.service_configs.add({
        id: key,
        ...config,
        created_at: now,
        updated_at: now,
      });
    }
    console.log(`[setServiceConfig] Config saved for ${key}: is_own_service=${config.is_own_service}`);
  } catch (error) {
    console.error('Erreur sauvegarde config service:', error);
    throw error;
  }
};

export const getAllServiceConfigs = async (): Promise<ServiceConfig[]> => {
  try {
    return await db.service_configs.toArray();
  } catch (error) {
    console.error('Erreur récupération configs services:', error);
    return [];
  }
};

export const deleteServiceConfig = async (serviceType: TransferType, customName?: string): Promise<void> => {
  try {
    const key = customName ? `${serviceType}_${customName}` : serviceType;
    await db.service_configs.delete(key);
    console.log(`[deleteServiceConfig] Config deleted for ${key}`);
  } catch (error) {
    console.error('Erreur suppression config service:', error);
  }
};

// NEW: Centralized function for reapprovisionning/balance updates via accounting entries
// This ensures all balance changes are traceable in the journal
export const updateBalanceWithEntry = async (opts: {
  transferType: TransferType;
  customServiceName?: string;
  balanceType: 'cash' | 'digital'; // Which balance to increase
  amount: number;
  sourceAccount: 'apport' | 'virement'; // Apport (101) or Internal Transfer (58)
  description?: string;
}): Promise<void> => {
  const { transferType, customServiceName, balanceType, amount, sourceAccount, description } = opts;
  
  try {
    const today = new Date().toISOString().slice(0, 10);
    const roundedAmount = Math.round(amount * 100) / 100;
    
    if (roundedAmount <= 0) {
      console.warn('[updateBalanceWithEntry] Amount must be positive:', roundedAmount);
      return;
    }

    // Map balance type to debit account
    let debitAccount = '';
    let debitAccountName = '';
    if (balanceType === 'cash') {
      debitAccount = '5311';
      debitAccountName = 'Caisse Centrale';
    } else {
      debitAccount = '517';
      debitAccountName = 'Argent Numérique';
    }

    // Map source to credit account
    let creditAccount = '';
    let creditAccountName = '';
    if (sourceAccount === 'apport') {
      creditAccount = '101';
      creditAccountName = 'Capital/Apport Personnel';
    } else {
      creditAccount = '58';
      creditAccountName = 'Virement Interne';
    }

    // Create accounting entry (balanced: debit = credit)
    const entries = [
      {
        journal_date: today,
        transaction_type: 'reapprovisionning',
        account_code: debitAccount,
        account_name: debitAccountName,
        debit: roundedAmount,
        credit: 0,
        description: description || `Réapprovisionnement ${balanceType === 'cash' ? 'Cash' : 'Digital'} - ${transferType}${customServiceName ? ' (' + customServiceName + ')' : ''}`
      },
      {
        journal_date: today,
        transaction_type: 'reapprovisionning',
        account_code: creditAccount,
        account_name: creditAccountName,
        debit: 0,
        credit: roundedAmount,
        description: `${sourceAccount === 'apport' ? 'Apport' : 'Virement'} pour ${balanceType === 'cash' ? 'Cash' : 'Digital'}`
      }
    ];

    // Record entries
    await createAccountingTransaction(entries);
    console.log(`[updateBalanceWithEntry] Created reapprovisionning entry: ${balanceType}=${roundedAmount} from ${sourceAccount}`);

    // Dispatch events for UI refresh
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ledger-updated'));
        window.dispatchEvent(new CustomEvent('financials-updated'));
      }
    } catch (e) {
      /* ignore */
    }
  } catch (error) {
    console.error('[updateBalanceWithEntry] Error:', error);
    throw error;
  }
};

// Create an accounting entry to zero a balance (cash or digital) for a given transfer type.
export const resetBalanceWithEntry = async (opts: { transferType: TransferType; customServiceName?: string; balanceType: 'cash' | 'digital'; reason?: string }): Promise<void> => {
  const { transferType, customServiceName, balanceType, reason } = opts;
  try {
    // compute current balance
    const computed = await getTypeBalanceFromAccounting(transferType, customServiceName);
    const amount = balanceType === 'cash' ? computed.cash_balance : computed.digital_balance;
    const rounded = Math.round((amount || 0) * 100) / 100;
    if (!rounded || rounded === 0) {
      console.log('[resetBalanceWithEntry] Balance already zero, nothing to do');
      return;
    }

    const today = new Date().toISOString().slice(0,10);
    // debit adjustment to capital (101) and credit the cash/digital account to reduce asset to zero
    const debitAccount = '101';
    const debitAccountName = 'Capital social / Ajustement ouverture';
    const creditAccount = balanceType === 'cash' ? '5311' : '517';
    const creditAccountName = balanceType === 'cash' ? 'Caisse Centrale' : 'Argent Numérique';

    const entries = [
      { journal_date: today, transaction_type: 'ajustement_ouverture', account_code: debitAccount, account_name: debitAccountName, debit: rounded, credit: 0, description: reason || `Ajustement ouverture pour remettre ${creditAccount} à zéro (${transferType})` },
      { journal_date: today, transaction_type: 'ajustement_ouverture', account_code: creditAccount, account_name: creditAccountName, debit: 0, credit: rounded, description: reason || `Remise à zéro solde ${creditAccount} pour ${transferType}` }
    ];

    await createAccountingTransaction(entries);
    try { if (typeof window !== 'undefined') { window.dispatchEvent(new CustomEvent('ledger-updated')); window.dispatchEvent(new CustomEvent('financials-updated')); } } catch(e){}
    console.log(`[resetBalanceWithEntry] Created adjustment entries for ${balanceType}=${rounded}`);
  } catch (err) {
    console.error('[resetBalanceWithEntry] Error:', err);
    throw err;
  }
};

/**
 * Récupère le résumé fiscal pour une période donnée
 * @param year - Année (ex: 2025)
 * @param month - Mois optionnel (ex: 1 pour janvier)
 * @returns Résumé avec totalRevenue, taxAmount, et détails
 */
export const getTaxSummaryByPeriod = async (year: number, month?: number) => {
  try {
    // Calcul des dates de la période
    let startDate: string;
    let endDate: string;
    
    if (month !== undefined && month >= 1 && month <= 12) {
      // Période mensuelle
      const monthStr = String(month).padStart(2, '0');
      startDate = `${year}-${monthStr}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, '0')}`;
    } else {
      // Période annuelle
      startDate = `${year}-01-01`;
      endDate = `${year}-12-31`;
    }
    
    // Récupérer les entrées comptables pour la période
    const entries = await getJournalEntriesByDate(startDate, endDate);
    
    // Calculer les totaux
    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalTaxableIncome = 0;
    const details: Array<{ description: string; amount: number; accountCode: string }> = [];
    
    // Parcourir les écritures pour calculer les revenus et taxes
    for (const entry of entries) {
      // Compte 701 = Ventes de produits
      if (entry.account_code === '701') {
        totalRevenue += entry.credit || 0;
        details.push({ description: `Vente produit`, amount: entry.credit || 0, accountCode: '701' });
      }
      // Compte 706 = Prestations de services (honoraires/commissions)
      if (entry.account_code === '706') {
        totalRevenue += entry.credit || 0;
        details.push({ description: `Prestation de service`, amount: entry.credit || 0, accountCode: '706' });
      }
      // Compte 601 = Achats de marchandises
      if (entry.account_code === '601') {
        totalExpenses += entry.debit || 0;
        details.push({ description: `Achat marchandise`, amount: entry.debit || 0, accountCode: '601' });
      }
      // Compte 607 = Variation de stock
      if (entry.account_code === '607') {
        totalExpenses += entry.debit || 0;
        details.push({ description: `Variation stock`, amount: entry.debit || 0, accountCode: '607' });
      }
    }
    
    // Calcul du revenu imposable
    totalTaxableIncome = totalRevenue - totalExpenses;
    
    // Estimation de la taxe (taux standard: 10% sur le revenu imposable)
    const taxRate = 0.10;
    const estimatedTaxAmount = Math.round(totalTaxableIncome * taxRate * 100) / 100;
    
    return {
      period: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`,
      startDate,
      endDate,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalTaxableIncome: Math.round(totalTaxableIncome * 100) / 100,
      taxAmount: estimatedTaxAmount,
      taxRate: `${taxRate * 100}%`,
      details,
    };
  } catch (error) {
    console.error('[getTaxSummaryByPeriod] Error:', error);
    return {
      period: month ? `${year}-${String(month).padStart(2, '0')}` : `${year}`,
      startDate: '',
      endDate: '',
      totalRevenue: 0,
      totalExpenses: 0,
      totalTaxableIncome: 0,
      taxAmount: 0,
      taxRate: '10%',
      details: [],
    };
  }
};

/**
 * DIAGNOSTIC: Valide la configuration comptable automatique
 * Vérifie que chaque opération crée des écritures équilibrées
 */
export const validateAccountingIntegrity = async (startDate?: string, endDate?: string) => {
  try {
    const from = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const to = endDate || new Date().toISOString().slice(0, 10);
    
    console.log(`[validateAccountingIntegrity] Checking period: ${from} to ${to}`);
    
    // Récupérer toutes les écritures
    const entries = await getJournalEntriesByDate(from, to);
    console.log(`[validateAccountingIntegrity] Total entries: ${entries.length}`);
    
    // Grouper par transaction_id
    const byTxId = new Map<string, typeof entries>();
    entries.forEach(e => {
      const txId = e.transaction_id || 'NO_ID';
      if (!byTxId.has(txId)) byTxId.set(txId, []);
      byTxId.get(txId)!.push(e);
    });
    
    // Valider chaque groupe
    let issues: string[] = [];
    byTxId.forEach((group, txId) => {
      const debits = group.reduce((s, e) => s + (e.debit || 0), 0);
      const credits = group.reduce((s, e) => s + (e.credit || 0), 0);
      const diff = Math.abs(Math.round((debits - credits) * 100) / 100);
      
      if (diff > 0.01) {
        issues.push(`Transaction ${txId}: Débits ${debits} ≠ Crédits ${credits} (diff: ${diff})`);
      }
    });
    
    // Trial Balance
    const trial = await getTrialBalance();
    const trialDebits = trial.reduce((s, acc) => s + acc.debit, 0);
    const trialCredits = trial.reduce((s, acc) => s + acc.credit, 0);
    const trialDiff = Math.abs(Math.round((trialDebits - trialCredits) * 100) / 100);
    
    if (trialDiff > 0.01) {
      issues.push(`Trial Balance: Débits ${trialDebits} ≠ Crédits ${trialCredits} (diff: ${trialDiff})`);
    }
    
    return {
      period: { from, to },
      totalEntries: entries.length,
      totalTransactions: byTxId.size,
      trialBalance: { debits: trialDebits, credits: trialCredits, balanced: trialDiff < 0.01 },
      issues,
      status: issues.length === 0 ? '✅ VALID' : '❌ ISSUES FOUND',
    };
  } catch (error) {
    console.error('[validateAccountingIntegrity] Error:', error);
    return {
      period: { from: startDate || '?', to: endDate || '?' },
      totalEntries: 0,
      totalTransactions: 0,
      trialBalance: { debits: 0, credits: 0, balanced: false },
      issues: [String(error)],
      status: '❌ ERROR',
    };
  }
};

/**
 * DIAGNOSTIC: Récupère les écritures pour une vente spécifique
 */
export const getSaleAccountingEntries = async (saleId: string) => {
  try {
    const entries = await db.accounting_entries.where('transaction_id').equals(saleId).toArray();
    const debits = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const credits = entries.reduce((s, e) => s + (e.credit || 0), 0);
    
    console.log(`[getSaleAccountingEntries] Sale ${saleId}:`, {
      entriesCount: entries.length,
      totalDebits: debits,
      totalCredits: credits,
      balanced: Math.abs(debits - credits) < 0.01,
    });
    
    return { entries, debits, credits, balanced: Math.abs(debits - credits) < 0.01 };
  } catch (error) {
    console.error('[getSaleAccountingEntries] Error:', error);
    return { entries: [], debits: 0, credits: 0, balanced: false };
  }
};

/**
 * DIAGNOSTIC: Récupère les écritures pour une opération spécifique
 */
export const getOperationAccountingEntries = async (operationId: string) => {
  try {
    const entries = await db.accounting_entries.where('transaction_id').equals(operationId).toArray();
    const debits = entries.reduce((s, e) => s + (e.debit || 0), 0);
    const credits = entries.reduce((s, e) => s + (e.credit || 0), 0);
    
    console.log(`[getOperationAccountingEntries] Operation ${operationId}:`, {
      entriesCount: entries.length,
      totalDebits: debits,
      totalCredits: credits,
      balanced: Math.abs(debits - credits) < 0.01,
    });
    
    return { entries, debits, credits, balanced: Math.abs(debits - credits) < 0.01 };
  } catch (error) {
    console.error('[getOperationAccountingEntries] Error:', error);
    return { entries: [], debits: 0, credits: 0, balanced: false };
  }
};

/**
 * DIAGNOSTIC: Compte le nombre d'écritures par type de transaction
 */
export const getAccountingStatistics = async (startDate?: string, endDate?: string) => {
  try {
    const from = startDate || new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const to = endDate || new Date().toISOString().slice(0, 10);
    
    const entries = await getJournalEntriesByDate(from, to);
    
    // Compter par type
    const typeCount = new Map<string, number>();
    entries.forEach(e => {
      const type = e.transaction_type || 'unknown';
      typeCount.set(type, (typeCount.get(type) || 0) + 1);
    });
    
    // Compter par compte
    const accountCount = new Map<string, number>();
    entries.forEach(e => {
      const code = e.account_code || 'unknown';
      accountCount.set(code, (accountCount.get(code) || 0) + 1);
    });
    
    console.log(`[getAccountingStatistics] Statistics for ${from} to ${to}:`, {
      totalEntries: entries.length,
      byType: Object.fromEntries(typeCount),
      byAccount: Object.fromEntries(accountCount),
    });
    
    return {
      period: { from, to },
      totalEntries: entries.length,
      byType: Object.fromEntries(typeCount),
      byAccount: Object.fromEntries(accountCount),
    };
  } catch (error) {
    console.error('[getAccountingStatistics] Error:', error);
    return {
      period: { from: startDate || '?', to: endDate || '?' },
      totalEntries: 0,
      byType: {},
      byAccount: {},
    };
  }
};

