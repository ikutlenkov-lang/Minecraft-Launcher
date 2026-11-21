
const { Client, Authenticator } = require('minecraft-launcher-core');
const path = require('path');
const os = require('os');

let currentClient = null;

async function launchMinecraft(options, onProgress = () => {}) {
  try {
    const username = String(options.username || '').trim();
    const version = String(options.version || '1.21.1');
    const ram = Number(options.ram || 4096);

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      throw new Error('Неверный никнейм!');
    }

    if (!/^\d+\.\d+(\.\d+)?$/.test(version)) {
      throw new Error('Неверная версия Minecraft!');
    }

    if (!Number.isInteger(ram) || ram < 1024 || ram > 16384) {
      throw new Error('Неверное количество оперативной памяти!');
    }

    const root = path.join(os.homedir(), '.minecraft-launcher');

    currentClient = new Client();

    currentClient.on('debug', message => {
      onProgress({ message: String(message) });
    });

    currentClient.on('data', message => {
      onProgress({ message: String(message) });
    });

    onProgress({ message: 'Подготовка Minecraft...' });

    const launchOptions = {
      authorization: Authenticator.getAuth(username),
      root,
      version: {
        number: version,
        type: 'release'
      },
      memory: {
        max: `${ram}M`,
        min: '1024M'
      }
    };

    await currentClient.launch(launchOptions);

    return {
      success: true,
      message: 'Игра запущена!'
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error: error.message || 'Ошибка запуска'
    };
  }
}

module.exports = { launchMinecraft };
