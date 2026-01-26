# Test Intégration ERP - ScarWrite

## Objectif
Vérifier que l'intégration ERP fonctionne correctement avec synchronisation des balances et création automatique des écritures comptables.

---

## TEST 1: Synchronisation Balances (Tâche 1)

### Setup
1. Ouvrir app dans navigateur (http://localhost:8080)
2. Aller à "Gérer les soldes par type" (ou autre page avec BalanceHeader)
3. Initialiser une balance manuelle: 
   - Service: Zelle
   - Cash: 1000 GDES
   - Digital: 500 GDES
4. Sauvegarder la balance

### Test A: Retrait 300 (Cash → Digital + Fees)
**Étape 1:** Aller à page "Opérations" → Créer un retrait (Retrait)
- Service: Zelle
- Montant: 300
- Type frais: Retrait (fees: 25, commission: 50)
- Cliquer "Enregistrer"

**Vérification:**
- Toast: "Opération enregistrée avec succès"
- DevTools → Application → IndexedDB → ScarWriteDB → operations table
  - Vérifier qu'une nouvelle opération a été créée avec:
    - operation_type: "RETRAIT"
    - amount: 300
    - cash_before: 1000, cash_after: 700
    - digital_before: 500, digital_after: 875 (500 + 300 + 50 fees + 25... wait no)
    - Formule correcte pour RETRAIT: Digital doit augmenter de (montant + frais + commission) = 300 + 25 + 50 = 375
    - Donc digital_after = 500 + 375 = 875 ✓

**Étape 2:** Vérifier la page "Gérer les soldes"
- Recharger la page ou attendre le refresh automatique
- Vérifier affichage:
  - Cash: 700 GDES ✓
  - Digital: 875 GDES ✓

**Étape 3:** Vérifier les écritures comptables
- DevTools → Application → IndexedDB → ScarWriteDB → accounting_entries
- Chercher les 3 entrées pour cette opération:
  1. Débit 517 (Digital) = 375 (montant + frais + commission)
  2. Crédit 5311 (Cash) = 300 (montant)
  3. Crédit 706 (Services/Frais) = 75 (frais + commission)
- Vérifier balance: Débits (375) = Crédits (300 + 75) ✓

---

### Test B: Dépôt 200 (Digital → Cash + Fees)
**Étape 1:** Créer un dépôt
- Service: Zelle
- Montant: 200
- Type dépôt: Standard (fees: 10, commission: 15)

**Vérification opération:**
- cash_before: 700, cash_after: 910 (700 + 200 + 10)
  - Wait, formule pour DÉPÔT: Cash +montant+frais = 700 + 200 + 10 = 910 ✓
- digital_before: 875, digital_after: 660 (875 - 200 - 15)
  - Formule pour DÉPÔT: Digital -montant-commission = 875 - 200 - 15 = 660 ✓

**Vérification écritures:**
- Débit 5311 (Cash) = 210 (montant + frais)
- Crédit 517 (Digital) = 200 (montant)
- Crédit 706 (Services) = 10 (frais) [commission goes where for DEPOSIT?]
- Wait, let me check storage.ts logic for DÉPÔT...

---

## TEST 2: Affichage Fiscalité (Tâche 2)

### Setup
1. Effectuer quelques opérations (dépôts, retraits)
2. Aller à page "Fiscalité"

### Vérification
- Sélecteurs mois/année apparaissent et sont réactifs ✓
- Table "Résumé Mensuel" affiche:
  - Ligne 701 (Ventes): base HT = somme des crédits 701
  - Ligne 706 (Services): base HT = somme des crédits 706
  - Taux: 15% (ou valeur configurée)
  - Montant taxe = base * taux
  - TOTAL TAXABLE = somme des bases
  - TOTAL TAXES = somme des taxes
- Cartes récapitulatives affichent les totaux ✓

### Debug
- DevTools → Console: chercher logs `[BalanceHeader] Loaded computed balance`
- DevTools → Application → IndexedDB → accounting_entries: vérifier données
- DevTools → Network: pas d'appels API externes (offline-first) ✓

---

## TEST 3: Module Ventes - Inventaire (Tâche 3) - À FAIRE
## TEST 4: Module Services - is_own_service (Tâche 4) - À FAIRE
## TEST 5: Enhancements Accounting.tsx (Tâche 5) - À FAIRE
## TEST 6: Export PDF (Tâche 6) - À FAIRE

---

## Checklist Validation Complète

- [ ] Balances affichées correctement après opération
- [ ] accounting_entries crées avec 3 lignes balancées
- [ ] Fiscalité affiche données du journal (701/706)
- [ ] Pas d'erreur console
- [ ] localStorage et accounting_entries en sync
- [ ] Événements financials-updated/ledger-updated se déclenchent
- [ ] Mode hors ligne fonctionne (network disabled)

---

## Notes de Débogage

### Si balances ne se synchronisent pas:
1. Vérifier BalanceHeader useEffect se déclenche (log dans console)
2. Vérifier getTypeBalanceFromAccounting retourne bonne valeur
3. Vérifier accounting_entries contient les bonnes écritures
4. Vérifier que les événements se déclenchent (ajouter log dans addOperation)

### Si écritures ne s'équilibrent pas:
1. Vérifier les formules dans addOperation() pour type d'opération
2. Vérifier que tous les frais et commissions sont comptabilisés
3. Vérifier que montants sont arrondis correctement

### Si Fiscalité n'affiche rien:
1. Vérifier calculateTaxesFromAccounting retourne données non-null
2. Vérifier dates sélectionnées correspondent aux opérations
3. Vérifier que cryptage/décryptage des payloads fonctionne correctement

