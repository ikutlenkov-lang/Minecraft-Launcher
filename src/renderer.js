
const pages = document.querySelectorAll('.page');
const navButtons = document.querySelectorAll('.nav-item');

const titles = {
  home: 'Главная',
  versions: 'Версии',
  servers: 'Серверы',
  profile: 'Профиль игрока',
  skins: 'Редактор скинов',
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
      const profileStats = JSON.parse(localStorage.getItem('blockProfileStats') || '{}');
      profileStats.launches = (Number(profileStats.launches) || 0) + 1;
      localStorage.setItem('blockProfileStats', JSON.stringify(profileStats));
      if (typeof renderPlayerProfile === 'function') renderPlayerProfile();

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


/* КАСТОМНЫЙ ФОН ЛАУНЧЕРА */
const backgroundPresets = {
  default: "linear-gradient(135deg,#07130d 0%,#153b28 48%,#101c29 100%)",
  aurora: "linear-gradient(135deg,#092b38 0%,#176b62 48%,#34245e 100%)",
  ocean: "linear-gradient(135deg,#061b36 0%,#075985 52%,#102d4a 100%)",
  sunset: "linear-gradient(135deg,#3b1747 0%,#a33d56 52%,#e58b48 100%)",
  purple: "linear-gradient(135deg,#170d36 0%,#54258b 52%,#172c57 100%)",
  ember: "linear-gradient(135deg,#260e12 0%,#87351f 52%,#d17a32 100%)"
};

// Атмосферные фоны по мотивам биомов Minecraft — работают офлайн.
const minecraftBackgrounds = {
  overworld: { name: "🌳 Верхний мир", value: "linear-gradient(180deg,#071b2dcc 0%,#0c2c36d9 42%,#173d26e8 43%,#07140feF 100%),linear-gradient(135deg,#75c9ff 0%,#b7e7ff 43%,#69a94a 44%,#315d2b 100%)" },
  cherry: { name: "🌸 Вишнёвая роща", value: "linear-gradient(180deg,#26172bd9 0%,#38213bdb 50%,#17251ceF 100%),linear-gradient(135deg,#f5b6d1 0%,#a8d8ef 48%,#779d59 49%,#394c31 100%)" },
  nether: { name: "🔥 Незер", value: "linear-gradient(180deg,#24090be8 0%,#54130fe8 52%,#16090df2 100%),linear-gradient(135deg,#ff7442 0%,#a51f25 55%,#260b18 100%)" },
  end: { name: "🌌 Край", value: "linear-gradient(180deg,#090817e8 0%,#1a1230e8 58%,#090817f2 100%),radial-gradient(ellipse at 70% 30%,#9d79d8 0%,#40305f 24%,#100d20 72%)" },
  snowy: { name: "❄️ Снежные горы", value: "linear-gradient(180deg,#101e31d9 0%,#1b2d42df 54%,#0a1421f2 100%),linear-gradient(145deg,#a9d9f5 0%,#eaf7ff 43%,#718ca4 44%,#263d56 100%)" },
  cave: { name: "⛏️ Пещера", value: "linear-gradient(180deg,#080c12eF 0%,#17232beF 52%,#070a0eeF 100%),radial-gradient(ellipse at 55% 45%,#486b62 0%,#263b3a 28%,#090e15 75%)" }
};
const presetControl = document.getElementById('background-preset');
const colorOne = document.getElementById('background-color-1');
const colorTwo = document.getElementById('background-color-2');
const angleControl = document.getElementById('background-angle');
const imageControl = document.getElementById('background-image');
const backgroundStatus = document.getElementById('background-status');
const backgroundGallery = document.getElementById('background-gallery');

function renderMinecraftBackgrounds() {
  if (!backgroundGallery) return;
  backgroundGallery.replaceChildren();
  Object.entries(minecraftBackgrounds).forEach(([id, scene]) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'background-scene';
    button.style.background = scene.value;
    button.title = scene.name;
    button.setAttribute('aria-label', 'Установить фон: ' + scene.name);
    const label = document.createElement('span');
    label.textContent = scene.name;
    button.appendChild(label);
    button.addEventListener('click', () => {
      applyBackground({type:'gradient',value:scene.value});
      backgroundStatus.textContent = scene.name + ' — фон применён и сохранён.';
    });
    backgroundGallery.appendChild(button);
  });
}

renderMinecraftBackgrounds();

function saveBackground(background) {
  try {
    localStorage.setItem('launcherBackground', JSON.stringify(background));
    backgroundStatus.textContent = '✓ Фон сохранён!';
  } catch (error) {
    backgroundStatus.textContent = 'Не удалось сохранить фон. Возможно, изображение слишком большое.';
  }
}

