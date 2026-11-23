(() => {
  const worldSelect = document.getElementById('backup-world-select');
  const backupList = document.getElementById('world-backup-list');
  const status = document.getElementById('backup-status');
  const count = document.getElementById('backup-count');
  const createButton = document.getElementById('create-world-backup');
  const refreshButton = document.getElementById('refresh-backups');
  if (!worldSelect || !backupList) return;

  const currentRoot = () => document.getElementById('game-directory')?.value.trim() || '';

  function setStatus(message, error = false) {
    status.textContent = message;
    status.style.color = error ? '#ff9b9b' : 'var(--green)';
  }

  async function loadWorlds() {
    const root = currentRoot();
    worldSelect.replaceChildren();
    if (!root) {
      worldSelect.add(new Option('Сначала выбери папку Minecraft', ''));
      return;
    }
    try {
      const worlds = await window.launcher.listWorlds(root);
      if (!worlds.length) {
        worldSelect.add(new Option('Миры не найдены в папке saves', ''));
        return;
      }
      worlds.forEach(world => worldSelect.add(new Option(world.name, world.name)));
    } catch (error) {
      worldSelect.add(new Option('Не удалось загрузить миры', ''));
      setStatus(error.message, true);
    }
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Дата неизвестна' : date.toLocaleString('ru-RU');
  }

  async function loadBackups() {
    backupList.replaceChildren();
    try {
      const backups = await window.launcher.listWorldBackups();
      count.textContent = backups.length + (backups.length === 1 ? ' копия' : ' копий');
      if (!backups.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Пока нет резервных копий. Создай первую копию своего мира.';
        empty.style.color = 'var(--muted)';
        empty.style.fontSize = '12px';
        backupList.appendChild(empty);
        return;
      }
      backups.forEach(backup => {
        const card = document.createElement('article');
        card.className = 'world-backup-item';
        const title = document.createElement('strong');
        title.textContent = '🌍 ' + backup.worldName;
        const date = document.createElement('small');
        date.textContent = 'Создана: ' + formatDate(backup.createdAt);
        const restore = document.createElement('button');
        restore.className = 'restore-backup';
        restore.type = 'button';
        restore.textContent = '↶ Восстановить';
        restore.addEventListener('click', async () => {
          if (!currentRoot()) return setStatus('Сначала выбери папку Minecraft в настройках.', true);
          if (!confirm('Восстановить мир «' + backup.worldName + '» из этой копии? Текущая версия будет сохранена отдельно.')) return;
          restore.disabled = true;
          setStatus('Восстанавливаем мир…');
          try {
            const result = await window.launcher.restoreWorldBackup(currentRoot(), backup.id);
            setStatus('✓ Мир «' + result.worldName + '» восстановлен. ' +
              (result.safetyCopyCreated ? 'Текущая версия сохранена отдельной копией.' : ''));
            await loadWorlds();
            await loadBackups();
          } catch (error) {
            setStatus('Ошибка восстановления: ' + error.message, true);
          } finally {
            restore.disabled = false;
          }
        });
        card.append(title, date, restore);
        backupList.appendChild(card);
      });
    } catch (error) {
      setStatus('Не удалось загрузить копии: ' + error.message, true);
    }
  }

  createButton.addEventListener('click', async () => {
    const root = currentRoot();
    const worldName = worldSelect.value;
    if (!root) return setStatus('Сначала выбери папку Minecraft в настройках.', true);
    if (!worldName) return setStatus('Сначала выбери мир из списка.', true);
    createButton.disabled = true;
    setStatus('Создаём копию мира. Это может занять некоторое время…');
    try {
      const result = await window.launcher.createWorldBackup(root, worldName);
      setStatus('✓ Резервная копия мира «' + result.worldName + '» создана!');
      await loadBackups();
    } catch (error) {
      setStatus('Не удалось создать копию: ' + error.message, true);
    } finally {
      createButton.disabled = false;
    }
  });

  refreshButton.addEventListener('click', async () => {
    setStatus('Обновляем список…');
    await loadWorlds();
    await loadBackups();
    setStatus('Список обновлён.');
  });

  document.querySelectorAll('[data-page="backups"],[data-go="backups"]').forEach(button => {
    button.addEventListener('click', () => {
      loadWorlds();
      loadBackups();
    });
  });

  window.addEventListener('focus', () => {
    if (document.getElementById('backups')?.classList.contains('active')) {
      loadWorlds();
      loadBackups();
    }
  });

  loadWorlds();
  loadBackups();
})();
