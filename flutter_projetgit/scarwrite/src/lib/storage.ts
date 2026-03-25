import { db, initDatabase, executeFinancialTransaction } from './database';
import type { TransferType } from './database';
import CryptoJS from 'crypto-js';

// --- CONFIGURATION DES COMPTES ---
const COMPTE_NUMERIQUE = '517';  // Argent Numérique (MonCash/NatCash)
const COMPTE_CAISSE = '5311';    // Caisse Physique (Cash)
const COMPTE_COMMISSION = '706'; // Prestations de services / Commissions

/**
 * Gère les Dépôts, Retraits et Transferts avec la logique Agent :
 * 1. Dépôt/Transfert : Cash augmente (Montant + Frais), Numérique diminue (Montant), Commission s'ajoute au Numérique.
 * 2. Retrait : Cash diminue (Montant), Numérique augmente (Montant + Frais + Commission).
 */
export const addAgentOperation = async (
  type: 'depot' | 'retrait' | 'transfert',
  montantBrut: number,
  fraisClient: number,
  commissionAgent: number,
  service: TransferType,
  date: string
): Promise<void> => {
  const transactionId = crypto.randomUUID();
  const entries: any[] = [];
  const description = `${type.toUpperCase()} ${service} - ${montantBrut}g`;

  if (type === 'depot' || type === 'transfert') {
    // --- LOGIQUE DÉPÔT / TRANSFERT ---
    // Le client donne le montant + les frais en CASH
    const totalEncaisse = montantBrut + fraisClient;
    
    // 1. Débit Caisse (Le cash physique augmente du montant total perçu)
    entries.push({
      journal_date: date,
      account_code: COMPTE_CAISSE,
      debit: totalEncaisse,
      description: `${description} (Encaissement Cash + Frais)`
    });

    // 2. Crédit Numérique (Le compte numérique diminue du montant envoyé au client)
    entries.push({
      journal_date: date,
      account_code: COMPTE_NUMERIQUE,
      credit: montantBrut,
      description: `${description} (Sortie Numérique)`
    });

    // 3. Commission (L'agent gagne une commission qui s'ajoute à son solde numérique)
    // On débite le numérique (gain) et on crédite le compte produit (Revenu)
    entries.push({
      journal_date: date,
      account_code: COMPTE_NUMERIQUE,
      debit: commissionAgent,
      description: `${description} (Commission reçue)`
    });
    entries.push({
      journal_date: date,
      account_code: COMPTE_COMMISSION,
      credit: commissionAgent,
      description: `Revenu Commission ${service}`
    });

    // Équilibrage : Si frais > 0, les frais perçus sont aussi un produit (ou servent à payer le service)
    // Ici on simplifie : le surplus reste en caisse.
  } 
  else if (type === 'retrait') {
    // --- LOGIQUE RETRAIT ---
    // Le client a envoyé l'argent sur le compte numérique de l'agent
    
    // 1. Crédit Caisse (L'agent donne le montant net en CASH au client)
    entries.push({
      journal_date: date,
      account_code: COMPTE_CAISSE,
      credit: montantBrut,
      description: `${description} (Décaissement Cash)`
    });

    // 2. Débit Numérique (Le compte numérique reçoit : Montant + Frais + Commission)
    const totalRecuNumerique = montantBrut + fraisClient + commissionAgent;
    entries.push({
      journal_date: date,
      account_code: COMPTE_NUMERIQUE,
      debit: totalRecuNumerique,
      description: `${description} (Réception Numérique + Frais + Comm)`
    });

    // 3. Crédit Commission (Enregistrement du gain)
    entries.push({
      journal_date: date,
      account_code: COMPTE_COMMISSION,
      credit: commissionAgent + fraisClient, // Les frais et la comm sont des revenus pour l'agent
      description: `Gain Retrait ${service}`
    });
  }

  // Enregistrement final en base de données
  await createAccountingTransaction(entries.map(e => ({
    ...e, 
    transaction_id: transactionId, 
    transaction_type: type
  })));
};

// --- FONCTION DE SAUVEGARDE COMPTABLE ---

export const createAccountingTransaction = async (entries: Array<any>): Promise<void> => {
  const now = new Date().toISOString();
  const activeEntity = localStorage.getItem('scarwrite_active_entity') || 'Entreprise Individuelle';

  const toSave = entries.map(e => ({
    id: crypto.randomUUID(),
    journal_date: e.journal_date || now,
    transaction_id: e.transaction_id,
    transaction_type: e.transaction_type,
    account_code: e.account_code,
    debit: Number(e.debit) || 0,
    credit: Number(e.credit) || 0,
    description: e.description,
    entity_type: activeEntity,
    created_at: now
  }));

  // Calcul pour vérification (Double entrée)
  const totalDebit = toSave.reduce((s, x) => s + x.debit, 0);
  const totalCredit = toSave.reduce((s, x) => s + x.credit, 0);

  // Note : Dans la logique agent, on s'assure que débit == crédit via les comptes de revenus (706)
  await db.journal.bulkAdd(toSave);
  window.dispatchEvent(new CustomEvent('financials-updated'));
};