function applyBackground(background, persist = true) {
  if (!background || typeof background !== 'object') return;
  if (background.type === 'image' && typeof background.value === 'string' &&
      background.value.startsWith('data:image/')) {
    document.body.style.setProperty('--launcher-background',
      'linear-gradient(#080d14aa,#080d14aa),url("' + background.value + '") center / cover fixed');
  } else if (background.type === 'gradient' && typeof background.value === 'string' &&
      /^(linear-gradient\(|radial-gradient\()/.test(background.value)) {
    document.body.style.setProperty('--launcher-background', background.value);
  } else {
    return;
  }
  if (persist) saveBackground(background);
}

presetControl.addEventListener('change', () => {
  const value = backgroundPresets[presetControl.value];
  if (value) applyBackground({type:'gradient',value});
  backgroundStatus.textContent = 'Готовая тема применена.';
});

document.getElementById('apply-custom-background').addEventListener('click', () => {
  const value = 'linear-gradient(' + Number(angleControl.value) + 'deg,' +
    colorOne.value + ' 0%,' + colorTwo.value + ' 100%)';
  applyBackground({type:'gradient',value});
  backgroundStatus.textContent = 'Твой градиент применён и сохранён.';
});

imageControl.addEventListener('change', () => {
  const file = imageControl.files && imageControl.files[0];
  if (!file) return;
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    backgroundStatus.textContent = 'Выбери PNG, JPG или WEBP.';
    imageControl.value = '';
    return;
  }
  if (file.size > 3 * 1024 * 1024) {
    backgroundStatus.textContent = 'Картинка должна быть не больше 3 МБ.';
    imageControl.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      applyBackground({type:'image',value:reader.result});
      backgroundStatus.textContent = 'Картинка установлена и сохранена.';
    }
  };
  reader.onerror = () => {
    backgroundStatus.textContent = 'Не удалось прочитать изображение.';
  };
  reader.readAsDataURL(file);
});

document.getElementById('reset-background').addEventListener('click', () => {
  applyBackground({type:'gradient',value:backgroundPresets.default});
  presetControl.value = 'default';
  colorOne.value = '#102c20';
  colorTwo.value = '#172b45';
  angleControl.value = '135';
  backgroundStatus.textContent = 'Стандартный фон восстановлен.';
});

try {
  const savedBackground = JSON.parse(localStorage.getItem('launcherBackground') || 'null');
  if (savedBackground) applyBackground(savedBackground, false);
  else applyBackground({type:'gradient',value:backgroundPresets.default}, false);
} catch {
  applyBackground({type:'gradient',value:backgroundPresets.default}, false);
}


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


