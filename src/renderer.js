
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('page-title');

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
    button.classList.toggle('active', button.dataset.page === name);
  });

  pageTitle.textContent = titles[name] || 'Главная';
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

const nicknameInput = document.getElementById('nickname');
const ramSelect = document.getElementById('ram');
const settingsStatus = document.getElementById('settings-status');

function loadSettings() {
  nicknameInput.value = localStorage.getItem('nickname') || '';
  ramSelect.value = localStorage.getItem('ram') || '4096';
}

document.getElementById('save-settings').addEventListener('click', () => {
  const nickname = nicknameInput.value.trim();

  if (nickname.length > 16) {
    settingsStatus.textContent = 'Никнейм слишком длинный!';
    return;
  }

  localStorage.setItem('nickname', nickname);
  localStorage.setItem('ram', ramSelect.value);

  settingsStatus.textContent = '✓ Настройки сохранены!';
});

const playButton = document.getElementById('play-button');
const launchStatus = document.getElementById('launch-status');

playButton.addEventListener('click', () => {
  launchStatus.textContent =
    'Запуск Minecraft пока не подключён. Следующий этап — игровой движок лаунчера.';
});

loadSettings();
showPage('home');
