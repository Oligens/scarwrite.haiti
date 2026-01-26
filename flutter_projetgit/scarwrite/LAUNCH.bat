@echo off
REM ==========================================
REM   ScarWrite - Lanceur Intelligent
REM ==========================================
REM Détecte l'environnement et lance correctement

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ===========================================
echo   ScarWrite - Gestion Financière Premium
echo ===========================================
echo.

REM Vérifier Node.js
where /q node
if errorlevel 1 (
    echo ❌ Node.js n'est pas installé!
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js détecté
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo   Version: !NODE_VERSION!
echo.

REM Vérifier npm
where /q npm
if errorlevel 1 (
    echo ❌ npm n'est pas installé!
    pause
    exit /b 1
)

echo ✅ npm détecté
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo   Version: !NPM_VERSION!
echo.

REM Vérifier node_modules
if not exist "node_modules" (
    echo 📦 Installation des dépendances...
    echo Cela peut prendre quelques minutes...
    echo.
    call npm install
    if errorlevel 1 (
        echo ❌ Erreur lors de l'installation!
        pause
        exit /b 1
    )
    echo ✅ Dépendances installées avec succès
    echo.
)

REM Lancer le serveur
echo 🚀 Démarrage du serveur de développement...
echo.
echo L'application será disponible à : http://localhost:8080
echo.
echo Appuyez sur Ctrl+C pour arrêter le serveur.
echo.

call npm run dev

pause
