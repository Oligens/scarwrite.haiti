# ✅ GUIDE TEST - Rapport PDF Flux & Trésorerie

## 🚀 Configuration Rapide

### État Actuel
✅ Application en cours d'exécution sur `http://localhost:8080`  
✅ Tous les fichiers compilés sans erreur  
✅ Deux boutons PDF disponibles dans TransferReports  

---

## 📋 Checklist de Test

### Phase 1: Navigation et Interface

- [ ] Accédez à `http://localhost:8080/#/transfers/reports`
- [ ] Vérifiez que la page **Rapports Financiers** se charge
- [ ] Confirmez que **deux boutons** sont visibles:
  - [ ] **"PDF Opérations"** (version actuelle)
  - [ ] **"PDF Flux & Trésorerie"** (NOUVEAU - bouton doré)

### Phase 2: Données de Test (Créer des opérations)

#### Étape 1: Ajouter des opérations
1. Naviguez vers `/transfers`
2. Cliquez sur **"Gérer les soldes par type"**
3. Sélectionnez un service (ex: **MonCash**)
4. Cliquez sur **"Nouveau Dépôt"** ou **"Nouveau Retrait"**
5. Remplissez les champs:
   - Expéditeur: "Client A"
   - Bénéficiaire: "Entreprise X"
   - Montant: 1000 GDES
   - Frais: 50 GDES
   - Commission: 25 GDES
6. Soumettez et observez:
   - [ ] Balance mise à jour
   - [ ] Toast de confirmation
   - [ ] Entrée comptable créée (si applicable)

#### Étape 2: Ajouter 2-3 opérations supplémentaires
- Variation des types (Dépôt, Retrait, Transfert)
- Variation des dates (répartir sur 3-4 jours)
- Variation des montants (500, 1500, 2000 GDES)

### Phase 3: Génération du Rapport Flux & Trésorerie

#### Étape 1: Filtrer les opérations
1. Allez à `/transfers/reports`
2. Dans les filtres:
   - **Service**: Choisissez le même service utilisé (MonCash)
   - **Date début**: Sélectionnez la première date d'opération
   - **Date fin**: Sélectionnez aujourd'hui (ou la dernière date)
3. Vérifiez que les opérations filtrées s'affichent (bas de la page)

#### Étape 2: Cliquez sur "PDF Flux & Trésorerie"
- [ ] Un toast **"PDF Flux & Trésorerie généré"** apparaît
- [ ] Le PDF est téléchargé (ou partagé, selon le navigateur)
- [ ] Pas de message d'erreur en console

#### Étape 3: Ouvrez le PDF généré et vérifiez:

**Structure générale:**
- [ ] Titre: **"Flux & Trésorerie"** avec plages de dates
- [ ] Tableau présent avec données

**Tableau (colonnes):**
- [ ] **N°**: 1, 2, 3... (numérotation séquentielle)
- [ ] **Type**: "Dépôt", "Retrait", ou "Transfert"
- [ ] **Service**: Affiche le bon service (MonCash, etc.)
- [ ] **Expéditeur / Bénéficiaire**: Noms des parties
- [ ] **Montant (GDES/USD)**: Valeur correcte
- [ ] **Cash AVANT**: Solde avant l'opération (progressif)
- [ ] **Cash APRÈS**: Solde après l'opération (progressif)
- [ ] **Flux Cash**: Indicateur + ou - (différence)

**Ordre des lignes:**
- [ ] Les opérations sont triées du **plus ancien au plus récent**
- [ ] La première opération a Cash AVANT = 0 ou la première valeur
- [ ] Chaque ligne Cash AVANT = ligne précédente Cash APRÈS

**Résumé (pied de page):**
- [ ] Section **"Ø=ÜÊ RÉSUMÉ DES FLUX"** visible
- [ ] **Total opérations**: Nombre correct d'opérations
- [ ] **Balance Numérique Actuelle**: Montant actualisé
- [ ] **Total Frais**: Somme correcte des frais
- [ ] **Total Commissions**: Somme correcte des commissions
- [ ] **Balance Cash Actuelle**: Montant final correct

### Phase 4: Vérification Mathématique

#### Test 1: Suivi du Cash
- [ ] Premier Cash APRÈS - Premier Cash AVANT = Premier Flux
- [ ] Deuxième Cash APRÈS - Deuxième Cash AVANT = Deuxième Flux
- [ ] Dernier Cash APRÈS = Balance Cash Actuelle (résumé)

#### Test 2: Totaux
- [ ] Somme des montants d'opérations approximativement correcte
- [ ] Total Frais = Somme de tous les frais
- [ ] Total Commissions = Somme de toutes les commissions

### Phase 5: Test du Bouton Ancien (Comparaison)

1. Cliquez sur **"PDF Opérations"** (ancien rapport)
2. Vérifiez qu'il se génère sans erreur
3. Comparez avec le nouveau rapport:
   - [ ] L'ancien a moins de colonnes
   - [ ] Le nouveau a "Cash AVANT/APRÈS" et "Flux Cash"
   - [ ] Les données de base sont identiques

