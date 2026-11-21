
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  launch: options => ipcRenderer.invoke('minecraft:launch', options),

  onProgress: callback => {
    const listener = (_event, data) => callback(data);

    ipcRenderer.on('minecraft:progress', listener);

    return () => {
      ipcRenderer.removeListener('minecraft:progress', listener);
    };
  }
});
