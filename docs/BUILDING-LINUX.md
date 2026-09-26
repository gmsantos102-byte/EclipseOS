# EclipseOS on Linux — status & roadmap (no fakes)

## What runs today

- **The desktop shell** (`src/`) runs in any Chromium browser on Linux — it is
  a normal web app.
- **The Electron native layer** (`electron/`) is Windows-focused right now
  (WinGet + PowerShell). Electron itself also runs on Linux; the same secure
  bridge pattern applies once Linux backends are added.

## What a real Linux desktop requires (and this environment cannot provide)

A real Linux desktop is **not** a web page. It is:

```
Linux kernel → DRM/input → **Wayland compositor** → desktop shell → apps
login: SDDM → our Wayland session
apps: Flatpak / distro packages
```

The compositor (window management, surfaces, input, multi-monitor, workspaces)
is native code — realistically **Smithay (Rust)** or **wlroots (C)**. It
cannot be built, run, or tested from the Base44 builder, which only runs
browser JavaScript. Building one is a real, multi-month native project that
belongs in its own repository with its own toolchain on a Linux machine or VM.

## Phased, honest roadmap

| Phase | Work | Where |
|---|---|---|
| 1 (done) | Desktop shell UI + Electron bridge + real WinGet store on Windows | this repo |
| 2 | Linux package backends for the store: `flatpak search/install`, distro package manager detection (apt/dnf/pacman) | `electron/main.js` |
| 3 | Real Filesystem IPC (`fs.*` via validated paths) wired into Files/Editor | `electron/main.js` + `src/os` |
| 4 | Real terminal: node-pty + the user's real shell (bash/zsh/fish) wired into the Terminal app | after export (`node-pty` needs native build) |
| 5 | Real audio/network/bluetooth status (PipeWire, NetworkManager, BlueZ) via IPC | `electron/main.js` |
| 6 | **Wayland compositor (own, not KDE/GNOME)** + SDDM session file + install scripts | started — `src/native/linux/` (Smithay/Rust scaffold, session, installers) |

Phase 6 is the only part that makes this "a real Linux desktop OS" — its
starting scaffold now lives in `src/native/linux/` (compositor source, SDDM
session entry, safe mode, distro-aware install/uninstall scripts). Phases
2–5 make it a real desktop *application* on Linux. Both must be built and
tested on a real Linux machine.

## SDDM session (phase 6 sketch, for when the native repo exists)

```
/usr/share/wayland-sessions/eclipseos.desktop
  → Exec=eclipse-compositor --shell eclipse-shell
```

The compositor repo would provide safe-mode/fallback configuration, install
and uninstall scripts with config backup, and logging — per the project's
recovery requirements. Until that repo exists on real hardware, nothing here
claims to be a Wayland session.