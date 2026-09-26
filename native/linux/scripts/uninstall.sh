#!/bin/bash
# EclipseOS — uninstaller. Reverses install.sh exactly: removes the binary,
# the session launcher and the SDDM session entry. Keeps (never deletes) the
# user's eclipseos config/logs unless --purge is given.
set -euo pipefail

BIN_DST="/usr/local/bin/eclipse-compositor"
SESSION_SH_DST="/usr/local/bin/eclipseos-session"
SESSION_DST="/usr/share/wayland-sessions/eclipseos-wayland.desktop"
PURGE=0
[ "${1:-}" = "--purge" ] && PURGE=1

say() { printf '\033[1;34m[eclipseos]\033[0m %s\n' "$*"; }

say "removing SDDM session entry and binaries…"
sudo rm -f "$BIN_DST" "$SESSION_SH_DST" "$SESSION_DST"
sudo update-desktop-database /usr/share/wayland-sessions 2>/dev/null || true

# restore the most recent backup if one exists
for f in "$SESSION_DST"; do
    LATEST="$(ls -t "$f".eos-backup-* 2>/dev/null | head -1 || true)"
    [ -n "$LATEST" ] && sudo mv "$LATEST" "$f" && say "restored backup: $f"
done

if [ "$PURGE" = "1" ]; then
    say "--purge: removing user config and logs"
    rm -rf "${XDG_CONFIG_HOME:-$HOME/.config}/eclipseos" \
           "${XDG_STATE_HOME:-$HOME/.local/state}/eclipseos"
else
    say "kept your config/logs (run with --purge to remove them)."
fi
say "uninstalled. SDDM no longer lists EclipseOS."