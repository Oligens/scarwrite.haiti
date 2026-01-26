#!/usr/bin/env pwsh

# Changez la politique d'exécution pour la session actuelle
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process -Force

# Accédez au répertoire du projet
Set-Location "c:\flutter_projetgit\goutboucherapport"

Write-Host "Installation des dépendances..." -ForegroundColor Green
npm install

Write-Host "`nLancement du serveur de développement..." -ForegroundColor Green
npm run dev
