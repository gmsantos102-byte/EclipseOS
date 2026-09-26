// EclipseOS — desktop icons: selection, drag positioning, rename, context menus
import React, { useMemo, useRef, useState } from 'react';
import { Trash2, House, Pencil, FolderOpen, Copy, Scissors, ClipboardPaste, Info, X, FolderPlus, RefreshCw,   Image as ImageIcon, Monitor, Info as InfoIcon, LayoutGrid, ArrowUpDown, ExternalLink, Globe } from 'lucide-react';
import { useOS, TOP_PANEL_H } from '../store';
import { HOME } from '../fsService';
import { getApp, appForMime } from '../appRegistry';
import { openFsItem, appsForFile } from '../kernel/fileAssociations';
import { fileIconFor } from '../lib/fileIcons';
import ContextMenu from './ContextMenu';
import { clipboard } from '../lib/clipboard';
import { fmtBytes } from '../lib/utils-os';

const DESKTOP_DIR = `${HOME}/Desktop`;
const GRID = { x: 26, y: TOP_PANEL_H + 128, dx: 96, dy: 104, cols: 6 };

export default function DesktopIcons() {
  const os = useOS();
  const { state } = os;
  const [menu, setMenu] = useState(null); // {x,y,items}
  const [selected, setSelected] = useState([]);
  const [renaming, setRenaming] = useState(null); // key
  const [renameValue, setRenameValue] = useState('');
  const [props, setProps] = useState(null); // properties entry
  const dragRef = useRef(null);

  const desktopFiles = os.fsList(DESKTOP_DIR);
  const installedWebApps = useMemo(
    () => state.settings.installedWebApps || [],
    [state.settings.installedWebApps]
  );
  const shortcuts = useMemo(() => ([
    { key: 'trash', label: 'Trash', onOpen: () => os.openApp('files', { path: '/.Trash' }), Icon: Trash2, tile: 'from-slate-500/90 to-slate-800/90', isDir: false, fixed: true },
    { key: 'home', label: 'Home', onOpen: () => os.openApp('files', { path: HOME }), Icon: House, tile: 'from-sky-500/90 to-blue-700/90', isDir: true, fixed: true },
    ...installedWebApps.map(app => ({
      key: app.key, label: app.name, onOpen: () => os.openApp(app.key),
      Icon: Globe, tile: 'from-slate-600 to-slate-900', img: app.avatar, fixed: true,
    })),
  ]), [os, installedWebApps]);

  const items = useMemo(() => {
    const fsItems = desktopFiles.map(e => {
      const { Icon, color } = fileIconFor(e);
      return {
        key: 'file:' + e.path, label: e.name, entry: e, isDir: e.isDir,
        onOpen: () => e.isDir ? os.openApp('files', { path: e.path }) : openFile(e),
        Icon, color, tile: e.isDir ? 'from-amber-400/90 to-orange-500/90' : null,
      };
    });
    return [...shortcuts, ...fsItems];
  }, [desktopFiles, os]);

  const openFile = (entry) => openFsItem(os, entry.path); // file associations + installed .desktop apps

  const posOf = (key, i) => {
    if (state.iconPositions[key]) return state.iconPositions[key];
    const col = Math.floor(i / GRID.cols);
    const row = i % GRID.cols;
    return { x: GRID.x + col * GRID.dx, y: GRID.y + row * GRID.dy };
  };

  // ----- dragging (pointer-based, click-safe) -----
  const onPointerDown = (e, key, i) => {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY, pos: posOf(key, i) };
    let moved = false;
    const onMove = (ev) => {
      const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      dragRef.current = { key };
      const el = document.getElementById('desk-icon-' + CSS.escape(key));
      if (el) el.style.transform = `translate(${dx}px, ${dy}px)`;
      dragRef.current = { key, dx, dy };
    };
    const onUp = (ev) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      const el = document.getElementById('desk-icon-' + CSS.escape(key));
      if (el) el.style.transform = '';
      if (moved) {
        const dx = ev.clientX - start.x, dy = ev.clientY - start.y;
        os.setIconPos(key, { x: Math.max(4, start.pos.x + dx), y: Math.max(TOP_PANEL_H + 8, start.pos.y + dy) });
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const onItemClick = (e, key, item) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) setSelected(s => s.includes(key) ? s.filter(k => k !== key) : [...s, key]);
    else setSelected([key]);
    if (item.entry && renaming !== key) { /* selection only */ }
  };

  const onItemDouble = (item) => {
    if (item.fixed) item.onOpen();
    else item.onOpen();
  };

  const openWith = (item) => {
    if (item.isDir) os.openApp('files', { path: item.entry.path });
    else os.openApp(appForMime(item.entry.mime), { path: item.entry.path });
  };

  const iconMenu = (e, item) => {
    e.preventDefault(); e.stopPropagation();
    setSelected([item.key]);
    const fsItems = item.fixed ? [] : [
      { separator: true },
      { label: 'Cut', icon: Scissors, onClick: () => clipboard.set('cut', [item.entry.path]) },
      { label: 'Copy', icon: Copy, onClick: () => clipboard.set('copy', [item.entry.path]) },
      { label: 'Rename…', icon: Pencil, onClick: () => { setRenaming(item.key); setRenameValue(item.label); } },
      { label: 'Move to Trash', icon: Trash2, danger: true, onClick: () => os.fsTrash(item.entry.path) },
      { label: 'Properties', icon: Info, onClick: () => setProps(item) },
    ];
    const withApps = item.fixed || item.isDir ? [] : appsForFile(item.entry.name, item.entry.mime);
    const openWithList = withApps.length ? withApps : ['editor', 'images', 'media', 'browser'].map(getApp).filter(Boolean);
    const apps = item.fixed || item.isDir ? [] : openWithList.map(a => ({
      label: 'Open with ' + a.name, icon: ExternalLink, onClick: () => os.openApp(a.id, { path: item.entry.path }),
    }));
    setMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'Open', icon: FolderOpen, onClick: () => item.onOpen() },
        ...(item.fixed ? [] : [{ label: 'Open With', icon: ExternalLink, submenu: apps }]),
        ...fsItems,
      ],
    });
  };

  const desktopMenu = (e) => {
    e.preventDefault();
    const clip = clipboard.get();
    setMenu({
      x: e.clientX, y: e.clientY,
      items: [
        { label: 'New Folder', icon: FolderPlus, onClick: () => { os.fsCreateFolder(DESKTOP_DIR, 'New Folder'); } },
        { label: 'New Text File', icon: Pencil, onClick: () => { os.fsCreateFile(DESKTOP_DIR, 'Untitled.txt', ''); } },
        { separator: true },
        { label: 'Paste', icon: ClipboardPaste, disabled: !clip, onClick: () => { const c = clipboard.get(); if (!c) return; c.paths.forEach(p => c.op === 'copy' ? os.fsCopy(p, DESKTOP_DIR) : os.fsMove(p, DESKTOP_DIR)); if (c.op === 'cut') clipboard.clear(); } },
        { separator: true },
        { label: 'Arrange Icons', icon: LayoutGrid, onClick: () => os.clearIconPos() },
        { label: 'Refresh', icon: RefreshCw, shortcut: 'F5', onClick: () => {} },
        { separator: true },
        { label: 'Change Wallpaper…', icon: ImageIcon, onClick: () => os.openApp('settings', { section: 'wallpaper' }) },
        { label: 'Display Settings', icon: Monitor, onClick: () => os.openApp('settings', { section: 'displays' }) },
        { label: 'About EclipseOS', icon: InfoIcon, onClick: () => os.openApp('about') },
      ],
    });
  };

  const commitRename = (item) => {
    if (renameValue.trim() && renameValue !== item.label) os.fsRename(item.entry.path, renameValue.trim());
    setRenaming(null);
  };

  return (
    <div
      className="absolute inset-0"
      onContextMenu={desktopMenu}
      onPointerDown={(e) => { if (e.target === e.currentTarget) setSelected([]); }}
      onDragOver={(e) => { if (e.dataTransfer.types.includes('application/eclipse-paths')) e.preventDefault(); }}
      onDrop={(e) => {
        const data = e.dataTransfer.getData('application/eclipse-paths');
        if (!data) return;
        e.preventDefault();
        JSON.parse(data).forEach(p => { if (p.startsWith(HOME) && p !== DESKTOP_DIR) os.fsMove(p, DESKTOP_DIR); });
      }}
    >
      {items.map((item, i) => {
        const pos = posOf(item.key, i);
        const isSel = selected.includes(item.key);
        return (
          <button
            key={item.key}
            id={'desk-icon-' + item.key}
            onClick={(e) => onItemClick(e, item.key, item)}
            onDoubleClick={() => onItemDouble(item)}
            onPointerDown={(e) => onPointerDown(e, item.key, i)}
            onContextMenu={(e) => iconMenu(e, item)}
            className="absolute w-[84px] flex flex-col items-center gap-1.5 pt-2 pb-1.5 rounded-xl text-center select-none cursor-default group transition-colors"
            style={{ left: pos.x, top: pos.y }}
          >
            <span className={
              'w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-black/30 ring-1 ring-white/10 transition ' +
              (item.tile ? `bg-gradient-to-br ${item.tile}` : 'bg-white/10 backdrop-blur-md')
            }>
              {item.img
                ? <img src={item.img} alt="" className="w-7 h-7 rounded-lg object-cover ring-1 ring-white/20" />
                : item.tile
                  ? <item.Icon className="w-6 h-6 text-white drop-shadow" />
                  : <item.Icon className={'w-6 h-6 drop-shadow ' + (item.color || 'text-slate-200')} />}
            </span>
            {renaming === item.key ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(item);
                  if (e.key === 'Escape') setRenaming(null);
                }}
                className="w-[80px] rounded-md bg-background text-foreground px-1 py-0.5 text-[11px] text-center outline-none ring-1 ring-primary"
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={'px-1.5 py-0.5 rounded-md text-[11px] leading-tight line-clamp-2 break-words ' + (isSel ? 'bg-primary/80 text-primary-foreground' : 'text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,.8)]')}>
                {item.label}
              </span>
            )}
            {isSel && <span className="absolute inset-0 rounded-xl ring-2 ring-primary/60 bg-primary/10" />}
          </button>
        );
      })}

      {props && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40" onClick={() => setProps(null)}>
          <div className="w-80 rounded-2xl glass-strong p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Properties</h3>
              <button onClick={() => setProps(null)} className="p-1 rounded-md hover:bg-white/10"><X className="w-4 h-4" /></button>
            </div>
            {props.entry ? (
              <dl className="text-xs space-y-2">
                {[['Name', props.entry.name], ['Type', props.entry.isDir ? 'Folder' : props.entry.mime], ['Location', DESKTOP_DIR], ['Size', props.entry.isDir ? fmtBytes(props.entry.size) : fmtBytes(props.entry.size ?? props.entry.node?.size)], ['Modified', new Date(props.entry.modified || Date.now()).toLocaleString()]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="truncate max-w-[190px]">{String(v)}</dd></div>
                ))}
              </dl>
            ) : <p className="text-xs text-muted-foreground">{props.label} — system shortcut</p>}
            <button onClick={() => setProps(null)} className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-1.5 text-xs font-medium hover:opacity-90">Close</button>
          </div>
        </div>
      )}

      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  );
}