// ПРОФИЛЬ ИГРОКА — локальные настройки, аватар и достижения
const AVATAR_PRESETS = [
  {id:'creeper',emoji:'🟩',label:'Крипер',bg:'linear-gradient(145deg,#b4f36b,#287a42)'},
  {id:'ender',emoji:'👾',label:'Эндер',bg:'linear-gradient(145deg,#b58aff,#38245f)'},
  {id:'diamond',emoji:'💎',label:'Алмаз',bg:'linear-gradient(145deg,#8ef5ff,#167b9c)'},
  {id:'pig',emoji:'🐷',label:'Свинка',bg:'linear-gradient(145deg,#ffb0c7,#a84f78)'},
  {id:'bee',emoji:'🐝',label:'Пчела',bg:'linear-gradient(145deg,#ffe66b,#a86b19)'},
  {id:'fox',emoji:'🦊',label:'Лиса',bg:'linear-gradient(145deg,#ffb16b,#a44228)'},
  {id:'wolf',emoji:'🐺',label:'Волк',bg:'linear-gradient(145deg,#c7d7e8,#52647c)'},
  {id:'dragon',emoji:'🐉',label:'Дракон',bg:'linear-gradient(145deg,#7af0a0,#145d49)'}
];
const defaultAvatar = 'preset:creeper';
function getProfileStats(){
  try { const value=JSON.parse(localStorage.getItem('blockProfileStats')||'{}'); return value&&typeof value==='object'?value:{}; }
  catch { return {}; }
}
function getSkinExports(){ return Number(localStorage.getItem('blockSkinExports')||0)||0; }
function currentAvatar(){ return localStorage.getItem('blockPlayerAvatar')||defaultAvatar; }
function makeAvatarData(preset){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#ffffff" stop-opacity=".24"/><stop offset="1" stop-color="#000000" stop-opacity=".2"/></linearGradient></defs><rect width="256" height="256" rx="48" fill="'+preset.bg+'"/><rect width="256" height="256" rx="48" fill="url(#g)"/><text x="128" y="169" font-size="142" text-anchor="middle">'+preset.emoji+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
function renderAvatar(){
  const avatar=currentAvatar();
  const image=document.getElementById('profile-avatar-large');
  if(!image) return;
  if(avatar.startsWith('data:image/')) image.src=avatar;
  else {
    const preset=AVATAR_PRESETS.find(item=>'preset:'+item.id===avatar)||AVATAR_PRESETS[0];
    image.src=makeAvatarData(preset);
  }
}
function renderPlayerProfile(){
  const name=(nickname.value||'').trim()||'Игрок';
  const stats=getProfileStats();
  const launches=Number(stats.launches)||0;
  const skins=getSkinExports();
  const serverCount=Array.isArray(servers)?servers.length:0;
  document.getElementById('profile-name').textContent=name;
  document.getElementById('profile-heading').textContent=name;
  document.getElementById('stat-launches').textContent=launches;
  document.getElementById('stat-skins').textContent=skins;
  document.getElementById('stat-servers').textContent=serverCount;
  document.getElementById('profile-rank').textContent=launches>=25?'МАСТЕР':launches>=5?'ИССЛЕДОВАТЕЛЬ':'НОВИЧОК';
  const achievements=[
    {id:'profile',title:'Первый образ',desc:'Настрой ник или аватар профиля',ok:!!localStorage.getItem('nickname')||currentAvatar()!==defaultAvatar,icon:'🧑‍🎨'},
    {id:'launch1',title:'Первый запуск',desc:'Запусти Minecraft через лаунчер',ok:launches>=1,icon:'⛏️'},
    {id:'launch5',title:'Пять приключений',desc:'Запусти игру 5 раз',ok:launches>=5,icon:'⭐'},
    {id:'skin',title:'Пиксельный художник',desc:'Экспортируй свой скин в PNG',ok:skins>=1,icon:'🎨'},
    {id:'servers',title:'На связи',desc:'Сохрани первый сервер',ok:serverCount>=1,icon:'🌐'}
  ];
  const list=document.getElementById('achievement-list');
  list.replaceChildren();
  achievements.forEach(item=>{
    const card=document.createElement('article');
    card.className='achievement'+(item.ok?' unlocked':'');
    const icon=document.createElement('span');icon.className='achievement-icon';icon.textContent=item.icon;
    const copy=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;
    const desc=document.createElement('small');desc.textContent=item.desc;copy.append(title,desc);
    const state=document.createElement('span');state.className='achievement-state';state.textContent=item.ok?'✓':'🔒';
    card.append(icon,copy,state);list.appendChild(card);
  });
  document.getElementById('achievement-progress').textContent=achievements.filter(item=>item.ok).length+' / '+achievements.length;
  renderAvatar();
}
function renderAvatarPresets(){
  const container=document.getElementById('avatar-presets');
  AVATAR_PRESETS.forEach(preset=>{
    const button=document.createElement('button');button.type='button';button.className='avatar-preset';button.title=preset.label;button.setAttribute('aria-label','Выбрать аватар: '+preset.label);
    const icon=document.createElement('span');icon.textContent=preset.emoji;icon.style.background=preset.bg;button.appendChild(icon);
    button.addEventListener('click',()=>{localStorage.setItem('blockPlayerAvatar','preset:'+preset.id);document.getElementById('avatar-status').textContent='Аватар «'+preset.label+'» выбран.';renderPlayerProfile();});
    container.appendChild(button);
  });
}
renderAvatarPresets();
document.getElementById('profile-avatar-file').addEventListener('change',()=>{
  const file=document.getElementById('profile-avatar-file').files?.[0];
  if(!file)return;
  if(!/^image\/(png|jpeg|webp)$/.test(file.type)||file.size>2*1024*1024){
    document.getElementById('avatar-status').textContent='Нужна картинка PNG, JPG или WEBP размером до 2 МБ.';return;
  }
  const reader=new FileReader();
  reader.onload=()=>{
    if(typeof reader.result==='string'){
      try{localStorage.setItem('blockPlayerAvatar',reader.result);document.getElementById('avatar-status').textContent='Твоя аватарка сохранена на этом компьютере.';renderPlayerProfile();}
      catch{document.getElementById('avatar-status').textContent='Картинка слишком большая для локального хранилища.';}
    }
  };
  reader.readAsDataURL(file);
});
document.getElementById('avatar-reset').addEventListener('click',()=>{
  localStorage.setItem('blockPlayerAvatar',defaultAvatar);
  document.getElementById('avatar-status').textContent='Стандартный аватар восстановлен.';
  renderPlayerProfile();
});
nickname.addEventListener('input',renderPlayerProfile);
const originalSaveSettings=saveSettings;
saveSettings=function(){originalSaveSettings();renderPlayerProfile();};
const originalRenderServers=renderServers;
renderServers=function(){originalRenderServers();renderPlayerProfile();};
renderPlayerProfile();
