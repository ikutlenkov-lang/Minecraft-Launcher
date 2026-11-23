const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs/promises');
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

  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
});

ipcMain.handle('minecraft:get-versions', async () => minecraft.getVersions());

// WORLD BACKUPS — копируются только выбранные миры из saves, а не вся .minecraft.
function safeWorldName(name) {
  if (typeof name !== 'string' || !name.trim() || name !== path.basename(name) ||
      name === '.' || name === '..' || /[<>:"\/\\|?*]/.test(name)) {
    throw new Error('Некорректное имя мира.');
  }
  return name;
}

async function getWorldPaths(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root)) {
    throw new Error('Сначала выбери корректную папку Minecraft в настройках.');
  }
  const minecraftRoot = path.resolve(root);
  const savesPath = path.join(minecraftRoot, 'saves');
  const stat = await fs.stat(savesPath).catch(() => null);
  if (!stat || !stat.isDirectory()) {
    throw new Error('Папка saves не найдена. Убедись, что выбрана правильная папка Minecraft.');
  }
  return { minecraftRoot, savesPath };
}

function backupRoot() {
  return path.join(app.getPath('userData'), 'world-backups');
}

async function listWorlds(root) {
  const { savesPath } = await getWorldPaths(root);
  const entries = await fs.readdir(savesPath, { withFileTypes: true });
  const worlds = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const worldPath = path.join(savesPath, entry.name);
    const level = await fs.stat(path.join(worldPath, 'level.dat')).catch(() => null);
    if (level && level.isFile()) worlds.push({ name: entry.name });
  }
  return worlds.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}

ipcMain.handle('world-backups:list-worlds', async (_event, root) => listWorlds(root));

ipcMain.handle('world-backups:list', async () => {
  const base = backupRoot();
  await fs.mkdir(base, { recursive: true });
  const entries = await fs.readdir(base, { withFileTypes: true });
  const backups = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folder = path.join(base, entry.name);
    try {
      const meta = JSON.parse(await fs.readFile(path.join(folder, 'backup.json'), 'utf8'));
      const st = await fs.stat(folder);
      backups.push({ id: entry.name, worldName: meta.worldName, createdAt: meta.createdAt,
        sizeLabel: meta.sizeLabel || 'Резервная копия', location: folder, modifiedAt: st.mtimeMs });
    } catch { /* пропускаем незавершённые/повреждённые записи */ }
  }
  return backups.sort((a, b) => b.modifiedAt - a.modifiedAt);
});

ipcMain.handle('world-backups:create', async (_event, root, rawName) => {
  const worldName = safeWorldName(rawName);
  const { savesPath } = await getWorldPaths(root);
  const source = path.join(savesPath, worldName);
  const sourceStat = await fs.stat(source).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory() ||
      !(await fs.stat(path.join(source, 'level.dat')).catch(() => null))) {
    throw new Error('Мир не найден или в нём нет level.dat.');
  }

  const base = backupRoot();
  await fs.mkdir(base, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const id = worldName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 36) + '_' + stamp;
  const destination = path.join(base, id);
  await fs.mkdir(destination, { recursive: false });
  try {
    await fs.cp(source, path.join(destination, 'world'), { recursive: true, errorOnExist: true });
    await fs.writeFile(path.join(destination, 'backup.json'), JSON.stringify({
      worldName, createdAt: new Date().toISOString(), format: 1
    }, null, 2), 'utf8');
  } catch (error) {
    await fs.rm(destination, { recursive: true, force: true });
    throw error;
  }
  return { success: true, id, worldName };
});

ipcMain.handle('world-backups:restore', async (_event, root, backupId) => {
  if (typeof backupId !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(backupId)) {
    throw new Error('Некорректная резервная копия.');
  }
  const { savesPath } = await getWorldPaths(root);
  const folder = path.join(backupRoot(), backupId);
  const meta = JSON.parse(await fs.readFile(path.join(folder, 'backup.json'), 'utf8'));
  const worldName = safeWorldName(meta.worldName);
  const source = path.join(folder, 'world');
  const sourceStat = await fs.stat(source).catch(() => null);
  if (!sourceStat || !sourceStat.isDirectory() ||
      !(await fs.stat(path.join(source, 'level.dat')).catch(() => null))) {
    throw new Error('Файлы этой резервной копии повреждены.');
  }

  const target = path.join(savesPath, worldName);
  const temp = path.join(savesPath, '.restore-' + Date.now());
  const existing = await fs.stat(target).catch(() => null);
  let safetyCopy = null;
  try {
    await fs.cp(source, temp, { recursive: true, errorOnExist: true });
    // Существующий мир сначала сохраняется отдельной копией — ничего не теряется.
    if (existing) {
      safetyCopy = path.join(backupRoot(), 'before-restore_' + Date.now());
      await fs.mkdir(safetyCopy, { recursive: false });
      await fs.cp(target, path.join(safetyCopy, 'world'), { recursive: true, errorOnExist: true });
      await fs.writeFile(path.join(safetyCopy, 'backup.json'), JSON.stringify({
        worldName, createdAt: new Date().toISOString(), format: 1,
        note: 'Автоматическая копия перед восстановлением'
      }, null, 2), 'utf8');
      await fs.rm(target, { recursive: true, force: true });
    }
    await fs.rename(temp, target);
  } catch (error) {
    await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
    // Если установка не удалась, возвращаем прежнюю версию мира.
    if (safetyCopy && !(await fs.stat(target).catch(() => null))) {
      await fs.cp(path.join(safetyCopy, 'world'), target, { recursive: true }).catch(() => {});
    }
    throw error;
  }
  return { success: true, worldName, safetyCopyCreated: Boolean(safetyCopy) };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
