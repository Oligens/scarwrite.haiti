# 🧠 Système Caméléon ScarWrite - Guide Complet

## Vue d'ensemble

ScarWrite a été restructuré avec un **système Caméléon** qui adapte dynamiquement l'interface selon le type d'entité juridique. L'application se configure automatiquement avec un seul choix initial.

---

## 🚀 Étape 1 : Configuration Initiale (Le Cerveau)

### Accès
1. Allez dans **Paramètres** (⚙️)
2. Cherchez la section **"🧠 Profil Entreprise (Le Cerveau)"**

### Types d'entités disponibles

#### Pour les Entreprises :
- **Entreprise Individuelle** - Petite entreprise individuelle
- **Societe Anonyme (SA)** - Société avec conseil d'administration
- **Societe par Actions Simplifiee (SAS)** - Structures flexibles
- **Societe a Responsabilite Limitee (SARL)** - Responsabilité limitée
- **Maison de Transfert** (implicite via Transactions)

#### Pour les Entités Sociales :
- **Organisation Non Gouvernementale (ONG)** 
- **Fondation**
- **Organisation Internationale**

### Configuration
1. Sélectionnez votre **Type d'entité** dans le dropdown
2. Entrez le **Nom de l'entité** (ex: "ScarWrite SARL")
3. Cliquez sur **"Configurer le profil entreprise"**

✓ Le profil est sauvegardé dans `company_profile` dans **ScarWriteDB**

---

## 🎨 Étape 2 : Adaptation Automatique (Sidebar Caméléon)

Le menu de navigation s'adapte **automatiquement** selon votre choix :

### Pour les Entreprises
```
Dashboard
├─ Transactions (Transferts d'argent)
├─ Produits (Gestion du stock)
├─ Clients (Nouveau - Dettes et crédits)
├─ Dépenses (Nouveau - Loyer, Salaires)
├─ Calendrier (Ventes journalières)
├─ Comptabilité (Journal Général, Grand Livre)
├─ Fiscalité
└─ Paramètres
```

### Pour les Entités Sociales (ONG, Fondation, Organisation Internationale)
```
Dashboard
├─ Dons et Apports (Remplace Transactions)
├─ Membres (Nouveau - Adhérents et donateurs)
├─ Projets (Nouveau - Budgets humanitaires)
├─ Dépenses (Même pour les ONG)
├─ Calendrier (Planning des missions)
├─ Comptabilité (État financier)
├─ Fiscalité
└─ Paramètres
```

**Comment ça fonctionne :**
- `AppSidebar.tsx` charge dynamiquement les items selon `getCompanyType()`
- Les routes vers les pages n'apparaissent que si le type correspond
- Le changement est **immédiat** après sauvegarde du profil

---

## 📊 Étape 3 : Fonctionnalités Compatibles

### Pages Universelles (Tous les types)
- **Dashboard** - Vue globale luxe
- **Calendrier** - Avec libellés adaptés (Ventes vs Missions)
- **Comptabilité** - Journal Général et Grand Livre
- **Fiscalité** - Paramètres légaux
- **Paramètres** - Configuration du profil

### Pages pour Entreprises UNIQUEMENT
- **Transactions** → Gestion des transferts
- **Produits** → Gestion du stock  
- **Clients** → Suivi des dettes
- **Dépenses** → Sorties d'argent (Loyer, Salaires)

### Pages pour Entités Sociales UNIQUEMENT
- **Dons et Apports** → Enregistrement des fonds
- **Membres** → Liste des adhérents
- **Projets** → Suivi des budgets humanitaires

---

## 🎁 Étape 4 : Rapports PDF Luxe (Pro)

### Nouveaux rapports disponibles

#### 1. **Rapport Comptable Luxury**
Fonction: `generateLuxuryGeneralLedgerPDF()`

