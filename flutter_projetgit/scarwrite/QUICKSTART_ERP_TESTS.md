# Guide Rapide - Configuration et Tests ERP

## 🚀 Démarrage Rapide

### 1. Serveur de développement
```bash
cd c:\flutter_projetgit\scarwrite
.\RUN.bat
# Accès: http://localhost:8080
```

---

## ⚙️ Configuration Initiale

### Step 1: Initialiser les services
**Page:** Settings ou Admin  
**Action:** Ajouter/configurer les services de transfert

```json
{
  "zelle": {
    "is_own_service": false,  // ← Courtage
    "default_fees_percent": 5,
    "default_commission_percent": 10
  },
  "moncash": {
    "is_own_service": false,  // ← Courtage
    "default_fees_percent": 3,
    "default_commission_percent": 7
  },
  "mon_service": {
    "is_own_service": true,   // ← Service propre
    "default_fees_percent": 0,
    "default_commission_percent": 0
  }
}
```

### Step 2: Initialiser les produits
**Page:** Products  
**Actions:**
- Ajouter produit "Café" (is_service=false)
  - unit_price: 2500 GDES
  - cost_price: 1000 GDES
  - quantity_available: 100
- Ajouter service "Consultation" (is_service=true)
  - unit_price: 5000 GDES
  - cost_price: 0 (services)

### Step 3: Enregistrer balance initiale
**Page:** Gérer les soldes par type  
**Action:** Initialiser pour chaque service
```
Zelle:
  - Cash: 10000 GDES
  - Digital: 5000 GDES
```

---

## 📝 Scénario de Test Complet

### Test A: Vente de produit avec COGS

**Step 1:** Aller à SalesForm  
**Step 2:** Enregistrer vente
```
Product: Café
Quantity: 2
Unit Price: 2500
Total: 5000 GDES
Payment: Cash
```

**Vérifications (DevTools → IndexedDB):**

1. **sales table:**
   - Nouvelle sale créée avec id
   - product_id: "prod_cafe"
   - quantity: 2
   - total: 5000

2. **accounting_entries table:**
   - 2 entrées pour la vente:
     - Débit 5311 (Caisse) = 5000, Crédit 701 (Ventes) = 5000
   - 2 entrées pour le COGS:
     - Débit 607 (COGS) = 2000 (1000*2), Crédit 31 (Stock) = 2000
   - ✓ Validation: Débits (7000) = Crédits (7000)

3. **products table:**
   - products["prod_cafe"].quantity_available: 100 → 98
   - ✓ Stock décrémenté

---

### Test B: Retrait Courtage

**Step 1:** Aller à OperationForm  
**Step 2:** Créer retrait
```
Operation Type: Withdrawal
Service: Zelle (is_own_service=false)
Amount: 300 GDES
Fees: 25 GDES
Commission: 50 GDES
```

**Vérifications:**

1. **operations table:**
   - Nouvelle opération: WITHDRAWAL
   - amount_gdes: 300
   - fees: 25, commission: 50
   - cash_before: 10000 → cash_after: 9700
   - digital_before: 5000 → digital_after: 5375
     - Formule: 5000 + 300 + 25 + 50 = 5375 ✓

2. **accounting_entries table:**
   - 3 entrées:
     - Débit 517 (Digital) = 375 (300+25+50)
     - Crédit 5311 (Caisse) = 300
     - Crédit 706 (Frais) = 75 (25+50)
   - ✓ Balance: Débits (375) = Crédits (375)

3. **BalanceHeader (Gérer les soldes):**
   - Auto-refresh après opération
   - Affiche: Cash=9700, Digital=5375 ✓

---

### Test C: Dépôt Service Propre

**Setup:** D'abord créer service propre dans Settings

**Step 1:** Créer dépôt
```
Operation Type: Deposit
Service: Mon Service (is_own_service=true)
Amount: 500 GDES
Fees: 0
Commission: 0
```

**Vérifications:**

1. **Formule différente (service propre):**
   - Débit 5311 = 500 (amount only, no separate fees)
   - Crédit 706 = 500 (tout au service!)
   - ✓ Pas de 517 (Digital) car service propre

2. **Solde balance:**
   - Cash: 9700 - 500 = 9200 ✓
   - Digital: 5375 (unchanged, car service propre)

---

