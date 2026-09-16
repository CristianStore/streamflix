const path = require('path');
const { app, BrowserWindow } = require('electron');

const isDev = !app.isPackaged;

// Evitar cierres inesperados del proceso GPU en Windows
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

if (isDev) {
  require('electron-reload')(__dirname, {
    electron: require.resolve('electron'),
    hardResetMethod: 'exit'
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    title: 'StreamFlix Desktop',
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      enableRemoteModule: true
    }
  });

  const appUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '..', 'backend', 'public', 'index.html')}`;

  win.loadURL(appUrl);

  if (isDev) {
    win.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
