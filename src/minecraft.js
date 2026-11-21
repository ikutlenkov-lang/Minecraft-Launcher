
const { Launcher, MicrosoftAuth } = require('eml-lib');

let account = null;
let currentLauncher = null;

async function login(mainWindow) {
  try {
    const microsoft = new MicrosoftAuth(mainWindow);
    account = await microsoft.auth();

    return {
      success: true,
      username: account.name || 'Игрок'
    };
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function launchMinecraft(options = {}, onProgress = () => {}) {
  if (!account) {
    throw new Error('Сначала войди через Microsoft.');
  }

  const version = options.version || 'latest_release';
  const ram = Number(options.ram) || 4096;

  currentLauncher = new Launcher({
    root: 'minecraft-launcher',
    account,
    minecraft: {
      version,
      loader: {
        loader: 'vanilla'
      }
    },
    java: {
      install: 'auto'
    },
    memory: {
      min: 512,
      max: ram
    }
  });

  const events = [
    'launch_download',
    'launch_install_loader',
    'launch_check_java',
    'launch_launch',
    'launch_close',
    'launch_crash',
    'download_progress'
  ];

  for (const event of events) {
    currentLauncher.on(event, data => {
      onProgress({
        event,
        data: data || null
      });
    });
  }

  try {
    await currentLauncher.launch();
    return { success: true };
  } catch (error) {
    console.error('Ошибка запуска Minecraft:', error);
    throw error;
  }
}

module.exports = {
  login,
  launchMinecraft
};
