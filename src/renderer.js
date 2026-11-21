
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-item');

const titles = {
  home: 'Главная',
  versions: 'Версии',
  servers: 'Серверы',
  settings: 'Настройки'
};

function showPage(name) {
  pages.forEach(page => {
    page.classList.toggle('active', page.id === name);
  });

  navButtons.forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.page === name
    );
  });

  document.getElementById('page-title').textContent =
    titles[name] || 'Главная';
}

navButtons.forEach(button => {
  button.addEventListener('click', () => {
    showPage(button.dataset.page);
  });
});

document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => {
    showPage(button.dataset.go);
  });
});

const nickname = document.getElementById('nickname');
const ram = document.getElementById('ram');
const version = document.getElementById('home-version');

const gameDirectory = document.getElementById('game-directory');
const directoryStatus = document.getElementById('directory-status');

const versionsList = document.getElementById('version-list');
const versionSearch = document.getElementById('version-search');

let allVersions = [];

nickname.value = localStorage.getItem('nickname') || '';
ram.value = localStorage.getItem('ram') || '4096';
gameDirectory.value = localStorage.getItem('gameDirectory') || '';

function saveSettings() {
  localStorage.setItem('nickname', nickname.value.trim());
  localStorage.setItem('ram', ram.value);
  localStorage.setItem('version', version.value);
  localStorage.setItem('gameDirectory', gameDirectory.value.trim());

  document.getElementById('profile-name').textContent =
    nickname.value.trim() || 'Игрок';

  document.getElementById('home-directory-label').textContent =
    gameDirectory.value.trim() || 'Не выбрана';
}

function setSelectedVersion(id) {
  version.value = id;

  saveSettings();

  showPage('home');
}

function renderVersionOptions(filter = '') {
  const query = filter.trim().toLowerCase();

  const filtered = allVersions.filter(item =>
    item.id.toLowerCase().includes(query)
  );

  const previousVersion = version.value;

  version.replaceChildren();

  filtered.forEach(item => {
    const option = document.createElement('option');

    option.value = item.id;

    option.textContent =
      item.id +
      (item.type === 'snapshot' ? ' • Снапшот' : ' • Релиз');

    version.appendChild(option);
  });

  if (filtered.some(item => item.id === previousVersion)) {
    version.value = previousVersion;
  } else if (filtered.length) {
    version.value = filtered[0].id;
  }

  versionsList.replaceChildren();

  filtered.slice(0, 150).forEach(item => {
    const card = document.createElement('button');

    card.className = 'version';
    card.type = 'button';

    const dot = document.createElement('span');
    dot.className =
      'version-dot ' +
      (item.type === 'snapshot' ? 'snapshot' : '');

    const label = document.createElement('span');
    label.textContent = 'Minecraft ' + item.id;

    const type = document.createElement('small');
    type.textContent =
      item.type === 'snapshot' ? 'SNAPSHOT' : 'RELEASE';

    card.append(dot, label, type);

    card.addEventListener('click', () => {
      setSelectedVersion(item.id);
    });

    versionsList.appendChild(card);
  });

  if (!filtered.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Версии не найдены.';
    versionsList.appendChild(empty);
  }
}

async function loadVersions() {
  const status = document.getElementById('versions-status');

  try {
    status.textContent = 'Загружаем список Mojang...';

    allVersions = await window.launcher.getVersions();

    renderVersionOptions();

    const latestRelease = allVersions.find(
      item => item.type === 'release'
    );

    const latestSnapshot = allVersions.find(
      item => item.type === 'snapshot'
    );

    status.textContent =
      'Последний релиз: ' + (latestRelease?.id || '—') +
      ' | Последний снапшот: ' + (latestSnapshot?.id || '—');

  } catch (error) {
    status.textContent =
      'Ошибка загрузки версий: ' + error.message;
  }
}

versionSearch.addEventListener('input', () => {
  renderVersionOptions(versionSearch.value);
});

version.addEventListener('change', saveSettings);

// Выбор существующей папки

document.getElementById('choose-directory').addEventListener(
  'click',
  async () => {
    try {
      const selected = await window.launcher.selectDirectory();

      if (!selected) return;

      gameDirectory.value = selected;

      saveSettings();

      directoryStatus.textContent =
        'Папка выбрана. Существующие файлы сохраняются.';
    } catch (error) {
      directoryStatus.textContent =
        'Ошибка: ' + error.message;
    }
  }
);

// Стандартная папка

document.getElementById('use-default-directory').addEventListener(
  'click',
  async () => {
    try {
      gameDirectory.value =
        await window.launcher.getDefaultDirectory();

      saveSettings();

      directoryStatus.textContent =
        'Выбрана стандартная папка Minecraft.';
    } catch (error) {
      directoryStatus.textContent =
        'Ошибка: ' + error.message;
    }
  }
);

