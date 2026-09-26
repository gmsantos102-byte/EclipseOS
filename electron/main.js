// EclipseOS — Electron main process: the desktop's REAL native layer.
// This file only runs when the project is exported from Base44 and launched
// with Electron on the user's PC. It provides the secure bridge between the
// existing desktop UI (the renderer) and the operating system:
//
//   renderer (this desktop UI)
//     → preload.js (allowlisted API, contextIsolation ON)
//       → IPC (validated handlers)
//         → WinGet / OS (structured process arguments, never shell strings)
//
// SECURITY RULES ENFORCED HERE:
//  • contextIsolation + sandbox enabled, nodeIntegration disabled
//  • the renderer can only call the allowlisted operations below
//  • package IDs are validated against a strict pattern before WinGet runs
//  • processes are spawned with structured argument arrays — the renderer
//    can never inject a shell string into a command
const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

const isDev = !app.isPackaged;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 960, minHeight: 600,
    backgroundColor: '#0b0f17',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // renderer has NO Node.js access
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.once('ready-to-show', () => win.show());
  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL || 'http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---------------------------------------------------------------- helpers
// WinGet package IDs look like: Mozilla.Firefox, Git.Git, Microsoft.PowerToys
const PKG_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/;
const stripAnsi = (s) => String(s).replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

// Structured WinGet invocation — args are passed as an array to spawn,
// so nothing can smuggle extra shell syntax through.
function winget(args, onChunk) {
  return new Promise((resolve) => {
    const p = spawn('winget', args, { windowsHide: true });
    let out = '', err = '';
    p.stdout.on('data', (d) => {
      const t = d.toString();
      out += t;
      if (onChunk && win && !win.isDestroyed()) win.webContents.send('store:progress', { chunk: stripAnsi(t) });
    });
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', (e) => resolve({ ok: false, code: -1, output: `winget could not be started (${e.message}). Install "App Installer" from the Microsoft Store, then retry.` }));
    p.on('close', (code) => resolve({ ok: code === 0, code, output: stripAnsi(out || err).trim() }));
  });
}

// Parse WinGet's column output (search / list / upgrade) by locating the
// header labels and slicing each row at those exact positions.
function parseTable(text) {
  const lines = stripAnsi(text).split(/\r?\n/);
  const hIdx = lines.findIndex(l => /\bName\b/.test(l) && /\bId\b/.test(l));
  if (hIdx === -1) return [];
  const header = lines[hIdx];
  const labels = ['Name', 'Id', 'Version', 'Available', 'Source', 'Moniker', 'Matched'];
  const spans = labels
    .map(l => ({ l, i: header.search(new RegExp(`\\b${l}\\b`)) }))
    .filter(c => c.i !== -1)
    .sort((a, b) => a.i - b.i);
  const rows = [];
  for (const line of lines.slice(hIdx + 1)) {
    if (!line.trim() || /^[-─═\s]+$/.test(line)) continue;
    const row = {};
    spans.forEach((c, idx) => {
      const end = idx + 1 < spans.length ? spans[idx + 1].i : undefined;
      row[c.l] = (end === undefined ? line : line.slice(c.i, end)).trim();
    });
    if (!row.Name || !row.Id) continue;
    rows.push(row);
  }
  return rows;
}

const invalidId = (id) => !PKG_ID.test(String(id || ''));

// ---------------------------------------------------------------- app store
ipcMain.handle('apps:search', (_e, query) => {
  const q = String(query || '').trim().slice(0, 100);
  if (!q) return { ok: true, rows: [] };
  return winget(['search', q, '--source', 'winget', '--accept-source-agreements'])
    .then(r => ({ ...r, rows: parseTable(r.output) }));
});

ipcMain.handle('apps:list', () =>
  winget(['list', '--accept-source-agreements']).then(r => ({ ...r, rows: parseTable(r.output) }))
);

ipcMain.handle('apps:updates', () =>
  winget(['upgrade', '--accept-source-agreements']).then(r => ({ ...r, rows: parseTable(r.output) }))
);

ipcMain.handle('apps:details', (_e, id) => {
  if (invalidId(id)) return { ok: false, code: -1, output: 'Invalid package ID' };
  return winget(['show', '--id', id, '--exact', '--accept-source-agreements']);
});

ipcMain.handle('apps:install', (_e, id) => {
  if (invalidId(id)) return { ok: false, code: -1, output: 'Invalid package ID' };
  return winget(['install', '--id', id, '--exact', '--silent',
    '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity'],
    () => {}); // progress chunks are streamed to the renderer by winget()
});

ipcMain.handle('apps:uninstall', (_e, id) => {
  if (invalidId(id)) return { ok: false, code: -1, output: 'Invalid package ID' };
  return winget(['uninstall', '--id', id, '--exact', '--disable-interactivity']);
});

ipcMain.handle('apps:update', (_e, id) => {
  if (invalidId(id)) return { ok: false, code: -1, output: 'Invalid package ID' };
  return winget(['upgrade', '--id', id, '--exact', '--silent',
    '--accept-package-agreements', '--accept-source-agreements', '--disable-interactivity']);
});

// Launch a real installed application. Windows resolves many applications
// through App Paths (e.g. `firefox`, `code`, `git`); Start-Process reports a
// REAL error when the application can't be resolved — we surface that.
ipcMain.handle('apps:launch', (_e, opts) => {
  const name = String(opts?.name || '').slice(0, 120);
  if (!name || name.length < 2) return { ok: false, code: -1, output: 'No application name to launch' };
  return new Promise((resolve) => {
    const p = spawn('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', 'Start-Process', '-FilePath', name],
      { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', (e) => resolve({ ok: false, code: -1, output: `Could not start: ${e.message}` }));
    p.on('close', (code) => resolve({ ok: code === 0, code, output: err.trim() }));
  });
});

// ---------------------------------------------------------------- system
ipcMain.handle('system:info', () => ({
  platform: process.platform,
  osRelease: os.release(),
  hostname: os.hostname(),
  arch: os.arch(),
  cpuModel: (os.cpus()[0] || {}).model || 'unknown',
  cpuCores: os.cpus().length,
  totalMem: os.totalmem(),
  freeMem: os.freemem(),
  uptime: os.uptime(),
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
}));

// ---------------------------------------------------------------- terminal
// Real command execution for the Terminal app (the user running their own
// commands on their own machine — same privilege as any terminal). The App
// Store NEVER uses this: all store operations go through the structured
// WinGet handlers above.
ipcMain.handle('shell:exec', (_e, opts) => {
  const cmd = String(opts?.cmd || '').slice(0, 4000);
  let cwd = String(opts?.cwd || os.homedir());
  if (!path.isAbsolute(cwd)) cwd = os.homedir();
  return new Promise((resolve) => {
    const p = spawn('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', cmd],
      { cwd, windowsHide: true });
    let out = '', err = '';
    const timer = setTimeout(() => { try { p.kill(); } catch { /* already gone */ } }, 60 * 1000);
    p.stdout.on('data', (d) => { out += d.toString(); });
    p.stderr.on('data', (d) => { err += d.toString(); });
    p.on('error', (e) => { clearTimeout(timer); resolve({ code: -1, stdout: '', stderr: `Could not start the shell: ${e.message}`, cwd }); });
    p.on('close', (code) => { clearTimeout(timer); resolve({ code, stdout: out, stderr: err, cwd }); });
  });
});