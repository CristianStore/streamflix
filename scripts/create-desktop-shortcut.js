const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const desktopDir = path.join(process.env.USERPROFILE || (process.env.HOMEDRIVE + process.env.HOMEPATH), 'Desktop');
const appDir = root;
const cmdPath = path.join(appDir, 'node_modules', '.bin', 'electron.cmd');
const shortcutPath = path.join(desktopDir, 'StreamFlix Desktop.lnk');

if (!fs.existsSync(cmdPath)) {
  console.error('No se encontró Electron en node_modules. Ejecuta npm install primero.');
  process.exit(1);
}

try {
  const powershell = [
    'powershell',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    `'$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut(${JSON.stringify(shortcutPath)}); $s.TargetPath = ${JSON.stringify(cmdPath)}; $s.Arguments = ${JSON.stringify(path.join(appDir, 'electron', 'main.js'))}; $s.WorkingDirectory = ${JSON.stringify(appDir)}; $s.IconLocation = ${JSON.stringify(path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe'))}; $s.Save()'`
  ];

  execSync(powershell.join(' '), { stdio: 'inherit' });
  console.log(`Acceso directo creado: ${shortcutPath}`);
} catch (error) {
  console.error('No se pudo crear el acceso directo:', error.message);
  process.exit(1);
}
