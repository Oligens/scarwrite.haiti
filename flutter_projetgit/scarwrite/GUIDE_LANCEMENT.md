# 🚀 Guide Complet de Lancement ScarWrite

## ✅ Corrections Effectuées
- ✅ Logo ScarWrite intégré (SVG avec plume dorée et lettres SW)
- ✅ Lovable-tagger désactivé (cause de conflits)
- ✅ Identité visuelle mise à jour
- ✅ Métadonnées PWA configurées

## 📋 Comment Lancer l'Application

### **Méthode 1: Double-cliquez sur `start.bat` (PLUS FACILE)**

1. Ouvrez l'Explorateur de fichiers (Windows Explorer)
2. Naviguez vers: `c:\flutter_projetgit\goutboucherapport\`
3. **Double-cliquez** sur le fichier **`start.bat`**
4. Une fenêtre CMD apparaîtra
5. Attendez 30 secondes pour que les dépendances s'installent et le serveur démarre
6. Vous verrez: `Local: http://localhost:8080`

---

### **Méthode 2: Depuis Command Prompt (CMD)**

1. Appuyez sur **Windows + R**
2. Tapez: `cmd` et appuyez sur Entrée
3. Exécutez ces commandes:
```cmd
cd c:\flutter_projetgit\goutboucherapport
npm run dev
```

4. Attendez le message: `Local: http://localhost:8080`

---

### **Méthode 3: Depuis PowerShell (Administrateur)**

1. Appuyez sur **Windows + X** → Sélectionnez **Windows PowerShell (Administrateur)**
2. Exécutez cette commande UNIQUE:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; cd c:\flutter_projetgit\goutboucherapport; npm run dev
```

3. Attendez le message: `Local: http://localhost:8080`

---

## 🌐 Accéder à l'Application

Une fois le serveur lancé, ouvrez votre navigateur web et allez à:
```
http://localhost:8080
```

## 📲 Interface Attendue

- ✅ Logo ScarWrite visible (plume dorée + SW)
- ✅ Titre: "ScarWrite - Gestion Financière Premium"
- ✅ Couleurs: Bleu nuit (#1e293b) + Or (#fbbf24)
- ✅ Texte noir sur fond blanc (lisible)

## 🛑 Arrêter le Serveur

- Appuyez sur **Ctrl + C** dans la fenêtre CMD/PowerShell
- Ou fermez la fenêtre complètement

## ⚠️ Problèmes Courants

### "Module not found" ou "Cannot find module"
**Solution:**
```cmd
npm install
npm run dev
```

### Port 8080 déjà utilisé
**Solution:**
```powershell
# Arrêtez le processus qui utilise le port
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force
```

Puis relancez l'application.

### PowerShell: "Scripts are disabled"
**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 📞 Support

Si le serveur ne démarre pas:
1. Vérifiez que Node.js est installé: `node --version`
2. Vérifiez npm: `npm --version`
3. Supprimez le dossier `node_modules` et réinstallez:
   ```cmd
   rmdir /s /q node_modules
   npm install
   npm run dev
   ```

---

## ✨ Fichiers de Lancement Disponibles

- **`start.bat`** ← Fichier le plus simple
- **`LAUNCH.bat`** ← Avec vérifications détaillées
- **`RUN.bat`** ← Alternative complète
- **`start-dev.bat`** ← Version simple
- **`start-dev.ps1`** ← Pour PowerShell

Utilisez **`start.bat`** pour simplifier! 🎉
