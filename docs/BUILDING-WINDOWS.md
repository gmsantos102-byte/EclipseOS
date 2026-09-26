# Building the real EclipseOS desktop for Windows

This project contains **two layers**:

| Layer | Where it runs | What it provides |
|---|---|---|
| `src/` (the Base44 app) | Anywhere — browser or Electron renderer | The entire desktop UI: shell, windows, taskbar, launcher, files, terminal, camera, settings, App Store |
| `electron/` | Only on your PC, after export | The **real native layer**: WinGet app installs, real shell execution, real system info |

In the browser preview the App Store is backed by **live GitHub results** (real
open-source web apps). When the same code runs inside the Electron shell on
your Windows PC, the store switches to **WinGet** — searching, installing,
updating, uninstalling and launching **real Windows applications**. Nothing is
simulated: "Installed" appears only after WinGet exits with code 0.

## 1. Prerequisites (check these on your PC)

```powershell
node --version      # v18+ recommended
npm --version
git --version
winget --version    # WinGet ships with Windows 10/11 "App Installer"
winget search firefox   # should list real packages
```

If `winget` is missing, install **App Installer** from the Microsoft Store, or
download the latest `Microsoft.DesktopAppInstaller_8wekyb3d8bbwe.msixbundle`
from https://github.com/microsoft/winget-cli/releases.

## 2. Export and install

Export this project from Base44 to GitHub (or download the source), then:

```powershell
git clone <your-repo>
cd <your-repo>
npm install
npm install --save-dev electron @electron-forge/cli
npx electron-forge import     # wires the dev/package/make npm scripts
```

(`electron-forge import` may add its own scripts; keep the existing
`dev`/`build` scripts untouched — the desktop UI is a normal Vite build.)

## 3. Run the real desktop

```powershell
npm run dev          # terminal 1 — builds the desktop UI (Vite)
npm run start        # terminal 2 — launches the Electron desktop shell
```

Electron loads `http://localhost:5173` in development; in packaged builds it
loads the compiled `dist/`. Your desktop now has a real title bar-less OS
window, and the App Store operates on WinGet.

## 4. Package a real installer

```powershell
npm run make
```

`electron/forge.config.js` produces a Windows installer (Squirrel) plus a
portable ZIP. Distribute the installer like any desktop application.

## 5. How the secure native bridge works

```
Desktop UI (renderer)
  → window.eclipseNative (electron/preload.js — allowlisted API)
    → ipcMain.handle (electron/main.js — validates every input)
      → winget / powershell (spawned with STRUCTURED ARGUMENTS — never a shell string)
```

Security properties:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`
- The renderer can **only** call: `apps.search / listInstalled / updates /
  details / install / uninstall / update / launch`, `system.info`,
  `shell.exec` (the Terminal app's backend)
- Package IDs are validated with `^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$` before
  any WinGet invocation
- WinGet is always invoked as an **argument array** — the renderer can never
  inject extra command syntax
- Iframes (the Eclipse Browser app) never receive `window.eclipseNative`;
  only the desktop's own main frame does

## 6. What is real, and what is not (yet)

| Feature | In the Electron build |
|---|---|
| App Store install/uninstall/update/launch | **Real (WinGet)** |
| Store search & installed list | **Real (WinGet catalog + your PC)** |
| Package details (publisher, version, license) | **Real (`winget show`)** |
| Install progress | **Real stdout/stderr from WinGet** |
| Terminal `shell.exec` bridge | **Real PowerShell** (see `electron/main.js`; wiring it into the Terminal UI is the next phase) |
| System info bridge | **Real** via Node `os` module |
| File Explorer / Camera / Settings | Still the browser implementation (next phases: real FS IPC, getUserMedia works in Electron too) |

Launch limitations (honest ones): Windows launches applications through App
Paths / registered executables. Apps that register a simple executable name
(`firefox`, `code`, `git`…) launch directly; apps that don't will report a
real error in a notification — never a fake success.

## 7. Troubleshooting

- **"winget could not be started"** → App Installer missing/outdated; see §1.
- **Install shows a UAC prompt** → normal for machine-wide installs; approve it.
- **Nothing appears in Installed after install** → check the notification for
  the real WinGet exit output; run `winget list --id <PackageId>` manually to
  compare.
- **Search returns nothing** → run `winget search <term>` in PowerShell; the
  store shows exactly what WinGet reports.