# 🚀 GUIDE DÉMARRAGE RAPIDE - Système Caméléon ScarWrite

## 5 Minutes pour Configurer

### Étape 1️⃣ : Ouvrir les Paramètres
1. Cliquez sur l'icône **⚙️ Paramètres** dans la barre latérale
2. Cherchez la section **"🧠 Profil Entreprise (Le Cerveau)"** tout en haut

### Étape 2️⃣ : Choisir votre Type d'Entité
Sélectionnez dans le dropdown:

**Si vous êtes une Entreprise :**
- ✅ Entreprise Individuelle
- ✅ Societe Anonyme
- ✅ Societe par Actions Simplifiee
- ✅ Societe a Responsabilite Limitee

**Si vous êtes une Organisation Caritative :**
- ❤️ Organisation Non Gouvernementale (ONG)
- ❤️ Fondation
- ❤️ Organisation Internationale

### Étape 3️⃣ : Entrer votre Nom
Exemple : "ScarWrite SARL" ou "Fondation ScarWrite"

### Étape 4️⃣ : Sauvegarder
Cliquez sur **"Configurer le profil entreprise"**

✅ **Voilà !** Le menu s'adapte automatiquement.

---

## 📊 Ce qui Change Après

### Pour les Entreprises :
```
Dashboard
├─ Transactions (argent)
├─ Produits (stock)
├─ Clients (dettes)
├─ Dépenses (frais)
└─ ...
```

### Pour les ONG/Fondations :
```
Dashboard
├─ Dons et Apports
├─ Membres
├─ Projets
├─ Dépenses
└─ ...
```

---

## 🎁 Générer un Rapport Luxury

Les rapports sont maintenant **ultra professionnels** :

### Accès via Code
```typescript
import { generateLuxuryGeneralLedgerPDF } from '@/lib/pdf';

// Créer un PDF
const pdf = generateLuxuryGeneralLedgerPDF(
  'Ma Société SARL',
  'Societe a Responsabilite Limitee',
  [
    { date: '2026-01-15', description: 'Vente', debit: 1000, credit: 0 },
    { date: '2026-01-16', description: 'Achat', debit: 0, credit: 500 },
  ]
);

// Télécharger
pdf.save('rapport.pdf');
```

### Style Luxury 🌟
- 🎨 **Couleurs :** Bleu Marin + Or
- ✏️ **Police :** Typographie professionnelle
- 📄 **Espace :** Beaucoup de blanc (épuré)
- ⭐ **En-tête :** Symbole plume dorée

---

## 🔄 Flux Complet

```
1. 🧠 Configure le profil (5 min)
2. 📱 Le menu s'adapte (auto)
3. 📝 Enregistre tes données
4. 📊 Génère tes rapports
5. 📥 Exporte en PDF luxury
```

---

## 💡 Pro Tips

✅ **Astuce 1 :** Change facilement de type dans Paramètres  
✅ **Astuce 2 :** Exporte tes données avant tout changement majeur  
✅ **Astuce 3 :** Les rapports PDF sont certifiés avec ton statut juridique  
✅ **Astuce 4 :** Les ONG/Fondations ont des rapports "mission" spécialisés  

---

## ❓ FAQ Rapide

**Q: Puis-je changer de type après?**  
R: Oui! Va dans Paramètres → Profil Entreprise → Choisis un autre type

**Q: Les anciennes données vont disparaître?**  
R: Non! Tout est conservé. Le menu s'adapte juste.

**Q: Comment générer un rapport?**  
R: Attends les prochaines mises à jour pour les boutons "Exporter PDF"

**Q: Que signifie "Caméléon"?**  
R: L'app s'adapte à TON type d'entité (comme un caméléon change de couleur!)

---

## 🎯 Prochaines Étapes

- [ ] Configurer le profil (MAINTENANT!)
- [ ] Explorer les nouvelles pages
- [ ] Créer tes premiers enregistrements
- [ ] Générer un rapport
- [ ] Partager avec l'équipe

---

**Tu es prêt(e) ? Lance-toi ! 🚀**

Paramètres → Profil Entreprise → Let's Go!

Pour plus de détails, voir `SYSTEME_CAMELEON.md`
