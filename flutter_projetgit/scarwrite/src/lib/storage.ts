import { db, initDatabase, executeFinancialTransaction, getLastOperationForService, addTransferWithTransaction } from './database';
import type { Product, Sale, Transfer, TransferType, FinancialOperation, OperationType, Balance, TypeBalance, Settings, CompanyType, CompanyProfile, TaxConfig, TaxedTransaction, Account, AccountingEntry, ThirdParty, ServiceConfig } from './database';
import CryptoJS from 'crypto-js';

// --- INITIALISATION & SEEDING ---

export const seedCammeleonChart = async (): Promise<void> => {
  try {
    const count = await db.accounts.count();
    if (count > 0) return;

    const accountsToSeed = [
      { code: '101', name: 'Capital social', type: 'Passif' },
      { code: '215', name: 'Matériel de boucherie', type: 'Actif' },
      { code: '31', name: 'Stock de marchandises', type: 'Actif' }, // Compte stock général
      { code: '4110', name: 'Clients', type: 'Actif' },
      { code: '4457', name: 'TVA collectée', type: 'Passif' },
      { code: '517', name: 'Argent Numérique (MonCash/NatCash)', type: 'Actif' },
      { code: '5311', name: 'Caisse Centrale', type: 'Actif' },
      { code: '607', name: 'Achats de marchandises (COGS)', type: 'Charge' },
      { code: '701', name: 'Ventes de marchandises', type: 'Produit' },
      { code: '706', name: 'Prestations de services / Commissions', type: 'Produit' },
      // ... (autres comptes existants conservés)
    ];

    const now = new Date().toISOString();
    const toAdd = accountsToSeed.map(a => ({ 
      id: crypto.randomUUID(), 
      code: a.code, 
      name: a.name, 
      type: a.type || '', 
      created_at: now, 
      updated_at: now 
    }));
    await db.accounts.bulkAdd(toAdd);
  } catch (err) {
    console.error('Erreur seed Caméléon chart:', err);
  }
};

initDatabase();
seedCammeleonChart().catch(console.error);

// --- UTILITAIRES DE SÉCURITÉ ---

const DEVICE_ID_KEY = 'scarwrite_device_id';

const getDeviceId = (): string => {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

const deriveKey = (): string => {
  const secret = (import.meta as any).env?.VITE_STORAGE_SECRET || 'fallback-secret';
  const device = getDeviceId();
  return CryptoJS.SHA256(`${secret}::${device}`).toString();
};

export const encryptObject = (obj: any): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(obj), deriveKey()).toString();
};

// --- GESTION DES VENTES & STOCK (CORRIGÉ) ---