**Caractéristiques:**
- En-tête luxe avec Plume Dorée (✦)
- Nom entreprise en majuscules (Bleu Marin #0A1128)
- Tableau Journal Général: Date | Description | Débit | Crédit
- Lignes fines dorées (#D4AF37)
- Beaucoup d'espace blanc (design épuré)
- Signature automatique du statut juridique

**Usage:**
```typescript
import { generateLuxuryGeneralLedgerPDF } from '@/lib/pdf';

const pdf = generateLuxuryGeneralLedgerPDF(
  'ScarWrite SARL',
  'Societe a Responsabilite Limitee',
  [
    { date: '2026-01-15', description: 'Vente produits', debit: 5000, credit: 0 },
    { date: '2026-01-16', description: 'Paiement fournisseur', debit: 0, credit: 2000 },
  ]
);
```

#### 2. **Rapport de Mission (ONG/Fondation)**
Fonction: `generateSocialMissionReportPDF()`

**Caractéristiques:**
- En-tête avec symbole ❤️ (rouge/or)
- Données de mission structurées
- Cartes de résumé: Bénéficiaires | Fonds reçus | Fonds dépensés
- Tableau des projets avec taux d'avancement
- Design épuré et professionnel

**Usage:**
```typescript
import { generateSocialMissionReportPDF } from '@/lib/pdf';

const pdf = generateSocialMissionReportPDF(
  'Fondation ScarWrite',
  'Fondation',
  {
    period: 'Janvier 2026',
    objectives: ['Aider 100 familles', 'Éducation scolaire'],
    beneficiaries: 150,
    fundingReceived: 50000,
    fundingSpent: 35000,
    projects: [
      { name: 'Bourses scolaires', budget: 20000, spent: 15000 },
      { name: 'Clinic santé', budget: 30000, spent: 20000 },
    ]
  }
);
```

### Style Luxury Appliqué
- **Couleur primaire:** Bleu Marin #0A1128
- **Couleur accent:** Or #D4AF37
- **Bordures:** Fines (0.15-0.3px) en doré
- **Typographie:** 
  - Titres: 18-20px, Bleu Marin, Bold
  - Texte: 9-10px, Gris 45-60
  - Nombres: Gris foncé #2D2D30
- **Espacement:** Beaucoup d'espace blanc, padding généreux
- **Tableaux:** Alternance légère de couleur (248, 248, 248)

---

## 🔧 Implémentation Technique

### Fichiers modifiés/créés

#### Base de données (`database.ts`)
```typescript
export type CompanyType = 
  | 'Entreprise Individuelle'
  | 'Societe Anonyme'
  | ... // voir le fichier

export interface CompanyProfile {
  id: string;
  company_type: CompanyType;
  company_name: string;
  fiscal_year_start: number;
  created_at: string;
  updated_at: string;
}
```

#### Stockage (`storage.ts`)
- `getCompanyProfile()` - Récupère le profil
- `saveCompanyProfile()` - Sauvegarde le profil
- `getCompanyType()` - Type d'entité
- `isSocialEntity()` - Vérifie si c'est une ONG/Fondation

#### Sidebar Dynamique (`AppSidebar.tsx`)
```typescript
useEffect(() => {
  const companyType = await getCompanyType();
  const isSocial = ['ONG', 'Fondation', ...].includes(companyType);
  // Charge les items selon le type
}, []);
```

#### Settings (`Settings.tsx`)
- Nouveau dropdown avec tous les types
- Notification visuelle pour les entités sociales
- Sauvegarde dans IndexedDB

#### Nouvelles pages
- `Donations.tsx` - Dons et apports
- `Members.tsx` - Gestion des membres
- `Projects.tsx` - Gestion des projets
- `Clients.tsx` - Gestion des clients
- `Expenses.tsx` - Gestion des dépenses

#### Routage (`App.tsx`)
Toutes les nouvelles routes sont définies :
```
/donations, /members, /projects, /clients, /expenses
```

#### Rapports PDF (`pdf.ts`)
- `generateLuxuryGeneralLedgerPDF()` - Rapport comptable luxury
- `generateSocialMissionReportPDF()` - Rapport de mission

---

## 📋 Checklist de Mise en Route

- [x] Configuration du profil entreprise dans Paramètres
- [x] Vérification que le sidebar s'adapte (rafraîchir la page si besoin)
- [ ] Créer les premiers enregistrements (Transactions/Dons)
- [ ] Générer un premier rapport PDF
- [ ] Exporter les données pour sauvegarde

---

## 🎯 Prochaines Étapes

1. **Phase 2 :** Implémentation complète des pages (CRUD complet)
2. **Phase 3 :** Intégration des rapports dans les pages
3. **Phase 4 :** Thème visual complet (Bleu #0A1128 + Or #D4AF37)
4. **Phase 5 :** Tests et déploiement

---

## 📞 Support

Pour toute question sur le système Caméléon ou les rapports luxe, consultez les commentaires dans :
- `src/lib/storage.ts` - Fonctions de profil
- `src/lib/pdf.ts` - Rapports luxury
- `src/components/layout/AppSidebar.tsx` - Logique dynamique

---

**ScarWrite v2.0 - Système Caméléon Activé ✓**
