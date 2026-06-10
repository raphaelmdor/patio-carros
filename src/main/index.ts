import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { initDatabase } from './database';
import { registerIpcHandlers } from './ipcHandlers';

// ─────────────────────────────────────────────────────────────────────────────
// Janela principal
// ─────────────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width:    1280,
    height:   820,
    minWidth:  960,
    minHeight: 640,
    title:    'Pátio de Carros',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
  });

  // HTML do renderer está em src/renderer/ (não compilado, só servido como arquivo)
  mainWindow.loadFile(path.join(app.getAppPath(), 'src', 'renderer', 'index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ─────────────────────────────────────────────────────────────────────────────
// Inicialização
// ─────────────────────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  try {
    await initDatabase();
  } catch (err: any) {
    dialog.showErrorBox(
      'Erro de Banco de Dados',
      `Não foi possível conectar ao MySQL.\n\nVerifique as configurações no arquivo .env\n\n${err.message}`
    );
    app.quit();
    return;
  }

  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