/**
 * Ajoute une vente, gère la comptabilité double-entrée 
 * ET automatise le déstockage (COGS).
 */
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
  const basePrice = Math.round(unitPrice * quantity * 100) / 100;
  const saleId = crypto.randomUUID();
  const activeEntity = localStorage.getItem('scarwrite_active_entity') || 'Entreprise Individuelle';

  try {
    // 1. Vérification Anti-Doublon (Idempotence)
    const existing = await db.sales.where('sale_date').equals(date).toArray();
    const isDup = existing.find(s => s.product_id === productId && s.quantity === quantity && Math.abs(s.total - basePrice) < 0.1);
    if (isDup) return isDup.id;

    // 2. Enregistrement de la vente
    await db.sales.add({
      id: saleId,
      product_id: productId,
      product_name: productName,
      quantity,
      unit_price: unitPrice,
      total: basePrice,
      sale_date: date,
      is_credit: isCredit,
      client_name: clientName,
      paid_amount: paidAmount,
      entity_type: activeEntity,
      created_at: new Date().toISOString()
    });

    // 3. Récupération des infos produit pour les taxes et le coût
    const productRecord = await db.products.get(productId);
    const isService = !!productRecord?.is_service;

    // 4. Écritures Comptables de la Vente
    const entries: any[] = [];
    const paymentAcc = paymentMethod === 'digital' 
      ? (['moncash', 'natcash'].includes(paymentService || '') ? {code: '517', name: 'Argent Numérique'} : {code: '5120', name: 'Banque'})
      : {code: '5311', name: 'Caisse Centrale'};

    // Débit (Encaissement ou Créance)
    if (isCredit) {
      if (paidAmount > 0) entries.push({ journal_date: date, account_code: paymentAcc.code, debit: paidAmount, description: `Acompte ${productName}` });
      const due = basePrice - paidAmount;
      if (due > 0) entries.push({ journal_date: date, account_code: '4110', debit: due, description: `Créance ${clientName}` });
    } else {
      entries.push({ journal_date: date, account_code: paymentAcc.code, debit: basePrice, description: `Vente ${productName}` });
    }

    // Crédit (Chiffre d'affaires)
    entries.push({ 
      journal_date: date, 
      account_code: isService ? '706' : '701', 
      credit: basePrice, 
      description: `CA ${productName}` 
    });

    await createAccountingTransaction(entries.map(e => ({...e, transaction_id: saleId, transaction_type: 'sale'})));

    // 5. CORRECTION : GESTION DU STOCK ET COGS (Si produit physique)
    if (productRecord && !isService && productRecord.cost_price > 0) {
      const totalCost = Math.round(productRecord.cost_price * quantity * 100) / 100;
      
      const cogsEntries = [
        { journal_date: date, account_code: '607', debit: totalCost, description: `Coût des ventes - ${productName}` },
        { journal_date: date, account_code: '31', credit: totalCost, description: `Sortie stock - ${productName}` }
      ];

      await createAccountingTransaction(cogsEntries.map(e => ({...e, transaction_id: saleId, transaction_type: 'cogs'})));

      // Mise à jour de la quantité physique
      await db.products.update(productId, {
        quantity_available: Math.max(0, (productRecord.quantity_available || 0) - quantity),
        updated_at: new Date().toISOString()
      });
    }

    return saleId;
  } catch (error) {
    console.error('Erreur addSale:', error);
    throw error;
  }
};

// --- IMMOBILISATIONS (FIXED ASSETS) ---

export const addFixedAsset = async (name: string, price: number, date: string, lifeMonths: number): Promise<void> => {
  const activeEntity = localStorage.getItem('scarwrite_active_entity') || 'Entreprise Individuelle';
  
  try {
    const assetId = crypto.randomUUID();
    await db.products.add({
      id: assetId,
      name,
      cost_price: price,
      is_asset: true,
      purchase_date: date,
      life_months: lifeMonths,
      entity_type: activeEntity,
      is_active: true,
      created_at: new Date().toISOString()
    } as any);

    // Écriture : Débit Immo (215) / Crédit Caisse (5311)
    await createAccountingTransaction([
      { journal_date: date, account_code: '215', debit: price, description: `Achat immo: ${name}`, transaction_type: 'asset_purchase' },
      { journal_date: date, account_code: '5311', credit: price, description: `Paiement immo: ${name}`, transaction_type: 'asset_purchase' }
    ]);
  } catch (err) {
    console.error('Erreur immo:', err);
  }
};

// --- COMPTABILITÉ (COEUR) ---

export const createAccountingTransaction = async (entries: Array<any>): Promise<void> => {
  const now = new Date().toISOString();
  const toSave = entries.map(e => ({
    id: crypto.randomUUID(),
    journal_date: e.journal_date,
    transaction_id: e.transaction_id,
    transaction_type: e.transaction_type,
    account_code: e.account_code,
    debit: e.debit || 0,
    credit: e.credit || 0,
    description: e.description,
    entity_type: localStorage.getItem('scarwrite_active_entity') || 'Entreprise Individuelle',
    created_at: now
  }));

  // Vérification équilibre débit/crédit
  const totalDebit = toSave.reduce((s, x) => s + x.debit, 0);
  const totalCredit = toSave.reduce((s, x) => s + x.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    console.error("Déséquilibre comptable détecté !", {totalDebit, totalCredit});
    return;
  }

  await db.journal.bulkAdd(toSave);
  window.dispatchEvent(new CustomEvent('financials-updated'));
};

// ... (Les autres fonctions getSales, getRevenue etc. restent identiques)
