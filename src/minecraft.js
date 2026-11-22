const { Client, Authenticator } = require('minecraft-launcher-core');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

let currentClient = null;
let cachedVersions = null;

async function getVersions() {
  if (cachedVersions) return cachedVersions;

  const response = await fetch('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json');
  if (!response.ok) throw new Error('Не удалось получить список версий Mojang.');

  const manifest = await response.json();
  cachedVersions = manifest.versions
    .filter(item => item.type === 'release' || item.type === 'snapshot')
    .map(item => ({ id: item.id, type: item.type, releaseTime: item.releaseTime }));

  return cachedVersions;
}

async function fetchJson(url, label) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Minecraft-Launcher/1.0 (offline-skins)' }
  });
  if (!response.ok) throw new Error(label + ' (HTTP ' + response.status + ').');
  return response.json();
}

async function downloadFile(url, destination) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Minecraft-Launcher/1.0 (offline-skins)' }
  });
  if (!response.ok) throw new Error('Не удалось скачать файл (HTTP ' + response.status + ').');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length) throw new Error('Сервер вернул пустой файл.');
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, bytes);
}

function runJava(args, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn('java', args, { windowsHide: true });
    let output = '';
    child.stdout.on('data', chunk => {
      const line = String(chunk).trim();
      output += line + '\n';
      if (line) onProgress({ message: line });
    });
    child.stderr.on('data', chunk => {
      const line = String(chunk).trim();
      output += line + '\n';
      if (line) onProgress({ message: line });
    });
    child.once('error', error => {
      if (error.code === 'ENOENT') reject(new Error('Для установки Fabric нужна Java. Установи Java 21 и повтори запуск.'));
      else reject(error);
    });
    child.once('close', code => {
      if (code === 0) resolve(output);
      else reject(new Error('Установщик Fabric завершился с кодом ' + code + '. ' + output.slice(-1200)));
    });
  });
}

async function installFabric(root, minecraftVersion, onProgress) {
  onProgress({ message: 'Проверяем совместимость Fabric для Minecraft ' + minecraftVersion + '...' });
  const loaders = await fetchJson(
    'https://meta.fabricmc.net/v2/versions/loader/' + encodeURIComponent(minecraftVersion),
    'Fabric не поддерживает Minecraft ' + minecraftVersion
  );
  const loader = loaders.find(item => item.loader && item.loader.stable) || loaders[0];
  if (!loader || !loader.loader || !loader.loader.version) {
    throw new Error('Для Minecraft ' + minecraftVersion + ' не найдена стабильная версия Fabric.');
  }

  const installers = await fetchJson('https://meta.fabricmc.net/v2/versions/installer', 'Не удалось получить версии установщика Fabric.');
  const installer = installers.find(item => item.stable) || installers[0];
  if (!installer || !installer.version) throw new Error('Не найдена версия установщика Fabric.');

  const installerPath = path.join(root, 'launcher-cache', 'fabric-installer-' + installer.version + '.jar');
  if (!fs.existsSync(installerPath)) {
    onProgress({ message: 'Скачиваем установщик Fabric...' });
    await downloadFile(
      'https://maven.fabricmc.net/net/fabricmc/fabric-installer/' + installer.version +
      '/fabric-installer-' + installer.version + '.jar',
      installerPath
    );
  }

  const profileId = 'fabric-loader-' + loader.loader.version + '-' + minecraftVersion;
  const profilePath = path.join(root, 'versions', profileId, profileId + '.json');
  if (!fs.existsSync(profilePath)) {
    onProgress({ message: 'Устанавливаем Fabric Loader ' + loader.loader.version + '...' });
    await runJava([
      '-jar', installerPath, 'client', '-dir', root,
      '-mcversion', minecraftVersion, '-loader', loader.loader.version, '-noprofile'
    ], onProgress);
  }
  if (!fs.existsSync(profilePath)) {
    throw new Error('Fabric Installer завершился, но профиль ' + profileId + ' не найден.');
  }
  return profileId;
}

