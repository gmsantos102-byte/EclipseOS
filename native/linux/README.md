# EclipseOS — the real Linux desktop (native layer)

This folder is the **native Linux desktop** part of EclipseOS. It is a real
project with real code — and an honest status: **the Base44 builder cannot
compile, run, or test any of it.** Building and testing happen on your Linux
machine (bare metal or VM), following the steps below. Nothing here pretends
otherwise.

## Architecture

```
Linux kernel
  → DRM / libinput / PipeWire (hardware)
    → SDDM (login)
      → our Wayland session  (session/eclipseos-session)
        → OUR compositor (compositor/ — Smithay/Rust, NOT KDE/GNOME)
          → xdg-shell applications (any Wayland app)
          → our desktop shell UI (the Base44 project — phase 2 integration)
```

The compositor is ours, written with [Smithay](https://github.com/smithay/smithay)
in Rust. The desktop shell (the beautiful UI in `src/`) stays this project's
identity; phase 2 connects it to the compositor as a real client.

## What each part is

| Path | What it is | Status |
|---|---|---|
| `compositor/` | Real Wayland compositor (Rust + Smithay): xdg-shell windows, seat, keyboard focus, floating layout. DRM/KMS backend, workspaces, tiling and layer-shell panel are marked `TODO(phase 2)` in the code. | **Scaffold — must be built & tested on Linux.** Written against current Smithay; expect minor API drift to reconcile with the [official template](https://github.com/smithay/smithay/tree/master/template). |
| `session/eclipseos-wayland.desktop` | SDDM session entry so login boots OUR compositor (never another DE). | Ready; installed by the script. |
| `session/eclipseos-session` | Session launcher + logging + safe mode. | Ready. |
| `scripts/install.sh` | Distro detection (apt/dnf/pacman/zypper), dependency install, `cargo build --release`, binary + session install with config backups. | Ready; **runs only on Linux**. |
| `scripts/uninstall.sh` | Reverses the install exactly; `--purge` also removes user config. | Ready. |

## Build & install (on a real Linux machine)

```bash
git clone <your-repo> && cd <your-repo>/src/native/linux
chmod +x scripts/*.sh session/eclipseos-session
./scripts/install.sh        # builds + registers the SDDM session
# log out → pick "EclipseOS" at the SDDM login screen
```

Requirements: Rust (`rustup`), a GPU with DRM/KMS, SDDM. For development
inside an existing X11/Wayland session, the compositor currently uses
Smithay's winit backend, so you can run `cargo run` directly to see it open
as a window and manage test clients (`weston-terminal`, `foot`…).

## Recovery (a broken desktop can never lock you out)

- Pick any other session at the SDDM login screen — installing EclipseOS
  never modifies or removes them.
- Safe mode: `ECLIPSEOS_SAFE=1 eclipseos-session` resets compositor state
  before starting.
- Full removal: `./scripts/uninstall.sh` (add `--purge` for configs).

## Security notes

- The desktop never runs as root; `sudo` is used only during install.
- Uninstall/install scripts back up anything they touch and reverse cleanly.
- The compositor is phase-1 minimal on purpose: no plugin/extension loading,
  no downloading or auto-executing of anything. Later Flatpak integration
  (phase 3) will use validated flatpak IDs only.

## Honest roadmap

1. **Phase 2 (next):** DRM/KMS + libseat backend for real hardware sessions;
   workspaces; tiling; layer-shell panel; connect the Base44 shell UI as a
   real compositor client.
2. **Phase 3:** application store backends for Linux — `flatpak search/install`
   with validated IDs; distro package detection.
3. **Phase 4:** real FS/terminal/camera/audio (PipeWire) for the desktop apps
   through the same validated-IPC discipline as the Windows Electron layer
   (`src/electron/`).

See `docs/BUILDING-WINDOWS.md` for the Windows (WinGet/Electron) side and
`docs/BUILDING-LINUX.md` for the overall desktop-application roadmap.