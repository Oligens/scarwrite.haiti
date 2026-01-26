# Formules Comptables - Module Opérations et Ventes

## 📐 Formules Balance Synchronisation

### Équation Fondamentale (executeFinancialTransaction)

```
FinancialOperation {
  operation_type: RETRAIT | DÉPÔT | TRANSFERT
  amount_gdes: Principal à transférer (GDES)
  fees: Frais (frais de transaction)
  commission: Commission (notre marge)
  
  Result:
    cash_after = cash_before + Δcash
    digital_after = digital_before + Δdigital
}
```

---

## 1️⃣ RETRAIT (Withdrawal)

### Cas: Courtage (is_own_service = false) - DEFAULT

**Contexte:** Client retire du cash, nous gardons le montant en digital + frais

**Balance Changes:**
```
Δcash = -principal
Δdigital = +principal + fees + commission
```

**Formule Comptable (3 entrées équilibrées):**
```
┌─────────────────────────────────────────┐
│ Journal Entry 1: Débits/Crédits        │
├─────────────────────────────────────────┤
│ Débit  517 (Argent Numérique) = P+F+C  │
│ Crédit 5311 (Caisse Centrale) = P      │
│ Crédit 706 (Honoraires)       = F+C    │
├─────────────────────────────────────────┤
│ Balance: Débits (P+F+C) = Crédits (P+F+C) ✓
└─────────────────────────────────────────┘
```

**Exemple:**
```
Retrait 300 GDES, Frais 25, Commission 50:
  Débit  517 = 300 + 25 + 50 = 375
  Crédit 5311 = 300
  Crédit 706 = 25 + 50 = 75
  
  Soldes:
  Cash:    1000 - 300 = 700
  Digital: 500 + 375 = 875
```

### Cas: Service Propre (is_own_service = true)

**Contexte:** Service propriétaire, montant complet versé au service

**Balance Changes:** IDENTIQUES (cash -P, digital +P+F+C)

**Formule Comptable (2 entrées):**
```
┌─────────────────────────────────────────┐
│ Journal Entry 1: Service Propre        │
├─────────────────────────────────────────┤
│ Débit  517 (Argent Numérique) = P+F+C  │
│ Crédit 706 (Prestations)      = P+F+C  │
├─────────────────────────────────────────┤
│ (No 5311 - service prend tout)         │
│ Balance: Débits = Crédits ✓
└─────────────────────────────────────────┘
```

**Différence clé:** Principal va à 706 (service) au lieu de 5311 (caisse)

---

## 2️⃣ DÉPÔT (Deposit)

### Cas: Courtage (is_own_service = false) - DEFAULT

**Contexte:** Client envoie du cash, nous recevons et gardons frais

**Balance Changes:**
```
Δcash = +principal + fees
Δdigital = -principal - commission
```

**Formule Comptable (3 entrées équilibrées):**
```
┌─────────────────────────────────────────┐
│ Journal Entry 1: Débits/Crédits        │
├─────────────────────────────────────────┤
│ Débit  5311 (Caisse Centrale) = P+F    │
│ Crédit 517 (Argent Numérique) = P      │
│ Crédit 706 (Honoraires)       = F+C    │
├─────────────────────────────────────────┤
│ Wait, où est commission débitée?       │
│ Correction: Crédit 706 = F seulement   │
└─────────────────────────────────────────┘
```

**Exemple (Courtage):**
```
Dépôt 200 GDES, Frais 10, Commission 15:
  Débit  5311 = 200 + 10 = 210
  Crédit 517 = 200
  Crédit 706 = 10 + 15 = 25
  
  Soldes:
  Cash:    700 + 210 = 910
  Digital: 875 - 200 - 15 = 660
```

### Cas: Service Propre (is_own_service = true)

**Balance Changes:** IDENTIQUES

**Formule Comptable (2 entrées):**
```
┌─────────────────────────────────────────┐
│ Journal Entry 1: Service Propre        │
├─────────────────────────────────────────┤
│ Débit  5311 (Caisse Centrale) = P+F+C  │
│ Crédit 706 (Prestations)      = P+F+C  │
├─────────────────────────────────────────┤
│ (No 517 - direct to service)           │
└─────────────────────────────────────────┘
```

---

## 3️⃣ TRANSFERT (Transfer)

### Formule Comptable

**IDENTIQUE à DÉPÔT** (client envoie, nous recevons)

```
┌─────────────────────────────────────────┐
│ Journal Entry 1: Courtage              │
├─────────────────────────────────────────┤
│ Débit  5311 (Caisse Centrale) = P+F    │
│ Crédit 517 (Argent Numérique) = P      │
│ Crédit 706 (Honoraires)       = F+C    │
└─────────────────────────────────────────┘
```

