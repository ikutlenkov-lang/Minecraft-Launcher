
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('launcher', {
  getPlatform: () => process.platform,
  getVersion: () => '1.0.0'
});
