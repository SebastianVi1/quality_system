const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('qcDashboard', {
  version: process.versions,
});
