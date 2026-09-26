// EclipseOS — reusable context menu (close on outside click / Escape, viewport-clamped)
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [subOpen, setSubOpen] = useState(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      left: Math.max(6, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(6, Math.min(y, window.innerHeight - r.height - 8)),
    });
  }, [x, y]);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('pointerdown', close, true);
    document.addEventListener('keydown', esc, true);
    return () => {
      document.removeEventListener('pointerdown', close, true);
      document.removeEventListener('keydown', esc, true);
    };
  }, [onClose]);

  const run = (item) => { if (item.disabled) return; onClose(); item.onClick?.(); };

  return (
    <div
      ref={ref}
      role="menu"
      className="fixed z-[9999] min-w-[210px] max-w-[280px] rounded-xl glass-strong py-1.5 shadow-2xl shadow-black/50 menu-in text-[13px] select-none"
      style={pos}
    >
      {items.map((item, i) => {
        if (item.separator) return <div key={i} className="my-1 h-px bg-border/70" />;
        const Icon = item.icon;
        return (
          <div key={i} className="relative">
            <button
              role="menuitem"
              disabled={item.disabled}
              onClick={() => (item.submenu ? undefined : run(item))}
              onMouseEnter={() => setSubOpen(item.submenu ? i : null)}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-1.5 text-left rounded-lg mx-0 transition-colors',
                item.disabled ? 'opacity-40 cursor-default' : 'hover:bg-primary/15 focus:bg-primary/20 outline-none',
                item.danger && !item.disabled && 'text-rose-400'
              )}
            >
              {Icon && <Icon className="w-4 h-4 shrink-0 opacity-80" />}
              <span className="flex-1 truncate">{item.label}</span>
              {item.shortcut && <span className="text-[11px] opacity-50">{item.shortcut}</span>}
              {item.submenu && <span className="text-[10px] opacity-60">▸</span>}
            </button>
            {item.submenu && subOpen === i && (
              <div className="absolute left-[calc(100%-4px)] top-0 min-w-[190px] rounded-xl glass-strong py-1.5 shadow-2xl shadow-black/50 menu-in">
                {item.submenu.map((s, j) => (
                  <button
                    key={j}
                    role="menuitem"
                    disabled={s.disabled}
                    onClick={() => run(s)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-1.5 text-left rounded-lg transition-colors',
                      s.disabled ? 'opacity-40 cursor-default' : 'hover:bg-primary/15 outline-none',
                      s.danger && 'text-rose-400'
                    )}
                  >
                    {s.icon && React.createElement(s.icon, { className: 'w-4 h-4 opacity-80' })}
                    <span className="flex-1 truncate">{s.label}</span>
                    {s.shortcut && <span className="text-[11px] opacity-50">{s.shortcut}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}