
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
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

// Выбор PNG-скина
ipcMain.handle('skins:select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Выбери PNG-скин Minecraft',
    properties: ['openFile'],
    filters: [{ name: 'PNG skin', extensions: ['png'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

// Сохранение скина в совместимые локальные папки OfflineSkins
ipcMain.handle('skins:apply', async (_event, options) => {
  const username = String(options.username || '').trim();
  const root = path.resolve(String(options.root || ''));
  const source = path.resolve(String(options.sourcePath || ''));
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw new Error('Сначала укажи корректный офлайн-ник (3–16 символов).');
  }
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('Папка Minecraft не найдена.');
  }
  if (!fs.existsSync(source) || path.extname(source).toLowerCase() !== '.png') {
    throw new Error('Выбери существующий PNG-файл.');
  }
  const image = fs.readFileSync(source);
  if (image.length > 2 * 1024 * 1024 || image.length < 24 ||
      image.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    throw new Error('Файл должен быть корректным PNG размером до 2 МБ.');
  }
  const width = image.readUInt32BE(16);
  const height = image.readUInt32BE(20);
  if (width !== 64 || (height !== 64 && height !== 32)) {
    throw new Error('Поддерживаются стандартные скины Minecraft 64×64 или 64×32.');
  }
  const targets = [
    path.join(root, 'cachedImages', 'skins'),
    path.join(root, 'config', 'offlineskins')
  ];
  for (const folder of targets) {
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, username + '.png'), image);
  }
  return {
    success: true,
    preview: 'data:image/png;base64,' + image.toString('base64'),
    width,
    height,
    message: 'Скин сохранён. Перезапусти Minecraft, чтобы он загрузился.'
  };
});

ipcMain.handle('skins:load-current', async (_event, options) => {
  const username = String(options.username || '').trim();
  const root = path.resolve(String(options.root || ''));
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username) ||
      !fs.existsSync(root) || !fs.statSync(root).isDirectory()) return null;
  const candidates = [
    path.join(root, 'cachedImages', 'skins', username + '.png'),
    path.join(root, 'config', 'offlineskins', username + '.png')
  ];
  const found = candidates.find(file => fs.existsSync(file));
  if (!found) return null;
  const image = fs.readFileSync(found);
  return 'data:image/png;base64,' + image.toString('base64');
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
