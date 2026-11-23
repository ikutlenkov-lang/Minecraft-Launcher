
const { Client, Authenticator } = require('minecraft-launcher-core');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

let currentClient = null;
let cachedVersions = null;
let versionsRequest = null;
const VERSION_CACHE_TTL = 6 * 60 * 60 * 1000;
const VERSION_MANIFEST_URL =
  'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

function normalizeVersions(manifest) {
  if (!manifest || !Array.isArray(manifest.versions)) {
    throw new Error('Mojang вернул некорректный список версий.');
  }

  return manifest.versions
    .filter(item =>
      item && typeof item.id === 'string' &&
      (item.type === 'release' || item.type === 'snapshot')
    )
    .map(item => ({
      id: item.id,
      type: item.type,
      releaseTime: item.releaseTime || ''
    }));
}

async function readVersionsCache(cacheDirectory) {
  if (!cacheDirectory) return null;
  try {
    const cachePath = path.join(cacheDirectory, 'version-manifest-cache.json');
    const parsed = JSON.parse(await fsp.readFile(cachePath, 'utf8'));
    const versions = Array.isArray(parsed.versions) ? parsed.versions : null;
    if (!versions || !versions.length) return null;
    return { versions, fetchedAt: Number(parsed.fetchedAt) || 0 };
  } catch {
    return null;
  }
}

async function writeVersionsCache(cacheDirectory, versions) {
  if (!cacheDirectory) return;
  const cachePath = path.join(cacheDirectory, 'version-manifest-cache.json');
  const tempPath = cachePath + '.tmp';
  try {
    await fsp.mkdir(cacheDirectory, { recursive: true });
    await fsp.writeFile(tempPath, JSON.stringify({
      fetchedAt: Date.now(),
      versions
    }), 'utf8');
    await fsp.rename(tempPath, cachePath);
  } catch (error) {
    await fsp.rm(tempPath, { force: true }).catch(() => {});
    console.warn('Не удалось сохранить кэш версий:', error.message);
  }
}

async function requestVersionManifest() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(VERSION_MANIFEST_URL, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
          throw new Error('Сервер Mojang ответил: HTTP ' + response.status);
        }
        return await response.json();
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 800));
      }
    }
  }
  throw lastError || new Error('Не удалось подключиться к Mojang.');
}

async function getVersions(cacheDirectory, options = {}) {
  const forceRefresh = Boolean(options.forceRefresh);

  if (versionsRequest) return versionsRequest;

  versionsRequest = (async () => {
    const diskCache = await readVersionsCache(cacheDirectory);
    const fallback = cachedVersions || diskCache?.versions || null;

    if (!forceRefresh && cachedVersions) return cachedVersions;
    if (!forceRefresh && diskCache &&
        Date.now() - diskCache.fetchedAt < VERSION_CACHE_TTL) {
      cachedVersions = diskCache.versions;
      return cachedVersions;
    }

    try {
      const manifest = await requestVersionManifest();
      const freshVersions = normalizeVersions(manifest);
      if (!freshVersions.length) {
        throw new Error('Список версий Mojang оказался пустым.');
      }
      cachedVersions = freshVersions;
      await writeVersionsCache(cacheDirectory, freshVersions);
      return freshVersions;
    } catch (error) {
      if (fallback && fallback.length) {
        cachedVersions = fallback;
        console.warn('Используется сохранённый список версий:', error.message);
        return fallback;
      }
      throw new Error(
        'Не удалось загрузить версии Minecraft. Проверь интернет и нажми «Обновить список». ' +
        (error.message || '')
      );
    }
  })();

  try {
    return await versionsRequest;
  } finally {
    versionsRequest = null;
  }
}

async function launchMinecraft(options, onProgress = () => {}, cacheDirectory) {
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

    const versions = await getVersions(cacheDirectory);

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
