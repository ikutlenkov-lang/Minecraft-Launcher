(() => {
  const canvas = document.getElementById('skin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const color = document.getElementById('skin-color');
  const brush = document.getElementById('skin-brush');
  const status = document.getElementById('skin-status');
  const importInput = document.getElementById('skin-import');
  const MIN_VISIBLE_PIXELS = 350;
  let drawing = false;
  let mode = 'draw';

  ctx.clearRect(0, 0, 64, 64);

  function pixel(x, y, w, h, fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }

  const skinStyles = {
    classic: {
      name: 'Классика', skin: '#c98f68', hair: '#493126',
      shirt: '#2874a9', shirtDark: '#174d78', pants: '#303b62',
      boots: '#28232a', accent: '#e5c18a'
    },
    creeper: {
      name: 'Крипер', skin: '#65b94b', hair: '#287b38',
      shirt: '#4b9d3e', shirtDark: '#286b32', pants: '#315c38',
      boots: '#243d2b', accent: '#17251a'
    },
    knight: {
      name: 'Рыцарь', skin: '#c5a58a', hair: '#332d31',
      shirt: '#697786', shirtDark: '#394858', pants: '#35445b',
      boots: '#252d3a', accent: '#d7b45e'
    },
    explorer: {
      name: 'Исследователь', skin: '#b97950', hair: '#38251c',
      shirt: '#557c42', shirtDark: '#35532e', pants: '#76502f',
      boots: '#453020', accent: '#d9b35e'
    }
  };

  function applySkinPreset(key) {
    const s = skinStyles[key];
    if (!s) return;
    ctx.clearRect(0, 0, 64, 64);

    // Заполняем UV-текстуру базовым цветом, чтобы готовая модель
    // не получилась прозрачной из-за пустых участков.
    pixel(0, 0, 64, 64, s.skin);

    // Голова: верх, лицо и боковые поверхности.
    pixel(8, 0, 8, 8, s.hair);
    pixel(8, 8, 8, 8, s.skin);
    pixel(8, 8, 8, 2, s.hair);
    pixel(0, 8, 8, 8, s.hair);
    pixel(16, 8, 8, 8, s.hair);
    pixel(24, 8, 8, 8, s.skin);
    pixel(9, 12, 2, 1, s.accent);
    pixel(14, 12, 2, 1, s.accent);
    pixel(11, 14, 2, 1, s.hair);

    // Торс, рукава и ноги — цветовые блоки в основных зонах текстуры.
    pixel(20, 20, 8, 12, s.shirt);
    pixel(20, 20, 8, 2, s.accent);
    pixel(20, 30, 8, 2, s.shirtDark);
    pixel(44, 20, 4, 12, s.shirt);
    pixel(36, 52, 4, 12, s.shirtDark);
    pixel(4, 20, 4, 12, s.pants);
    pixel(20, 52, 4, 12, s.pants);
    pixel(4, 30, 4, 2, s.boots);
    pixel(20, 62, 4, 2, s.boots);

    // Детали выбранного образа.
    if (key === 'creeper') {
      pixel(9, 11, 2, 3, s.accent);
      pixel(14, 11, 2, 3, s.accent);
      pixel(11, 14, 2, 2, s.accent);
      pixel(22, 23, 4, 5, s.shirtDark);
      pixel(23, 24, 2, 3, s.accent);
    } else if (key === 'knight') {
      pixel(8, 0, 8, 3, s.accent);
      pixel(9, 10, 6, 2, s.hair);
      pixel(10, 12, 1, 1, '#26313d');
      pixel(14, 12, 1, 1, '#26313d');
      pixel(22, 22, 4, 8, s.shirtDark);
      pixel(23, 23, 2, 2, s.accent);
      pixel(20, 28, 8, 2, s.accent);
    } else if (key === 'explorer') {
      pixel(8, 0, 8, 3, s.accent);
      pixel(7, 8, 10, 2, s.accent);
      pixel(20, 22, 8, 2, s.accent);
      pixel(22, 24, 4, 4, s.shirtDark);
      pixel(44, 22, 4, 3, s.accent);
    } else {
      pixel(20, 23, 8, 1, s.accent);
      pixel(23, 24, 2, 5, s.shirtDark);
    }

    status.textContent = 'Образец «' + s.name + '» применён. Теперь можешь менять любые пиксели.';
  }

  document.querySelectorAll('[data-skin-preset]').forEach(button => {
    button.addEventListener('click', () => applySkinPreset(button.dataset.skinPreset));
  });

  function pixelPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(63, Math.floor((event.clientX - rect.left) / rect.width * 64))),
      y: Math.max(0, Math.min(63, Math.floor((event.clientY - rect.top) / rect.height * 64)))
    };
  }

  function paint(event) {
    const p = pixelPoint(event);
    const size = Number(brush.value);
    if (mode === 'erase') ctx.clearRect(p.x, p.y, size, size);
    else {
      ctx.fillStyle = color.value;
      ctx.fillRect(p.x, p.y, size, size);
    }
  }

  function visiblePixelCount() {
    const data = ctx.getImageData(0, 0, 64, 64).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 12) count++;
    return count;
  }

  canvas.addEventListener('pointerdown', event => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    paint(event);
  });
  canvas.addEventListener('pointermove', event => { if (drawing) paint(event); });
  canvas.addEventListener('pointerup', () => { drawing = false; });
  canvas.addEventListener('pointercancel', () => { drawing = false; });

  document.getElementById('skin-pencil').addEventListener('click', () => {
    mode = 'draw';
    document.getElementById('skin-pencil').classList.add('selected');
    document.getElementById('skin-eraser').classList.remove('selected');
    status.textContent = 'Кисть выбрана. Можно рисовать!';
  });
  document.getElementById('skin-eraser').addEventListener('click', () => {
    mode = 'erase';
    document.getElementById('skin-eraser').classList.add('selected');
    document.getElementById('skin-pencil').classList.remove('selected');
    status.textContent = 'Ластик выбран. Стирая, следи за количеством заполненных пикселей.';
  });
  document.getElementById('skin-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, 64, 64);
    status.textContent = 'Холст очищен. Выбери образец или нарисуй полноценную текстуру.';
  });
  document.getElementById('skin-export').addEventListener('click', () => {
    const count = visiblePixelCount();
    if (count < MIN_VISIBLE_PIXELS) {
      status.textContent = 'Скин почти пустой (' + count + ' заполненных пикселей). Добавь детали или выбери готовый образец — экспорт пока заблокирован.';
      return;
    }
    const link = document.createElement('a');
    link.download = 'my-minecraft-skin.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    const exported = (Number(localStorage.getItem('blockSkinExports') || 0) || 0) + 1;
    localStorage.setItem('blockSkinExports', String(exported));
    if (typeof renderPlayerProfile === 'function') renderPlayerProfile();
    status.textContent = 'PNG-файл скина скачан. Заполнено пикселей: ' + count + ' из 4096.';
  });
  importInput.addEventListener('change', () => {
    const file = importInput.files && importInput.files[0];
    if (!file) return;
    if (file.type !== 'image/png') {
      status.textContent = 'Выбери PNG-файл.';
      importInput.value = '';
      return;
    }
    const image = new Image();
    image.onload = () => {
      if (image.width !== 64 || image.height !== 64) {
        status.textContent = 'Нужен PNG размером ровно 64 × 64 пикселя.';
        URL.revokeObjectURL(image.src);
        importInput.value = '';
        return;
      }
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(image, 0, 0);
      const count = visiblePixelCount();
      status.textContent = count < MIN_VISIBLE_PIXELS
        ? 'Файл загружен, но скин почти пустой (' + count + ' пикселей). Добавь детали или выбери образец.'
        : 'Скин загружен на холст. Заполнено пикселей: ' + count + '.';
      URL.revokeObjectURL(image.src);
      importInput.value = '';
    };
    image.onerror = () => { status.textContent = 'Не удалось прочитать PNG.'; };
    image.src = URL.createObjectURL(file);
  });
})();