---

## 📦 VENTE (Sale)

### Cas A: Vente Comptant - Produit Physique

**Entrées créées: 4 écritures**

```
┌─────────────────────────────────────────┐
│ Entrée 1: Revenu Principal             │
├─────────────────────────────────────────┤
│ Débit  5311/517 (Payment) = Total TTC  │
│ Crédit 701 (Ventes)       = Base HT    │
│ Crédit 4457 (TVA due)     = Base * 15% │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Entrée 2-3: COGS (Cost of Goods Sold)  │
├─────────────────────────────────────────┤
│ Débit  607 (COGS)         = Cost*Qty   │
│ Crédit 31 (Stock)         = Cost*Qty   │
└─────────────────────────────────────────┘
```

**Exemple (Café):**
```
Vente 2x Café à 2500 GDES/unité:
Base HT: 2000 * 2 = 5000
Taxes: 5000 * 15% = 750
Total TTC: 5750

Entrée 1 (Revenu):
  Débit  5311 = 5750
  Crédit 701 = 5000 (Ventes produits)
  Crédit 4457 = 750 (TVA due)

Entrée 2 (COGS):
  Débit  607 = 1000 * 2 = 2000
  Crédit 31 = 2000
  
Inventaire:
  products[cafe].quantity_available: 100 → 98
```

### Cas B: Vente à Crédit

**Structure identique mais:**
- Montant impayé va à compte Clients (4110)
- Acompte enregistré au compte de paiement

```
┌─────────────────────────────────────────┐
│ Acompte (si payé):                     │
│ Débit  5311/517 = Acompte              │
│ Crédit 701 = Acompte proportionnel      │
│                                         │
│ Reste (crédit):                        │
│ Débit  4110 (Clients) = Reste          │
│ Crédit 701 = Reste proportionnel        │
└─────────────────────────────────────────┘
```

### Cas C: Service (is_service = true)

**Compte différent:**
```
Crédit 706 (Prestations) = Base HT
au lieu de
Crédit 701 (Ventes)
```

---

## 🔢 Comptes Utilisés

| Code | Nom | Utilisation |
|------|-----|-------------|
| 5311 | Caisse Centrale | Cash dans la main |
| 517  | Argent Numérique | Digital (Zelle, MonCash, etc.) |
| 5120 | Banque | Bank account balance |
| 701  | Ventes de marchandises | Revenus produits physiques |
| 706  | Honoraires / Commissions / Prestations | Frais de transfert OU services propres |
| 607  | Achats et charges externes | COGS (cost of goods sold) |
| 31   | Stock de marchandises | Inventory |
| 4110 | Clients | Accounts receivable |
| 4457 | TVA/TPS à payer | Tax liability |

---

## ✅ Validation: Débits = Crédits

Pour **chaque opération**, le total des débits doit égaler le total des crédits:

```typescript
const entries = [...];
const totalDebits = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
const totalCredits = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
console.assert(Math.abs(totalDebits - totalCredits) < 0.01, 'Unbalanced!');
```

**Code source:** `createAccountingTransaction()` dans storage.ts valide cela avant insert.

---

## 🎯 Résumé: Quand Utiliser Quel Compte?

### Principal (amount_gdes)
- **Courtage**: 5311 (Caisse) ou 517 (Digital)
- **Service Propre**: 706 (Prestations)

### Frais + Commission
- **Toujours**: 706 (Honoraires)
- **Sauf Service Propre**: Inclus dans 706 principal

### Revenu Vente
- **Produits**: 701
- **Services**: 706

### Inventory
- **Débit COGS**: 607
- **Crédit Stock**: 31

---

## 📝 Notes Importantes

1. **is_own_service = true (Service Propre)**
   - Principal + frais + commission vont TOUS à 706
   - Pas de séparation entre montant et frais
   - Raison: C'est notre service, on facture la totalité

2. **is_own_service = false (Courtage)**
   - Principal va à caisse/digital (passthrough)
   - Frais + commission vont à 706 (notre revenu)
   - Raison: On agit comme intermédiaire

3. **COGS Automatique**
   - Créé automatiquement lors de CHAQUE vente de produit
   - Décrémente l'inventaire en temps réel
   - Raison: Matching principle (expense quand revenue reconnu)

4. **Tax Automatique**
   - Créé automatiquement lors de vente
   - Montant: Base HT × tax_rate%
   - Compte: 4457 (TVA à payer)
   - Raison: Tax liability accrue

