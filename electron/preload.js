// EclipseOS — secure preload bridge.
// The ONLY surface the renderer gets. contextIsolation keeps the page's
// JavaScript away from Node; this file exposes a small, allowlisted API.
// External sites loaded in iframes (the Eclipse Browser app) never receive
// this bridge — the preload only applies to the desktop's own main frame.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eclipseNative', {
  isNative: true,
  // WinGet-backed application store (Windows 10/11)
  apps: {
    search: (query) => ipcRenderer.invoke('apps:search', query),
    listInstalled: () => ipcRenderer.invoke('apps:list'),
    updates: () => ipcRenderer.invoke('apps:updates'),
    details: (id) => ipcRenderer.invoke('apps:details', id),
    install: (id) => ipcRenderer.invoke('apps:install', id),
    uninstall: (id) => ipcRenderer.invoke('apps:uninstall', id),
    update: (id) => ipcRenderer.invoke('apps:update', id),
    launch: (opts) => ipcRenderer.invoke('apps:launch', opts),
  },
  // real system information
  system: {
    info: () => ipcRenderer.invoke('system:info'),
  },
  // real shell execution for the Terminal app
  shell: {
    exec: (opts) => ipcRenderer.invoke('shell:exec', opts),
  },
  // live WinGet progress stream (install/uninstall/update)
  onStoreProgress: (callback) => {
    const handler = (_event, data) => callback(data);
    ipcRenderer.on('store:progress', handler);
    return () => ipcRenderer.removeListener('store:progress', handler);
  },
});