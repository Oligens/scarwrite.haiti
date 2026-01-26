# 🚀 Guide de Lancement de ScarWrite

## ⚠️ Prérequis
- Node.js 24.13.0 (installé ✅)
- npm ou Bun (npm est disponible)

## 📋 Options de Lancement

### Option 1: Fichier Batch (Recommandé) ✅
Ouvrez l'Explorateur de fichiers et **double-cliquez sur** :
```
RUN.bat
```
Ou ouvrez **Command Prompt (cmd.exe)** et tapez:
```cmd
c:\flutter_projetgit\goutboucherapport\RUN.bat
```

### Option 2: PowerShell (Avec restrictions levées)
Ouvrez PowerShell en tant **qu'administrateur** et exécutez:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Puis lancez le script:
```powershell
cd c:\flutter_projetgit\goutboucherapport
npm run dev
```

### Option 3: Command Prompt (CMD)
Ouvrez **Command Prompt** et exécutez:
```cmd
cd c:\flutter_projetgit\goutboucherapport
npm run dev
```

## 📍 Adresse de l'Application
Une fois lancée, ouvrez votre navigateur et accédez à:
```
http://localhost:8080
```

## 🛠️ Dépannage

### Si vous voyez "npm: command not found"
Essayez avec le chemin complet:
```cmd
"C:\Program Files\nodejs\npm.cmd" run dev
```

### Si les modules ne sont pas installés
Exécutez d'abord:
```cmd
npm install
```

## 📦 Nouvelles Modifications
- ✅ Désactivation de lovable-tagger (cause de conflits)
- ✅ Logos ScarWrite intégrés (SVG)
- ✅ Identité visuelle mise à jour
- ✅ Métadonnées PWA actualisées
