
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const minecraft = require('./minecraft');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Minecraft Launcher',
    backgroundColor: '#10131c',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

ipcMain.handle('minecraft:launch', async (event, options) => {
  return minecraft.launchMinecraft(options, progress => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('minecraft:progress', progress);
    }
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