// Сохранение настроек

document.getElementById('save-settings').addEventListener(
  'click',
  () => {
    const name = nickname.value.trim();

    if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
      document.getElementById('settings-status').textContent =
        'Ник должен содержать 3–16 английских букв, цифр или _.';

      return;
    }

    if (!gameDirectory.value.trim()) {
      document.getElementById('settings-status').textContent =
        'Сначала выбери папку Minecraft.';

      return;
    }

    saveSettings();

    document.getElementById('settings-status').textContent =
      '✓ Настройки сохранены!';
  }
);

// Запуск игры

document.getElementById('play-button').addEventListener(
  'click',
  async () => {
    const username = nickname.value.trim();

    const status = document.getElementById('launch-status');
    const button = document.getElementById('play-button');

    if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
      status.textContent = 'Введи правильный ник в настройках.';
      showPage('settings');
      return;
    }

    if (!gameDirectory.value.trim()) {
      status.textContent = 'Выбери папку Minecraft.';
      showPage('settings');
      return;
    }

    const selected = allVersions.find(
      item => item.id === version.value
    );

    if (!selected) {
      status.textContent = 'Выбери доступную версию Minecraft.';
      showPage('versions');
      return;
    }

    saveSettings();

    button.disabled = true;
    status.textContent = 'Подготовка Minecraft...';

    try {
      const result = await window.launcher.launch({
        username,
        version: selected.id,
        root: gameDirectory.value.trim(),
        ram: Number(ram.value)
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      status.textContent = 'Minecraft запускается!';

    } catch (error) {
      status.textContent = 'Ошибка: ' + error.message;

    } finally {
      button.disabled = false;
    }
  }
);

window.launcher.onProgress(progress => {
  if (progress.message) {
    document.getElementById('launch-status').textContent =
      progress.message;
  }
});

// Серверы

const serverArea = document.querySelector('.server-placeholder');

const serverName = document.createElement('input');
const serverIP = document.createElement('input');
const addButton = document.createElement('button');
const serverList = document.createElement('div');

serverName.placeholder = 'Название сервера';
serverIP.placeholder = 'IP сервера';

addButton.textContent = '+ Добавить сервер';

serverArea.append(
  serverName,
  serverIP,
  addButton,
  serverList
);

let servers = [];

try {
  servers = JSON.parse(
    localStorage.getItem('servers') || '[]'
  );

  if (!Array.isArray(servers)) {
    servers = [];
  }
} catch {
  servers = [];
}

function saveServers() {
  localStorage.setItem('servers', JSON.stringify(servers));
}

function renderServers() {
  serverList.replaceChildren();

  if (!servers.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Пока нет серверов.';
    serverList.appendChild(empty);
  }

  servers.forEach((server, index) => {
    const card = document.createElement('div');
    card.className = 'server';

    const title = document.createElement('h3');
    title.textContent = server.name;

    const address = document.createElement('p');
    address.textContent = server.ip;

    const copy = document.createElement('button');
    copy.textContent = 'Копировать IP';

    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(server.ip);
        copy.textContent = 'Скопировано!';
      } catch {
        address.textContent =
          server.ip + ' — скопируй вручную';
      }
    });

    const remove = document.createElement('button');
    remove.textContent = 'Удалить';

    remove.addEventListener('click', () => {
      servers.splice(index, 1);
      saveServers();
      renderServers();
    });

    card.append(title, address, copy, remove);
    serverList.appendChild(card);
  });
}

addButton.addEventListener('click', () => {
  const name = serverName.value.trim();
  const ip = serverIP.value.trim();

  if (
    !name ||
    !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(ip)
  ) {
    alert('Проверь название и IP сервера.');
    return;
  }

  servers.push({ name, ip });

  saveServers();

  serverName.value = '';
  serverIP.value = '';

  renderServers();
});

// Инициализация

async function init() {
  if (!gameDirectory.value) {
    gameDirectory.value =
      await window.launcher.getDefaultDirectory();
  }

  directoryStatus.textContent =
    'Текущая папка: ' + gameDirectory.value;

  saveSettings();

  renderServers();

  showPage('home');

  await loadVersions();

  const savedVersion = localStorage.getItem('version');

  if (
    savedVersion &&
    allVersions.some(item => item.id === savedVersion)
  ) {
    version.value = savedVersion;
  } else if (
    allVersions.some(item => item.id === '26.3')
  ) {
    version.value = '26.3';
  }

  saveSettings();
}

init();