### Phase 6: Test avec Différents Filtres

#### Test 1: Filtrer par service différent
- [ ] Changez le **Service** (ex: Zelle au lieu de MonCash)
- [ ] Générez le PDF Flux & Trésorerie
- [ ] Vérifiez que le service affiché change

#### Test 2: Plage de dates plus longue
- [ ] Élargissez la plage (2-4 semaines)
- [ ] Vérifiez que plus d'opérations s'affichent
- [ ] Totaux augmentent proportionnellement

#### Test 3: Tous les services (filtrer "Tous les services")
- [ ] Générez le PDF pour tous les services
- [ ] Vérifiez que les opérations de plusieurs services sont présentes
- [ ] Les services s'affichent correctement dans le tableau

### Phase 7: Edge Cases (Optionnel)

- [ ] **Aucune opération**: Cliquez sur PDF avec 0 opérations
  - Attendu: Bouton disabled ou message d'erreur gracieux
- [ ] **Une seule opération**: Générez le PDF avec 1 seule opération
  - Vérifiez que le résumé s'affiche correctement
- [ ] **Très grand nombre d'opérations** (10+):
  - Vérifiez que le PDF reste lisible (pas de dépassement)
  - Vérifiez que la pagination (si nécessaire) fonctionne

---

## 🔍 Diagnostic en Cas d'Erreur

### Erreur: "Bouton PDF Flux & Trésorerie absent"
- [ ] Vérifiez que vous êtes sur `/transfers/reports`
- [ ] Vérifiez que la page s'est rechargée (F5)
- [ ] Vérifiez la console du navigateur (F12 → Console) pour les erreurs

### Erreur: "PDF ne se génère pas"
- [ ] Vérifiez la console (F12 → Console) pour messages d'erreur
- [ ] Confirmez que le serveur tourne: `http://localhost:8080` doit répondre
- [ ] Vérifiez que des opérations sont sélectionnées

### Erreur: "Tableau vide dans le PDF"
- [ ] Vérifiez que les opérations s'affichent dans la page (avant de générer)
- [ ] Vérifiez les filtres (Service, Date début/fin)
- [ ] Vérifiez que les opérations existent dans la BD (IndexedDB)

### Erreur: "Balances incorrectes"
- [ ] Vérifiez la page **"Gérer les soldes par type"** pour les balances actuelles
- [ ] Comparez avec le PDF (Balance Cash/Numérique en résumé)
- [ ] S'ils ne correspondent pas, videz le cache et rechargez

### Erreur: "Tri incorrect (pas croissant)"
- [ ] Vérifiez que les dates des opérations sont correctes
- [ ] Regénérez le PDF et comparez les timestamps
- [ ] Vérifiez la console pour les erreurs de tri

---

## 📊 Exemple de Résultat Attendu

### Fichier généré:
`flux-tresorerie-2025-01-20-to-2025-01-25.pdf`

### Contenu attendu:
```
FLUX & TRÉSORERIE (20/01/2025 - 25/01/2025)

┌────┬─────────┬────────┬──────────────────┬──────────┬──────────┬──────────┬──────────┐
│ N° │ Type    │Service │ Parties          │ Montant  │Cash AVANT│Cash APRÈS│Flux Cash │
├────┼─────────┼────────┼──────────────────┼──────────┼──────────┼──────────┼──────────┤
│ 1  │ Dépôt   │MonCash │Client A → Entrep │1000.00G │  0.00G   │1000.00G  │  +1000.0 │
│ 2  │ Retrait │MonCash │Entrep → Client B │ 500.00G │1000.00G  │ 500.00G  │  -500.0  │
│ 3  │Transfert│MonCash │Supplier → Bank   │1500.00G │ 500.00G  │2000.00G  │ +1500.0  │
└────┴─────────┴────────┴──────────────────┴──────────┴──────────┴──────────┴──────────┘

═══════════════════════════════════════════════════════════════════════════════════════
Ø=ÜÊ RÉSUMÉ DES FLUX
═══════════════════════════════════════════════════════════════════════════════════════

• Total opérations: 3
• Balance Numérique Actuelle: 5,500.00 GDES
• Total Frais: 75.00 GDES
• Total Commissions: 37.50 GDES
• Balance Cash Actuelle: 2,000.00 GDES
```

---

## ✅ Validation Finale

Tous les tests réussis? Excellent! 🎉

La fonctionnalité **"Rapport PDF Flux & Trésorerie"** est **PRÊTE POUR LA PRODUCTION**.

### Prochaines étapes recommandées:
1. ✅ Déployer en production
2. ✅ Informer l'équipe des nouvelles colonnes (Cash AVANT/APRÈS)
3. ✅ Monitorer les utilisations de la fonctionnalité
4. ✅ Collecter les retours pour améliorations

---

## 📞 Support

En cas de problème:
1. Vérifiez cette checklist complètement
2. Vérifiez les fichiers modifiés (pdf.ts, TransferReports.tsx)
3. Consultez la console du navigateur (F12)
4. Vérifiez que IndexedDB contient les opérations
