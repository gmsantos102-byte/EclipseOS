# EclipseOS — Architecture

A browser-based desktop shell (Stage 1) designed to evolve into a native Linux desktop
(Stages 2–5). This document explains how the system works and where the browser/native
boundary sits.

## Layers

```
Desktop UI (src/os/shell, src/os/wm, src/os/apps)
        ↓ uses
Central state store (src/os/store.jsx)  — windows, workspaces, settings, notifications
        ↓ delegates to
Services (src/os/fsService.js, src/os/lib/*)  — pure, swappable implementations
        ↓ (future)
Native bridge (Electron/Tauri/Qt) → Linux services (D-Bus, NetworkManager, BlueZ, PipeWire, UPower)
```

The UI never touches "host" APIs directly. Every OS capability is a service with a
browser implementation today and a documented native counterpart for later stages.

## Window management (src/os/wm)

- Every window: unique id, position, size, min/max size, z-index, focus, minimized,
  maximized, workspace, title, app id.
- Dragging: pointer events on the title bar; maximized windows restore under the cursor
  proportionally, like real desktops.
- Snapping: pointer near screen edges/corners shows a translucent preview; halves,
  quarters, and top-maximize are committed on release. Cancelable by continuing the drag.
- Resizing: 8 edge/corner handles with correct cursors and minimum sizes.
- Focus: z-order increments; the active window gets a subtle ring/shadow distinction.
- Alt+Tab: overlay switcher ordered by recency; Esc cancels, releasing Alt selects.

## Applications (src/os/appRegistry.js + apps/AppComponents.jsx)

Apps register desktop-entry-style metadata (id, name, generic name, comment, icon,
categories, default/min size, singleton, MIME types). Adding an app = one registry entry
+ one component mapping. The same registry feeds the launcher, search, taskbar, and
file associations (`appForMime`).

## Virtual filesystem (src/os/fsService.js)

Pure, serializable tree with XDG-style user dirs (~, Desktop, Documents, …), a Trash
directory with restore support, MIME classification, search, and metadata. All file
operations actually mutate and persist (localStorage). A native backend can implement
the same function signatures against a real filesystem without UI changes.

## Terminal (src/os/apps/TerminalApp.jsx)

A whitelisted shell emulation: commands are parsed and dispatched in-app against the
virtual filesystem. No arbitrary host execution ever occurs. Tab completion, history,
multiple tabs, and per-window state are supported.

## State & persistence (src/os/store.jsx)

Single source of truth (one reducer + context) — the taskbar, window manager, panels,
and notifications all read the same state, so they can never disagree. Persisted to
localStorage: settings, workspaces, pinned apps, icon positions, filesystem,
notifications. Reloads keep the environment intact.

## Theme engine

HSL design tokens in `src/index.css` (`.dark` is violet-tinted). Accent colour, panel
translucency, reduced motion, and high contrast are applied as CSS variables on the root
element by the store — one change updates the whole desktop.

## What is simulated vs. real

| Capability | Status |
|---|---|
| Windows, workspaces, launcher, taskbar, menus | Fully real (in-app) |
| Filesystem | Virtual, persistent (browser storage) |
| Terminal | Whitelisted emulation |
| Wi-Fi / Bluetooth / battery / audio / displays | Simulated with honest UI labels |
| Notifications | Shell-internal (future: org.freedesktop.Notifications) |
| Power actions | Simulated transitions — a web page cannot control a host |
| Persistence | Real (localStorage) |

The full matrix is surfaced in **Settings → Developer** and the **About** app.

## Native roadmap (Stage 2+)

1. Wrap in **Tauri** (chosen for low memory, Rust safety, and GTK/Wayland friendliness).
2. Implement the service interfaces over the Tauri IPC: filesystem (real POSIX + XDG),
   processes, NetworkManager (D-Bus), BlueZ, PipeWire, UPower, logind.
3. Package as Flatpak/AppImage; desktop entry via the existing registry model.
4. Wayland session integration (wlroots-based compositor or KDE/GNOME session shell).

## Development

```bash
npm install       # install dependencies
npm run dev       # dev server
npm run build     # production build
npm run preview   # preview production build
```

Linux notes: Node.js 18+ and npm are required. On Debian/Ubuntu:
`sudo apt install nodejs npm`. On Fedora: `sudo dnf install nodejs npm`.
On Arch: `sudo pacman -S nodejs npm`.