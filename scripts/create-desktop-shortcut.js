const path = require('path');
const { execSync } = require('child_process');

const vbsScript = path.join(__dirname, 'make_shortcut.vbs');
try {
  execSync(`cscript //nologo "${vbsScript}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('Error al crear los accesos directos:', err.message);
}
