
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
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

ipcMain.handle('minecraft:launch', async (_event, options) => {
  return minecraft.launchMinecraft(options, progress => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('minecraft:progress', progress);
    }
  });
});

ipcMain.handle('minecraft:get-default-directory', () => {
  return path.join(app.getPath('appData'), '.minecraft');
});

ipcMain.handle('minecraft:select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбери существующую папку Minecraft',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('minecraft:get-versions', async () => {
  return minecraft.getVersions();
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
