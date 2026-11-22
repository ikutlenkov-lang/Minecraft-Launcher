(() => {
  const canvas = document.getElementById('skin-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const color = document.getElementById('skin-color');
  const brush = document.getElementById('skin-brush');
  const status = document.getElementById('skin-status');
  const importInput = document.getElementById('skin-import');
  let drawing = false;
  let mode = 'draw';

  ctx.clearRect(0, 0, 64, 64);

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
    ctx.fillStyle = mode === 'erase' ? 'rgba(0,0,0,0)' : color.value;
    if (mode === 'erase') ctx.clearRect(p.x, p.y, size, size);
    else ctx.fillRect(p.x, p.y, size, size);
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
    status.textContent = 'Ластик выбран. Стирай ненужные пиксели.';
  });
  document.getElementById('skin-clear').addEventListener('click', () => {
    ctx.clearRect(0, 0, 64, 64);
    status.textContent = 'Холст очищен.';
  });
  document.getElementById('skin-export').addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'my-minecraft-skin.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    status.textContent = 'PNG-файл скина скачан.';
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
      status.textContent = 'Скин загружен на холст!';
      URL.revokeObjectURL(image.src);
      importInput.value = '';
    };
    image.onerror = () => { status.textContent = 'Не удалось прочитать PNG.'; };
    image.src = URL.createObjectURL(file);
  });
})();
