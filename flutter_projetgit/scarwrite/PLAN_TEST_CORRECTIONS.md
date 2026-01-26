# 🧪 Plan de Test Complet - Corrections Flux & Visibilité

## Test 1: Logique Trésorerie PDF
**Objectif:** Vérifier que Cash AVANT/APRÈS est calculé correctement

**Étapes:**
1. Aller à Transfers → Reports
2. Créer/Charger des opérations de retrait et dépôt
3. Cliquer "PDF Flux & Trésorerie"
4. Vérifier le PDF:
   - [ ] Cash AVANT = balance initiale avant opération
   - [ ] Retrait: Cash APRÈS = Cash AVANT - Montant
   - [ ] Dépôt: Cash APRÈS = Cash AVANT + Montant + Frais
   - [ ] Texte noir lisible (#000000)
   - [ ] Tableau avec fond blanc/clair

**Critères de succès:**
- ✓ Balances calculées correctement
- ✓ Texte noir sur fond blanc
- ✓ Pas de bouton "PDF Opérations" visible

---

## Test 2: Boutons Visuels
**Objectif:** Vérifier que les boutons sont bien visibles

### Test 2a: Boutons "Ajouter des fonds"
1. Aller à Transfers (avec ZelleAccount ou autre)
2. Regarder les boutons "+" à côté des soldes (Cash + Digital)
3. Vérifier visuellement:
   - [ ] Couleur bleu vif (bg-blue-600)
   - [ ] Blanc sur fond bleu
   - [ ] Hover → Plus foncé (bg-blue-700)
   - [ ] Bouton très visible

### Test 2b: Boutons Retour
1. Aller à Fiscality
   - [ ] Bouton "Retour" avec bordure blanche visible
   - [ ] Icône ArrowLeft
   - [ ] Hover → Transition vers jaune or (border-yellow-400)
2. Aller à Accounting
   - [ ] Bouton "Retour" visible en haut
3. Aller à Transfers → Reports
   - [ ] Bouton "Retour" avec bordure blanche

**Critères de succès:**
- ✓ Tous les boutons Retour visibles
- ✓ Aucun mélange avec l'arrière-plan

---

## Test 3: Tableaux Fiscalité
**Objectif:** Vérifier contraste et lisibilité

1. Aller à Fiscality
2. Sélectionner un mois/année avec données
3. Regarder les tableaux:

### Tableau Résumé Mensuel
- [ ] En-tête gris foncé (bg-slate-700) avec texte blanc
- [ ] Lignes alternées blanc/gris clair
- [ ] Texte NOIR sur tous les fonds
- [ ] Colonnes "Montant Taxe": fond bleu léger (bg-blue-50)
- [ ] Ligne TOTAL: fond doré (bg-gradient-gold)

### Tableau Registre des Taxes  
- [ ] Même contraste que ci-dessus
- [ ] Texte noir lisible partout
- [ ] Bordures visibles (border-slate-200)

### Sélecteurs Mois/Année
- [ ] Labels: Blanc (#FFFFFF)
- [ ] Sélecteurs: Remplissables

**Critères de succès:**
- ✓ Tout le texte est noir ou blanc (lisible)
- ✓ Pas de gris sur gris
- ✓ Tableaux clairs et bien organisés

---

## Test 4: Navigation
**Objectif:** Vérifier que les boutons Retour fonctionnent

1. **Fiscality:**
   - [ ] Cliquer "Retour" → Revenir à Dashboard
2. **Accounting:**
   - [ ] Cliquer "Retour" → Revenir à Dashboard
3. **TransferReports:**
   - [ ] Cliquer "Retour" → Revenir à Transfers

**Critères de succès:**
- ✓ Navigation en arrière fonctionne
- ✓ Pas de page blanche
- ✓ État conservé

---

## Test 5: Suppression Bouton "PDF Opérations"
**Objectif:** Vérifier que seul "PDF Flux & Trésorerie" est visible

1. Aller à Transfers → Reports
2. Vérifier les boutons de téléchargement:
   - [ ] ❌ "PDF Opérations" n'existe plus
   - [ ] ✅ "PDF Flux & Trésorerie" est visible
   - [ ] Bouton doré avec icône Download

**Critères de succès:**
- ✓ Un seul bouton PDF visible
- ✓ Pas de confusion avec ancien format

---

## Test 6: Intégrité Comptable
**Objectif:** Vérifier que les écritures restent équilibrées

1. Créer quelques transactions (Vente, Opération Transfer, Réapprovisionnement)
2. Aller à Accounting
3. Vérifier la Balance de Vérification:
   - [ ] Total Débits = Total Crédits
   - [ ] Aucun message d'erreur "Transaction déséquilibrée"

**Critères de succès:**
- ✓ Comptabilité équilibrée (D=C)
- ✓ Pas d'erreurs d'intégrité

---

## ✅ Checklist Finale

| Test | Statut | Notes |
|------|--------|-------|
| Cash AVANT/APRÈS correct | | |
| Texte PDF noir | | |
| Bouton "+" bleu visible | | |
| Boutons Retour visibles | | |
| Tableaux Fiscalité lisibles | | |
| Labels blancs | | |
| "PDF Opérations" supprimé | | |
| Navigation fonctionne | | |
| Comptabilité équilibrée | | |

---

## 🐛 Signaler les Problèmes

Si vous trouvez des anomalies:

1. **Couleur incorrecte:** Décrire la couleur observée vs attendue
2. **Texte illisible:** Prendre une capture d'écran
3. **Bouton non fonctionnel:** Noter l'URL et l'action
4. **Calcul erroné:** Donner les chiffres observés vs attendus

**Merci pour le test!**

---

**Date:** 26 Janvier 2026  
**Version:** 1.0  
**Statut:** Prêt pour test complet
