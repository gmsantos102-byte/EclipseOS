#!/bin/bash
# EclipseOS — native Linux installer.
# Detects the distribution, installs ONLY the packages the compositor needs,
# builds it, and registers the Wayland session with SDDM. Non-destructive:
# existing files are backed up with a timestamp, and uninstall.sh reverses
# everything. Run as the user who will use the desktop (sudo is requested
# only for the system-wide copy steps; the desktop never runs as root).
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"   # native/linux
SESSION_SRC="$HERE/session"
COMP_SRC="$HERE/compositor"
BIN_DST="/usr/local/bin/eclipse-compositor"
SESSION_DST="/usr/share/wayland-sessions/eclipseos-wayland.desktop"
SESSION_SH_DST="/usr/local/bin/eclipseos-session"
STAMP="$(date +%Y%m%d-%H%M%S)"

say() { printf '\033[1;34m[eclipseos]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[eclipseos] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

backup() { [ -f "$1" ] && sudo cp -a "$1" "$1.eos-backup-$STAMP" && say "backed up $1"; }

# ---------------------------------------------------------------- distro check
if ! command -v apt-get >/dev/null 2>&1 && ! command -v dnf >/dev/null 2>&1 \
   && ! command -v pacman >/dev/null 2>&1 && ! command -v zypper >/dev/null 2>&1; then
    die "Unsupported distribution: need apt, dnf, pacman or zypper."
fi
ARCH="$(uname -m)"
[ "$ARCH" = "x86_64" ] || [ "$ARCH" = "aarch64" ] || die "Unsupported architecture: $ARCH"

# ---------------------------------------------------------------- requirements
command -v cargo >/dev/null 2>&1 || die "Rust not found. Install it with: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
say "toolchain: $(rustc --version)"

# Distinct per-distro dependency sets (nothing installed blindly).
DEPS_COMMON="wayland-protocols pkg-config libxkbcommon"
if command -v apt-get >/dev/null 2>&1; then
    say "detected Debian/Ubuntu — installing build + session dependencies"
    sudo apt-get update
    sudo apt-get install -y build-essential cmake libudev-dev libseat-dev libinput-dev \
        libgbm-dev libdrm-dev libegl1-mesa-dev libxkbcommon-dev wayland-protocols \
        pkg-config sddm pipewire || die "dependency installation failed"
elif command -v dnf >/dev/null 2>&1; then
    say "detected Fedora — installing build + session dependencies"
    sudo dnf install -y gcc cmake make systemd-devel seatd-devel libinput-devel \
        mesa-libgbm-devel libdrm-devel mesa-libEGL-devel libxkbcommon-devel \
        wayland-protocols-devel pkgconf sddm pipewire || die "dependency installation failed"
elif command -v pacman >/dev/null 2>&1; then
    say "detected Arch — installing build + session dependencies"
    sudo pacman -Sy --needed --noconfirm base-devel cmake systemd seatd libinput \
        mesa libdrm libxkbcommon wayland-protocols pkgconf sddm pipewire || die "dependency installation failed"
elif command -v zypper >/dev/null 2>&1; then
    say "detected openSUSE — installing build + session dependencies"
    sudo zypper install -y gcc cmake make libsystemd0 seatd-devel libinput-devel \
        Mesa-libgbm-devel libdrm-devel libgbm-devel libxkbcommon-devel \
        wayland-protocols pkg-config sddm pipewire || die "dependency installation failed"
fi

# ---------------------------------------------------------------- build
say "building the compositor (release)…"
cd "$COMP_SRC"
cargo build --release || die "build failed — see the compiler output above. The scaffold targets current Smithay; reconcile API drift against https://github.com/smithay/smithay/tree/master/template"

# ---------------------------------------------------------------- install
say "installing…"
backup "$BIN_DST"
sudo install -Dm755 "target/release/eclipse-compositor" "$BIN_DST"
sudo install -Dm755 "$SESSION_SRC/eclipseos-session" "$SESSION_SH_DST"
backup "$SESSION_DST"
sudo install -Dm644 "$SESSION_SRC/eclipseos-wayland.desktop" "$SESSION_DST"
sudo update-desktop-database /usr/share/wayland-sessions 2>/dev/null || true

say "installed."
say "  binary     : $BIN_DST"
say "  session    : $SESSION_DST"
say "log out and pick 'EclipseOS' at the SDDM login screen to start the session."
say "if the session ever fails to start: choose another session at SDDM and run"
say "  ECLIPSEOS_SAFE=1 eclipseos-session   # to reset compositor state (safe mode)"