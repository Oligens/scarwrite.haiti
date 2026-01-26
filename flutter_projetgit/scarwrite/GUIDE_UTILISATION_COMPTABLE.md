# 🎓 Guide d'Utilisation - Système Comptable Restructuré

## 🚀 Accès Rapide

### Via le Sidebar (Menu)
1. Ouvrez ScarWrite (http://localhost:8080)
2. Cliquez sur **"Comptabilité"** dans le menu gauche
3. Vous arrivez sur la page **"Système Comptable"**

### URL Directe
```
http://localhost:8080/accounting
```

---

## 📖 Tutoriel Pas à Pas

### Étape 1: Charger les Données d'Exemple

1. **Ouvrez la page Système Comptable**
   - Voir le header: "Système Comptable"
   - Voir la description: "Journal → Grand Livre → États Financiers"

2. **Cliquez le bouton "➕ Données Exemple"**
   - Couleur: Vert (émeraude)
   - Positin: En haut à droite
   - Action: Crée 8 transactions réalistes

3. **Attendez la confirmation**
   - Alert: "✅ Données d'exemple créées!"

---

### Étape 2: Consulter le Journal Général

1. **Cliquez l'onglet "📔 Journal Général"**
   - Couleur: Jaune (sélectionné)

2. **Vous voyez un tableau avec 5 colonnes:**
   ```
   Date     │ Compte │ Libellé (Description) │ Débit  │ Crédit
   ---------|--------|------------------------|--------|--------
   2025-01-20 │ 602  │ Loyer usine           │ 1000   │
   2025-01-20 │ 53   │ Paiement loyer        │        │ 1000
   ```

3. **Points importants:**
   - ✅ Débits en **bleu gras**
   - ✅ Crédits en **rouge gras**
   - ✅ Les cellules vides ne montrent rien (pas "0")
   - ✅ Chaque transaction a sa description

---

### Étape 3: Analyser le Grand Livre

1. **Cliquez l'onglet "📊 Grand Livre (Comptes en T)"**
   - Couleur: Jaune (sélectionné)

2. **Vous voyez des **CARTES** (une par compte)**
   - Exemple: "53 - Caisse"
   - Layout: Grille responsive (2 colonnes sur large écran)

3. **Chaque carte montre le compte en T:**
   ```
   ┌────────────────────────────────┐
   │ 53 - Caisse                    │
   ├──────────────┬─────────────────┤
   │ DÉBITS       │ CRÉDITS         │
   │ (Bleu)       │ (Rouge)         │
   │              │                 │
   │ 10000 (01/20)│ 1000 (01/20)    │
   │  1500 (01/21)│ 2000 (01/22)    │
   │──────────────┼─────────────────│
   │ T: 11500     │ T: 3000         │
   │              │                 │
   └── SOLDE: 8500 (EN OR) ──────────┘
   ```

4. **Points importants:**
   - ✅ Débits **à gauche** (standard comptable)
   - ✅ Crédits **à droite** (standard comptable)
   - ✅ Chaque opération avec **date**
   - ✅ Totaux par colonne (débits/crédits)
   - ✅ **SOLDE EN OR** en bas: Débit - Crédit

---

### Étape 4: Vérifier le Bilan

1. **Cliquez l'onglet "⚖️ Bilan"**
   - Couleur: Jaune (sélectionné)

2. **Vous voyez 2 colonnes côte à côte:**

   **COLONNE GAUCHE - ACTIF (Bleu)**
   ```
   Stocks: 2000
   Caisse: 8500
   Banque: 5000
   ─────────────
   Total: 15500
   ```

   **COLONNE DROITE - PASSIF + CAPITAUX (Rouge)**
   ```
   Dettes
     Fournisseurs: 2000
   
   Capitaux
     Capital social: 10000
   ─────────────────────
   Total: 12000
   ```

3. **Vérification:**
   - ✅ Si ACTIF ≠ PASSIF+CAPITAUX → **Erreur comptable**
   - ✅ Dans l'exemple: 15500 ≠ 12000 → Il y a une erreur!
   - ✅ Il manque 3500 en capitaux propres (bénéfice)

---

### Étape 5: Lire le Compte de Résultat

1. **Cliquez l'onglet "📈 Compte de Résultat"**
   - Couleur: Jaune (sélectionné)

2. **Vous voyez:**

   **SECTION REVENUS (Vert)**
   ```
   Ventes: 15000
   ─────────────
   Total Revenus: 15000
   ```

   **SECTION CHARGES (Rouge)**
   ```
   Achats: 8000
   Loyer: 2000
   ─────────────
   Total Charges: 10000
   ```

   **RÉSULTAT NET (Encadré)**
   ```
   ╔══════════════════════════════╗
   ║ BÉNÉFICE NET: 3500 ✅        ║
   ║ (En vert = profit positif)   ║
   ╚══════════════════════════════╝
   ```

3. **Interprétation:**
   - ✅ Revenus (15000) > Charges (10000) = **Bénéfice**
   - ✅ Le montant: 15000 - 10000 = **3500**

---

## 🔍 Fonctionnalités Avancées

### 📊 Exporter en PDF

**Bouton:** "⬇️ Export PDF"
- Couleur: Bleu
- Position: En haut à droite

**Résultat:** Crée un fichier PDF avec:
1. Journal Général (page 1)
2. Grand Livre - Comptes en T (pages 2+)
3. Tous les comptes listés

---

### ✏️ Ajouter une Nouvelle Opération

**Bouton:** "✏️ Nouvelle Opération"
- Couleur: Or/Jaune
- Position: En haut à droite

**Action:**
1. S'ouvre une dialog modal
2. Remplissez le formulaire (TransactionForm)
3. Cliquez "Enregistrer"
4. La page se **raffraîchit automatiquement**
5. La nouvelle opération apparaît dans le Journal

---

## 🧮 Formules & Calculs

### Pour chaque Compte en T:

```
Solde = Total Débits - Total Crédits
```

**Exemple pour Caisse (53):**
- Total débits: 10000 + 1500 = 11500
- Total crédits: 1000 + 2000 = 3000
- **Solde: 11500 - 3000 = 8500** ✅

### Pour le Bilan:

```
ACTIF = PASSIF + CAPITAUX
15500 ?= 12000 + 3500
15500  = 15500 ✅
```

### Pour le Compte de Résultat:

```
BÉNÉFICE NET = REVENUS - CHARGES
3500 = 15000 - 10000 ✅
```

---

## ❓ Questions Fréquentes

### Q1: Pourquoi il y a 2 colonnes au Grand Livre?

**R:** C'est le format **Comptes en T** standard en comptabilité:
- **Colonne gauche:** Débits (augmente l'actif)
- **Colonne droite:** Crédits (augmente le passif/revenu)

Exemple réel:
```
Caisse 53
  Débit: 10000 (dépôt client)  │  Crédit: 1000 (paiement loyer)
```

---

### Q2: Pourquoi le Bilan n'équilibre pas?

**R:** L'app affiche **TOUTES** les erreurs comptables:
- Si Actif ≠ Passif+Capitaux → Une écriture manque
- Il faut ajouter un journal pour équilibrer

**Solution:** Cliquez "✏️ Nouvelle Opération" pour corriger

---

### Q3: Comment savez-vous que c'est bon?

**R:** 3 validations:
1. ✅ Journal Général: ∑Débits = ∑Crédits (automatique)
2. ✅ Bilan: Actif = Passif + Capitaux
3. ✅ Compte Résultat: Bénéfice Net fait sens

Si les 3 sont vrais → **Comptabilité valide!**

---

### Q4: Qui sont les comptes (601, 602, 707)?

**R:** C'est le système **Caméléon (Haïti):**

| Code | Nom | Type |
|------|-----|------|
| 101 | Capital Social | Capitaux |
| 31 | Stocks | Actif |
| 51 | Banque | Actif |
| 53 | Caisse | Actif |
| 401 | Fournisseurs | Passif |
| 601 | Achats | Charge |
| 602 | Loyer | Charge |
| 707 | Ventes | Revenu |

---

## 🎯 Cas d'Usage

### Cas 1: Gérant de Restaurant

1. Ouvre "Système Comptable"
2. Clique "Données Exemple"
3. Vérifie le Journal Général (toutes ventes enregistrées?)
4. Regarde le Bilan (combien en caisse?)
5. Lit le P&L (ai-je fait du profit ce mois?)

---

### Cas 2: Expert-Comptable

1. Ouvre "Système Comptable"
2. Consulte le Grand Livre (tous les comptes en T)
3. Valide l'équation: Actif = Passif + Capitaux
4. Exporte le PDF pour la déclaration fiscale
5. Vérifie le P&L pour la déclaration de revenus

---

### Cas 3: Banquier (Analyse de Crédit)

1. Ouvre "Système Comptable"
2. Regarde le Bilan (quel est l'actif total?)
3. Calcule le ratio: Actif / Passif
4. Lit le P&L (est-ce rentable?)
5. Décide d'accorder le crédit

---

## 📚 Ressources

- 📄 **[RESTRUCTURE_COMPTABLE.md](RESTRUCTURE_COMPTABLE.md)** - Explication détaillée
- 📄 **[AVANT_VS_APRES.md](AVANT_VS_APRES.md)** - Comparatif visual
- 📄 **[SYNTHESE_COMPTABLE.md](SYNTHESE_COMPTABLE.md)** - Résumé technique
- 💻 **[src/pages/Accounting.tsx](src/pages/Accounting.tsx)** - Code source

---

## ✅ Checklist de Vérification

Avant de déployer, vérifier:

- [ ] Journal Général affiche toutes les transactions
- [ ] Grand Livre montre comptes en T (pas de tableau simple)
- [ ] Débits à gauche, crédits à droite
- [ ] Soldes calculés et en OR (#d4af37)
- [ ] Bilan valide: Actif = Passif + Capitaux
- [ ] P&L affiche revenus vs charges
- [ ] Export PDF fonctionne
- [ ] Nouvelle opération se met à jour
- [ ] 4 onglets nav clairs et logiques
- [ ] Couleurs: Navy/Bleu/Rouge/Or

---

## 🚀 Prochaines Étapes

1. **Tester en production** sur 2-3 utilisateurs
2. **Collecter feedback** sur clarté
3. **Ajouter ratios financiers** (liquidité, etc.)
4. **Budgets vs réels** comparison
5. **Trésorerie** (cash flow)

---

**📖 Guide d'Utilisation - Système Comptable Restructuré**  
**Date: 22 janvier 2026**  
**Version: 1.0 - Stable**