async function installModrinthProject(projectId, minecraftVersion, modsDirectory) {
  const query = '?game_versions=' + encodeURIComponent(JSON.stringify([minecraftVersion])) +
    '&loaders=' + encodeURIComponent(JSON.stringify(['fabric']));
  const versions = await fetchJson(
    'https://api.modrinth.com/v2/project/' + encodeURIComponent(projectId) + '/version' + query,
    'Не удалось получить совместимую версию мода ' + projectId
  );
  const selected = versions.find(item => item.version_type === 'release') || versions[0];
  if (!selected) throw new Error('Нет версии мода ' + projectId + ' для Minecraft ' + minecraftVersion + '.');

  const file = selected.files && (selected.files.find(item => item.primary) || selected.files[0]);
  if (!file || !file.url || !file.filename || !file.filename.toLowerCase().endsWith('.jar')) {
    throw new Error('Modrinth не вернул JAR-файл для ' + projectId + '.');
  }
  await downloadFile(file.url, path.join(modsDirectory, file.filename));

  for (const dependency of selected.dependencies || []) {
    if (dependency.dependency_type !== 'required') continue;
    if (dependency.version_id) {
      const depVersion = await fetchJson(
        'https://api.modrinth.com/v2/version/' + encodeURIComponent(dependency.version_id),
        'Не удалось получить обязательную зависимость мода'
      );
      const depFile = depVersion.files && (depVersion.files.find(item => item.primary) || depVersion.files[0]);
      if (depFile && depFile.url && depFile.filename && depFile.filename.endsWith('.jar')) {
        await downloadFile(depFile.url, path.join(modsDirectory, depFile.filename));
      }
    } else if (dependency.project_id) {
      await installModrinthProject(dependency.project_id, minecraftVersion, modsDirectory);
    }
  }
}

async function ensureOfflineSkinSupport(root, minecraftVersion, username, onProgress) {
  const skinFile = path.join(root, 'config', 'offlineskins', username + '.png');
  if (!fs.existsSync(skinFile)) return null;

  const fabricProfile = await installFabric(root, minecraftVersion, onProgress);
  const modsDirectory = path.join(root, 'mods');
  fs.mkdirSync(modsDirectory, { recursive: true });

  const marker = path.join(root, 'launcher-cache', 'offlineskins-reloaded-' + minecraftVersion + '.installed');
  if (!fs.existsSync(marker)) {
    onProgress({ message: 'Устанавливаем OfflineSkins Reloaded для ' + minecraftVersion + '...' });
    await installModrinthProject('offlineskins-reloaded', minecraftVersion, modsDirectory);
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, new Date().toISOString(), 'utf8');
  }
  return fabricProfile;
}

async function launchMinecraft(options, onProgress = () => {}) {
  try {
    const username = String(options.username || '').trim();
    const version = String(options.version || '').trim();
    const ram = Number(options.ram || 4096);
    const root = path.resolve(String(options.root || ''));

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) throw new Error('Неверный никнейм!');
    if (!/^[A-Za-z0-9._-]{1,80}$/.test(version)) throw new Error('Неверная версия Minecraft!');
    if (!Number.isInteger(ram) || ram < 1024 || ram > 16384) throw new Error('ОЗУ должно быть от 1 до 16 ГБ.');
    if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      throw new Error('Папка Minecraft не найдена. Выбери существующую папку в настройках.');
    }

    const versions = await getVersions();
    const selectedVersion = versions.find(item => item.id === version);
    if (!selectedVersion) throw new Error('Версия отсутствует в официальном списке Mojang.');

    onProgress({ message: 'Подготовка Minecraft ' + version + '...' });

    let fabricProfile = null;
    try {
      fabricProfile = await ensureOfflineSkinSupport(root, version, username, onProgress);
    } catch (skinError) {
      throw new Error('Не удалось подготовить поддержку скина: ' + skinError.message);
    }

    currentClient = new Client();
    currentClient.on('debug', message => onProgress({ message: String(message) }));
    currentClient.on('data', message => onProgress({ message: String(message) }));

    const launchOptions = {
      authorization: Authenticator.getAuth(username),
      root,
      version: fabricProfile
        ? { number: version, type: selectedVersion.type, custom: fabricProfile }
        : { number: version, type: selectedVersion.type },
      memory: { max: ram + 'M', min: '1024M' }
    };

    await currentClient.launch(launchOptions);
    return { success: true, message: 'Minecraft запускается!' };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message || 'Ошибка запуска' };
  }
}

module.exports = { launchMinecraft, getVersions };
