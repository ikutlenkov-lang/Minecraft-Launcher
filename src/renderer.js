
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-item');

const titles = {
  home: 'Главная',
  versions: 'Версии',
  servers: 'Серверы',
  settings: 'Настройки'
};

function showPage(name) {
  pages.forEach(page => page.classList.toggle('active', page.id === name));
  navButtons.forEach(button => button.classList.toggle('active', button.dataset.page === name));
  document.getElementById('page-title').textContent = titles[name] || 'Главная';
}

navButtons.forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.page));
});

document.querySelectorAll('[data-go]').forEach(button => {
  button.addEventListener('click', () => showPage(button.dataset.go));
});

const nickname = document.getElementById('nickname');
const ram = document.getElementById('ram');
const version = document.getElementById('home-version');

nickname.value = localStorage.getItem('nickname') || '';
ram.value = localStorage.getItem('ram') || '4096';
version.value = localStorage.getItem('version') || '1.21.1';

function saveSettings() {
  localStorage.setItem('nickname', nickname.value.trim());
  localStorage.setItem('ram', ram.value);
  localStorage.setItem('version', version.value);
  document.getElementById('profile-name').textContent =
    nickname.value.trim() || 'Игрок';
}

document.getElementById('save-settings').addEventListener('click', () => {
  const name = nickname.value.trim();

  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) {
    document.getElementById('settings-status').textContent =
      'Ник: 3–16 английских букв, цифр или _.';
    return;
  }

  saveSettings();
  document.getElementById('settings-status').textContent =
    '✓ Настройки сохранены!';
});

version.addEventListener('change', saveSettings);

document.getElementById('play-button').addEventListener('click', async () => {
  const username = nickname.value.trim();
  const status = document.getElementById('launch-status');
  const button = document.getElementById('play-button');

  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    status.textContent = 'Сначала введи правильный ник в настройках!';
    showPage('settings');
    return;
  }

  saveSettings();
  button.disabled = true;
  status.textContent = 'Подготовка Minecraft...';

  try {
    const result = await window.launcher.launch({
      username,
      version: version.value,
      ram: Number(ram.value)
    });

    if (!result.success) throw new Error(result.error);

    status.textContent = 'Minecraft запускается!';
  } catch (error) {
    status.textContent = 'Ошибка: ' + error.message;
  } finally {
    button.disabled = false;
  }
});

window.launcher.onProgress(progress => {
  if (progress.message) {
    document.getElementById('launch-status').textContent = progress.message;
  }
});

const serverArea = document.querySelector('.server-placeholder');
const serverName = document.createElement('input');
const serverIP = document.createElement('input');
const addButton = document.createElement('button');
const serverList = document.createElement('div');

serverName.placeholder = 'Название сервера';
serverIP.placeholder = 'IP сервера';
addButton.textContent = '+ Добавить сервер';

serverArea.append(serverName, serverIP, addButton, serverList);

let servers = [];

try {
  servers = JSON.parse(localStorage.getItem('servers') || '[]');
  if (!Array.isArray(servers)) servers = [];
} catch {
  servers = [];
}

function renderServers() {
  serverList.replaceChildren();

  if (servers.length === 0) {
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
        address.textContent = server.ip + ' — скопируй вручную';
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

  if (!name || !/^[a-zA-Z0-9.-]+(?::\d{1,5})?$/.test(ip)) {
    alert('Проверь название и IP сервера.');
    return;
  }

  servers.push({ name, ip });
  localStorage.setItem('servers', JSON.stringify(servers));

  serverName.value = '';
  serverIP.value = '';

  renderServers();
});

saveSettings();
renderServers();
showPage('home');
