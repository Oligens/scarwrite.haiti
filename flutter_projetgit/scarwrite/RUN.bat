@echo off
REM Script de lancement de ScarWrite
REM ==================================

REM Changer le répertoire courant
cd /d "%~dp0"

echo.
echo ========================================
echo   ScarWrite - Serveur de Developpement
echo ========================================
echo.

REM Vérifier si node_modules existe
if not exist "node_modules" (
    echo Installation des dépendances...
    call npm install
    echo.
)

REM Lancer le serveur de développement
echo Demarrage du serveur sur http://localhost:8080
echo.
call npm run dev

pause
