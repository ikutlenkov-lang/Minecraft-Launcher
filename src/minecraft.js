
const { Client, Authenticator } = require('minecraft-launcher-core');
const fs = require('fs');
const path = require('path');

let currentClient = null;
let cachedVersions = null;

async function getVersions() {
  if (cachedVersions) {
    return cachedVersions;
  }

  const response = await fetch(
    'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
  );

  if (!response.ok) {
    throw new Error('Не удалось получить список версий Mojang.');
  }

  const manifest = await response.json();

  cachedVersions = manifest.versions
    .filter(item =>
      item.type === 'release' ||
      item.type === 'snapshot'
    )
    .map(item => ({
      id: item.id,
      type: item.type,
      releaseTime: item.releaseTime
    }));

  return cachedVersions;
}

async function launchMinecraft(options, onProgress = () => {}) {
  try {
    const username = String(options.username || '').trim();
    const version = String(options.version || '').trim();
    const ram = Number(options.ram || 4096);
    const root = path.resolve(String(options.root || ''));

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      throw new Error('Неверный никнейм!');
    }

    if (!/^[A-Za-z0-9._-]{1,80}$/.test(version)) {
      throw new Error('Неверная версия Minecraft!');
    }

    if (!Number.isInteger(ram) || ram < 1024 || ram > 16384) {
      throw new Error('ОЗУ должно быть от 1 до 16 ГБ.');
    }

    if (!root || !fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
      throw new Error('Папка Minecraft не найдена. Выбери существующую папку в настройках.');
    }

    const versions = await getVersions();

    const selectedVersion = versions.find(
      item => item.id === version
    );

    if (!selectedVersion) {
      throw new Error('Версия отсутствует в официальном списке Mojang.');
    }

    currentClient = new Client();

    currentClient.on('debug', message => {
      onProgress({ message: String(message) });
    });

    currentClient.on('data', message => {
      onProgress({ message: String(message) });
    });

    onProgress({
      message: 'Подготовка Minecraft ' + version + '...'
    });

    const launchOptions = {
      authorization: Authenticator.getAuth(username),

      root,

      version: {
        number: version,
        type: selectedVersion.type
      },

      memory: {
        max: ram + 'M',
        min: '1024M'
      }
    };

    await currentClient.launch(launchOptions);

    return {
      success: true,
      message: 'Minecraft запускается!'
    };

  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: error.message || 'Ошибка запуска'
    };
  }
}

module.exports = {
  launchMinecraft,
  getVersions
};
