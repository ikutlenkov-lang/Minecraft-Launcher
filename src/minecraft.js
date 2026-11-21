
const { Client, offline, onLog } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');

let currentClient = null;

function validateOptions(options = {}) {
  const username = String(options.username || '').trim();
  const version = String(options.version || '1.21.1');
  const ram = Number(options.ram || 4096);

  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    throw new Error('Ник должен содержать 3–16 английских букв, цифр или _.');
  }

  if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
    throw new Error('Неверный формат версии Minecraft.');
  }

  if (!Number.isInteger(ram) || ram < 1024 || ram > 16384) {
    throw new Error('Оперативная память должна быть от 1 до 16 ГБ.');
  }

  return { username, version, ram };
}

async function launchMinecraft(options = {}, onProgress = () => {}) {
  try {
    const settings = validateOptions(options);

    const gameFolder = path.join(
      os.homedir(),
      'AppData',
      'Roaming',
      '.minecraft-launcher'
    );

    currentClient = new Client({
      authorization: offline(settings.username),

      root: gameFolder,

      version: {
        number: settings.version,
        type: 'release'
      },

      memory: {
        min: '1G',
        max: `${settings.ram / 1024}G`
      }
    });

    onLog('debug', message => {
      onProgress({
        type: 'debug',
        message: String(message)
      });
    });

    onLog('data', message => {
      onProgress({
        type: 'data',
        message: String(message)
      });
    });

    onProgress({
      type: 'status',
      message: 'Подготовка Minecraft...'
    });

    await currentClient.install();

    onProgress({
      type: 'status',
      message: 'Запуск игры...'
    });

    await currentClient.launch();

    return {
      success: true,
      message: 'Minecraft запущен!'
    };
  } catch (error) {
    console.error('Minecraft error:', error);

    return {
      success: false,
      error: error.message || 'Неизвестная ошибка запуска'
    };
  }
}

module.exports = {
  launchMinecraft
};