## 📊 Vérifications Fiscalité

**Page:** Fiscalité  
**Step 1:** Aller à Fiscalité.tsx  
**Step 2:** Sélectionner mois/année des tests

**Table Résumé Mensuel - Devrait afficher:**

```
Compte | Description      | Base HT | Taux  | Montant Taxe
-------|------------------|---------|-------|-------------
701    | Ventes produits  | 5000    | 15%   | 750
706    | Courtage/Services| 825     | 15%   | 123.75
-------|------------------|---------|-------|-------------
TOTAL  |                  | 5825    | 15%   | 873.75
```

**Cartes:**
- Revenu Total Taxable: 5825 GDES
- Taxes Collectées: 873.75 GDES

---

## 🔍 Vérifications Comptabilité

**Page:** Accounting_NEW.tsx

### Trial Balance

**Devrait afficher (après tous les tests):**

```
Code | Compte              | Débits | Crédits | Solde
-----|---------------------|--------|---------|--------
5311 | Caisse Centrale    | 10000  | 800     | 9200
517  | Argent Numérique   | 375    | 0       | 375
607  | COGS               | 2000   | 0       | 2000
31   | Stock              | 0      | 2000    | (2000)
701  | Ventes             | 0      | 5000    | (5000)
706  | Frais/Services     | 0      | 875     | (875)
-----|---------------------|--------|---------|--------
     | TOTAUX             | 12375  | 8675    |
```
✓ Validation: Débits ≈ Crédits (avec ajustements)

### Filtres

**Test:** Appliquer filtres
```
Code Compte: 706
Date: depuis 2025-01-25 à 2025-01-25
Type: operation, sale
```

**Résultat:** Affiche seulement les écritures 706 du 25 janvier, type opération ou vente

---

## 🐛 Debug / Troubleshooting

### Si balances ne se mettent pas à jour:
1. Vérifier DevTools Console pour logs:
   ```
   [BalanceHeader] Loaded computed balance for zelle
   ```
2. Vérifier accounting_entries table contient les entrées
3. Vérifier que l'événement `ledger-updated` est dispatché

### Si Fiscalité n'affiche rien:
1. Vérifier que calculateTaxesFromAccounting() retourne non-null
2. Vérifier les dates sélectionnées correspondent aux opérations
3. Vérifier que tax_config existe dans la base

### Si COGS ne se crée pas:
1. Vérifier que le produit a `is_service=false`
2. Vérifier que `cost_price > 0`
3. Vérifier que `quantity > 0`
4. Vérifier accounting_entries table pour entrées 607/31

---

## 📈 Monitoring

### localStorage
```javascript
// Console DevTools:
localStorage.getItem('balance_zelle')
// Output: {"cash_balance": 9700, "digital_balance": 5375}
```

### IndexedDB
```javascript
// Console DevTools:
const db = (await import('./src/lib/database')).db;

// Vérifier operations
await db.operations.toArray()

// Vérifier accounting_entries
await db.accounting_entries.where('account_code').equals('706').toArray()

// Trial balance
const trial = await db.accounting_entries.toArray();
const balance701 = trial.filter(e => e.account_code === '701').reduce((s,e) => s + (e.credit || 0), 0);
```

---

## 📋 Checklist Validation Complète

- [ ] Vente de produit crée COGS + décrémente stock
- [ ] Retrait courtage débit 517, crédit 5311 + 706
- [ ] Dépôt service propre débit 5311, crédit 706 seulement
- [ ] BalanceHeader affiche balances correctes après opération
- [ ] Fiscalité affiche 701/706 avec taxes
- [ ] Trial Balance équilibrée (débits ≈ crédits)
- [ ] Filtres Accounting.tsx fonctionnent
- [ ] Événements ledger-updated/financials-updated se déclenchent
- [ ] Pas d'erreurs console
- [ ] Mode offline fonctionne (network disabled)

---

## 🔗 Ressources

- **TEST_ERP_INTEGRATION.md**: Guide complet de test
- **IMPLEMENTATION_COMPLETE_ERP.md**: Architecture et fichiers modifiés
- **storage.ts**: Fonctions core (2407 lines)
- **database.ts**: Schéma et migrations
- **Accounting_NEW.tsx**: Interface comptabilité
- **Fiscality.tsx**: Interface fiscalité

