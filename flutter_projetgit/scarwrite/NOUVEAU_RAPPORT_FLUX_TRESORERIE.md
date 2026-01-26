# 📊 Nouveau Rapport PDF: Flux & Trésorerie

## ✅ Implémentation Complète

### 📝 Description
Nouveau modèle de rapport PDF conçu pour le suivi dynamique du cash et un résumé comptable détaillé.

---

## 🎯 Structure du Rapport

### 1️⃣ En-têtes et Titre
- Titre personnalisé avec plages de dates
- En-tête formaté avec logo ScarWrite
- Orientation: Paysage (A4)

### 2️⃣ Tableau des Opérations (Ordre Croissant)

| Colonne | Description |
|---------|-------------|
| **N°** | Numéro séquentiel de l'opération |
| **Type** | Type d'opération (Dépôt / Retrait / Transfert) |
| **Service** | Service utilisé (MonCash, Natcash, Zelle, etc.) |
| **Expéditeur / Bénéficiaire** | Noms des parties impliquées |
| **Montant (GDES/USD)** | Montant en GDES et USD si applicable |
| **Cash AVANT** | Solde en caisse AVANT cette opération |
| **Cash APRÈS** | Solde en caisse APRÈS cette opération |
| **Flux Cash** | Indicateur visuel (+ pour entrée, - pour sortie) |

**Tri**: Les opérations sont triées en ordre croissant (la plus ancienne en haut, la plus récente en bas)

### 3️⃣ Section Résumé (Pied de Page)

```
═══════════════════════════════════════════════════════
Ø=ÜÊ RÉSUMÉ DES FLUX
═══════════════════════════════════════════════════════

• Total opérations: [nombre de lignes traitées]
• Balance Numérique Actuelle: [montant récupéré au moment de la génération]
• Total Frais: [somme des frais collectés]
• Total Commissions: [somme des commissions gagnées]
• Balance Cash Actuelle: [solde final en espèces du moment]
```

---

## 🚀 Comment l'Utiliser

### Accès
1. Naviguez vers **Rapports Financiers** → `/transfers/reports`
2. Deux boutons PDF sont disponibles:
   - 🔵 **PDF Opérations** (ancien rapport)
   - 🟡 **PDF Flux & Trésorerie** (NOUVEAU - Jaune doré)

### Génération
1. Sélectionnez les filtres (Service, Date début, Date fin)
2. Cliquez sur **"PDF Flux & Trésorerie"**
3. Le PDF est généré avec:
   - Les opérations du service/période sélectionnée
   - Les balances actuelles (cash + digital) au moment de la génération
   - Calculs dynamiques des totaux (frais, commissions)

### Fichier Généré
Nommage: `flux-tresorerie-YYYY-MM-DD-to-YYYY-MM-DD.pdf`

---

## 📊 Données Dynamiques

### Balances Récupérées en Temps Réel
- **Balance Numérique**: Calculée depuis les accounting_entries
- **Balance Cash**: Calculée depuis les accounting_entries

### Calculs Effectués
- **Total Frais**: Somme de tous les frais des opérations filtrées
- **Total Commissions**: Somme de toutes les commissions
- **Soldes Progressifs**: Chaque ligne montre l'évolution du solde cash

---

## 🔧 Fichiers Modifiés

### 1. `src/lib/pdf.ts`
- **Nouvelle fonction**: `generateFluxTresorerieWithCashTrackingPDF()`
- Génère un rapport avec:
  - Tableau trié en ordre croissant
  - Colonnes de suivi du cash (AVANT/APRÈS)
  - Résumé détaillé en pied de page

**Signature**:
```typescript
export const generateFluxTresorerieWithCashTrackingPDF = (
  operations: FinancialOperation[],
  cashBalanceAtGeneration: number,
  digitalBalanceAtGeneration: number,
  startDate?: string,
  endDate?: string
): jsPDF
```

### 2. `src/pages/TransferReports.tsx`
- **Imports ajoutés**: `getTypeBalanceFromAccounting`, `generateFluxTresorerieWithCashTrackingPDF`
- **Nouvelle fonction**: `handleGenerateFluxTresoreriePDF()`
  - Récupère les balances actuelles
  - Appelle la fonction PDF
  - Gère le téléchargement/partage
- **UI mise à jour**: 
  - Deux boutons PDF (Opérations + Flux & Trésorerie)
  - Layout responsive avec flexbox

### 3. `start-dev.bat`
- ✅ **Corrigé**: Chemin correct pour le répertoire du projet

---

## 📈 Exemple de Rapport

```
┌─────────────────────────────────────────────────────────────┐
│  Flux & Trésorerie (2025-01-01 - 2025-01-31)              │
├──────┬──────────┬────────┬──────────────┬─────────┬────────┤
│ N°   │ Type     │ Service│ Parties      │ Montant │Cash... │
├──────┼──────────┼────────┼──────────────┼─────────┼────────┤
│ 1    │ Dépôt    │ MonC...│ Client → Bus │1000.00 │+1000  │
│ 2    │ Retrait  │ Zelle │ Bus → Client │ 500.00 │-500   │
│ 3    │ Transfert│ NatC...│ Acc → Supplier│250.00 │-250   │
└──────┴──────────┴────────┴──────────────┴─────────┴────────┘

═══════════════════════════════════════════════════════════════
Ø=ÜÊ RÉSUMÉ DES FLUX
═══════════════════════════════════════════════════════════════

• Total opérations: 3
• Balance Numérique Actuelle: 5,500.00 GDES
• Total Frais: 150.00 GDES
• Total Commissions: 75.00 GDES
• Balance Cash Actuelle: 2,800.00 GDES
```

---

## ✨ Caractéristiques

✅ **Tri Automatique**: Opérations triées du plus ancien au plus récent  
✅ **Suivi du Cash**: Colonnes Cash AVANT/APRÈS pour chaque ligne  
✅ **Balances Actuelles**: Données récupérées au moment exact de la génération  
✅ **Résumé Dynamique**: Calculs automatiques des totaux  
✅ **Design Premium**: Formatage luxury avec or/bleu marin  
✅ **Multi-Services**: Compatible avec tous les services de transfert  
✅ **Responsive**: Fonctionne sur tous les appareils  

---

## 🎯 Prochaines Étapes Optionnelles

1. **Paramétrage du Service**: Permettre à l'utilisateur de choisir le service pour la balance cash
2. **Export Excel**: Ajouter un export en format Excel
3. **Statistiques Avancées**: Ajouter des graphiques de tendances
4. **Récurrence**: Rapports programmés mensuels/trimestriels

---

## 📌 Notes Techniques

- **Base de Données**: Utilise `getTypeBalanceFromAccounting()` pour les balances actuelles
- **Format PDF**: jsPDF avec autoTable pour les tableaux
- **Tri**: Effectué côté client par date (order croissant)
- **Calculs**: Tous les totaux sont calculés dynamiquement depuis les données filtrées
- **Téléchargement**: Partage d'abord (si disponible), sinon téléchargement

