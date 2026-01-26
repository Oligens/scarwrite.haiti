# Vérification de la Logique des Balances

## ✅ Statut: LOGIQUE CORRECTE

Votre code implémente déjà **exactement** la logique demandée pour synchroniser les balances Cash et Numérique.

---

## 📋 Comment Fonctionne le Système

### 1. **Fonction Core: `executeFinancialTransaction()` dans `database.ts` (Ligne 325)**

Cette fonction est le **cœur** de la synchronisation des balances. Elle applique cette logique:

```typescript
// RETRAIT (Withdrawal)
if (operation_type === 'withdrawal') {
  cashAfter = cashBefore - amount_gdes;
  digitalAfter = digitalBefore + amount_gdes + fees + commission;
}

// DÉPÔT / TRANSFERT (Deposit ou Transfer)
else if (operation_type === 'deposit' || operation_type === 'transfer') {
  cashAfter = cashBefore + amount_gdes + fees + commission;
  digitalAfter = digitalBefore - amount_gdes;
}
```

### 2. **Sauvegarde des Balances: `addOperation()` dans `storage.ts` (Ligne 712)**

1. Enregistre d'abord les écritures comptables (Journal Général)
2. Appelle `executeFinancialTransaction()` pour calculer les NEW balances
3. Met à jour `localStorage` via `updateTypeBalance()` (Ligne 907)
4. Dispatch les events globaux pour mettre à jour l'UI (`ledger-updated`, `financials-updated`)

### 3. **Affichage des Balances: `BalanceHeader.tsx`**

Le composant affiche les balances stockées dans `localStorage`:
- Écoute les events globaux pour se mettre à jour instantanément
- Permet aussi la modification manuelle si besoin

---

## 🧪 Vérification Pratique (Comment Tester)

### **Scénario A: Retrait de 400 G**

**Départ:** Cash: 1000 G | Numérique: 0 G

**Étapes:**
1. Allez à `/transfers` → "Gérer les soldes par type"
2. Sélectionnez un service (ex: MonCash)
3. Cliquez "Nouveau Retrait"
4. Entrez: Montant = 400, Frais = 0, Commission = 0
5. Cliquez "Enregistrer"

**Résultat Attendu:** 
- Cash: 600 G (1000 - 400)
- Numérique: 400 G (0 + 400 + 0 + 0)

**Où Vérifier:**
- La page affiche immédiatement les NEW balances
- Inspectez `localStorage` dans DevTools:
  ```javascript
  localStorage.getItem('balance_moncash')
  // Doit retourner: {"digital_balance":400,"cash_balance":600}
  ```

---

### **Scénario B: Dépôt de 500 G**

**Départ:** Cash: 1000 G | Numérique: 2000 G

**Étapes:**
1. Allez à `/transfers` → "Gérer les soldes par type"
2. Sélectionnez un service
3. Cliquez "Nouveau Dépôt"
4. Entrez: Montant = 500, Frais = 0, Commission = 0
5. Cliquez "Enregistrer"

**Résultat Attendu:**
- Cash: 1500 G (1000 + 500 + 0 + 0)
- Numérique: 1500 G (2000 - 500)

**Où Vérifier:**
```javascript
localStorage.getItem('balance_moncash')
// Doit retourner: {"digital_balance":1500,"cash_balance":1500}
```

---

### **Scénario C: Dépôt avec Frais (500 G + 25 G de frais)**

**Départ:** Cash: 1000 G | Numérique: 2000 G

**Étapes:**
1. Dépôt de 500 G
2. Frais: 25 G
3. Enregistrer

**Résultat Attendu:**
- Cash: 1525 G (1000 + 500 + 25)
- Numérique: 1500 G (2000 - 500)

Les frais augmentent le Cash car **vous les gardez** en tant que prestataire.

---

## 📊 Vérification dans la Base de Données

Inspectez la table `operations` directement:

```javascript
// Dans le DevTools Console
const { db } = await import('/src/lib/database.js');

// Afficher la dernière opération
const lastOp = await db.operations.orderBy('created_at').last();
console.log({
  operation_type: lastOp.operation_type,
  amount: lastOp.amount_gdes,
  fees: lastOp.fees,
  commission: lastOp.commission,
  cash_before: lastOp.cash_before,
  cash_after: lastOp.cash_after,
  digital_before: lastOp.digital_before,
  digital_after: lastOp.digital_after,
});
```

**Les valeurs doivent correspondre à:**
- **Withdrawal:** `cash_after = cash_before - amount`, `digital_after = digital_before + amount + fees + commission`
- **Deposit/Transfer:** `cash_after = cash_before + amount + fees + commission`, `digital_after = digital_before - amount`

---

## 🔍 Fichiers Clés à Consulter

| Fichier | Ligne | Rôle |
|---------|-------|------|
| `src/lib/database.ts` | 325 | Logique core de calcul des balances |
| `src/lib/storage.ts` | 712 | Fonction `addOperation()` qui orchestre tout |
| `src/lib/storage.ts` | 892 | Fonction `getTypeBalance()` pour lire les données |
| `src/lib/storage.ts` | 907 | Fonction `updateTypeBalance()` pour sauvegarder |
| `src/components/BalanceHeader.tsx` | 1 | Affichage des balances dans l'UI |
| `src/pages/Transfers.tsx` | 367 | Page "Gérer les soldes par type" |

---

## ⚠️ Points Importants

1. **Pas de "Sync Cloud"**: Les balances sont stockées localement en IndexedDB + localStorage
2. **Initialisation**: Les balances commencent à 0 si aucune opération n'a été faite
3. **Édition Manuelle**: Dans `BalanceHeader`, vous pouvez modifier les balances directement avec le bouton ✏️
4. **Events**: Quand une opération est enregistrée, l'UI se met à jour automatiquement grâce à `window.dispatchEvent()`

---

## ✨ Résumé

✅ **Logique Mathématique**: Implémentée correctement
✅ **Sauvegarde**: Via Dexie (IndexedDB) + localStorage  
✅ **Synchronisation**: Via events globaux et `refreshKey`
✅ **Affichage**: Instantané dans `BalanceHeader`

**Vous pouvez tester vos scénarios maintenant!**
