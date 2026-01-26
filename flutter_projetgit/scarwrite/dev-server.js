#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const projectDir = path.join(__dirname);

console.log('🚀 ScarWrite - Lancement du serveur de développement...\n');

// Lancer npm run dev
const dev = spawn('npm', ['run', 'dev'], {
  cwd: projectDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'development' }
});

dev.on('close', (code) => {
  console.log(`\nServeur arrêté avec le code: ${code}`);
  process.exit(code);
});
