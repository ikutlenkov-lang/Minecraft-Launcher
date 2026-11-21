
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {

  launch: options =>
    ipcRenderer.invoke('minecraft:launch', options),

  getVersions: () =>
    ipcRenderer.invoke('minecraft:get-versions'),

  getDefaultDirectory: () =>
    ipcRenderer.invoke('minecraft:get-default-directory'),

  selectDirectory: () =>
    ipcRenderer.invoke('minecraft:select-directory'),

  onProgress: callback => {
    const listener = (_event, data) => callback(data);

    ipcRenderer.on('minecraft:progress', listener);

    return () => {
      ipcRenderer.removeListener(
        'minecraft:progress',
        listener
      );
    };
  }

});
