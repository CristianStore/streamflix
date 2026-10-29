const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { app, BrowserWindow, Menu, globalShortcut } = require('electron');

const rootDir = path.resolve(__dirname, '..');
const logFile = path.join(rootDir, 'electron_debug.log');

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  try { fs.appendFileSync(logFile, line); } catch (_) {}
  console.log(...args);
}

log('=== CineNova iniciando ===');

app.name = 'CineNova';
try {
  const userDataDir = path.join(app.getPath('appData'), 'CineNovaApp');
  app.setPath('userData', userDataDir);
} catch (_) {}

// Permite siempre abrir la ventana sin bloquearse por procesos huérfanos
app.requestSingleInstanceLock();

let mainWindow = null;
let backendProcess = null;
const BACKEND_PORT = 3000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// ─── ESTABILIDAD Y RENDIMIENTO NATIVO ────────────────────────────────────────
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

function findNodeExecutable() {
  const candidates = [
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'node', 'node.exe'),
    path.join(process.env.APPDATA || '', 'npm', 'node.exe')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      log('Node encontrado en:', c);
      return c;
    }
  }
  return 'node';
}

function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(`${BACKEND_URL}/api/health`, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(600, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function killBackend() {
  if (backendProcess) {
    log('Terminando proceso backend');
    try {
      if (backendProcess.pid) {
        spawn('taskkill', ['/pid', String(backendProcess.pid), '/T', '/F'], { windowsHide: true });
      }
    } catch (_) {}
    try { backendProcess.kill(); } catch (_) {}
    backendProcess = null;
  }
}

async function ensureBackendServer() {
  const isRunning = await checkServerReady();
  if (isRunning) {
    log('Servidor backend ya estaba activo en puerto', BACKEND_PORT);
    return true;
  }

  const backendDir = path.join(rootDir, 'backend');
  const serverScript = path.join(backendDir, 'src', 'server.js');
  const nodeExe = findNodeExecutable();

  log('Lanzando backend con:', nodeExe, serverScript);
  try {
    backendProcess = spawn(nodeExe, [serverScript], {
      cwd: backendDir,
      stdio: 'ignore',
      windowsHide: true,
      detached: false
    });
  } catch (err) {
    log('Fallo al lanzar con nodeExe, intentando fallback ELECTRON_RUN_AS_NODE:', err.message);
    backendProcess = spawn(process.execPath, [serverScript], {
      cwd: backendDir,
      stdio: 'ignore',
      windowsHide: true,
      detached: false,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
    });
  }

  backendProcess.on('error', (err) => {
    log('Error en backendProcess:', err.message);
    try {
      backendProcess = spawn(process.execPath, [serverScript], {
        cwd: backendDir,
        stdio: 'ignore',
        windowsHide: true,
        detached: false,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
      });
    } catch (_) {}
  });

  // Esperar activamente hasta que el servidor responda (máximo 12 segundos)
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const ready = await checkServerReady();
    if (ready) {
      log('Servidor backend listo tras', (i + 1) * 250, 'ms');
      return true;
    }
  }
  log('Advertencia: Backend no respondió en tiempo límite.');
  return false;
}

const SPLASH_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CineNova</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      background: #0E0E16;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      user-select: none;
      overflow: hidden;
    }
    .brand {
      color: #FFFFFF;
      font-size: 48px;
      font-weight: 900;
      letter-spacing: 5px;
      margin-bottom: 26px;
      text-shadow: 0 0 26px rgba(168, 85, 247, 0.7);
      animation: pulse 1.5s ease-in-out infinite alternate;
    }
    .brand span {
      color: #A855F7;
    }
    @keyframes pulse {
      0% { transform: scale(0.98); opacity: 0.9; }
      100% { transform: scale(1.02); opacity: 1; }
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 3px solid rgba(255,255,255,0.12);
      border-top: 3px solid #A855F7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 22px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status {
      color: #9CA3AF;
      font-size: 14px;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="brand">CINE<span>NOVA</span></div>
  <div class="spinner"></div>
  <div class="status" id="statusMsg">Iniciando CineNova...</div>
</body>
</html>
`;

function createWindow() {
  const pngPath = path.join(rootDir, 'cinenova.png');
  const icoPath = path.join(rootDir, 'cinenova.ico');
  const iconPath = fs.existsSync(pngPath) ? pngPath : (fs.existsSync(icoPath) ? icoPath : undefined);
  log('Creando ventana nativa. Icono:', iconPath);

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0E0E16',
    title: 'CineNova',
    icon: iconPath,
    show: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      allowRunningInsecureContent: true
    }
  });

  Menu.setApplicationMenu(null);

  // Cargar pantalla de carga instantánea
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(SPLASH_HTML));

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log('CRASH DETECTED render-process-gone:', JSON.stringify(details));
  });

  // Bloqueo nativo de ventanas emergentes / anuncios publicitarios
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log('Popup publicitario bloqueado:', url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    try {
      const parsed = new URL(navUrl);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1' && !navUrl.startsWith('data:')) {
        event.preventDefault();
        log('Redirección bloqueada:', navUrl);
      }
    } catch (_) {}
  });

  // Atajos de pantalla completa
  mainWindow.on('focus', () => {
    globalShortcut.register('F11', () => {
      if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
    });
    globalShortcut.register('Escape', () => {
      if (mainWindow && mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    });
  });

  mainWindow.on('blur', () => {
    globalShortcut.unregister('F11');
    globalShortcut.unregister('Escape');
  });

  mainWindow.on('closed', () => {
    log('Ventana cerrada por el usuario');
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  log('app.whenReady ejecutado');
  createWindow();

  const ok = await ensureBackendServer();
  if (mainWindow && !mainWindow.isDestroyed()) {
    log('Cargando URL principal:', BACKEND_URL);
    mainWindow.loadURL(BACKEND_URL);
    mainWindow.show();
    mainWindow.focus();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      if (mainWindow) mainWindow.loadURL(BACKEND_URL);
    }
  });
});

app.on('before-quit', () => {
  log('app.before-quit: cerrando procesos');
  globalShortcut.unregisterAll();
  killBackend();
});

app.on('window-all-closed', () => {
  log('Todas las ventanas cerradas');
  killBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
