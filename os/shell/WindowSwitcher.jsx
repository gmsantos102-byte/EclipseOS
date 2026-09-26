// EclipseOS — Alt+Tab window switcher overlay
import React from 'react';
import { getApp } from '../appRegistry';
import { cn } from '@/lib/utils';

export default function WindowSwitcher({ switcher, count }) {
  if (!switcher || !switcher.ids.length) return null;
  const { ids, index } = switcher;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center pointer-events-none bg-black/20 backdrop-blur-[1px] fade-in">
      <div className="flex items-end gap-4 rounded-3xl glass-strong px-6 py-5 shadow-2xl shadow-black/60 menu-in">
        {ids.map((id, i) => {
          const w = id; // { id, appId, title }
          const app = getApp(w.appId);
          const active = i === index;
          return (
            <div
              key={w.id}
              className={cn(
                'flex flex-col items-center gap-2 w-32 transition-all duration-150',
                active ? 'opacity-100' : 'opacity-50'
              )}
            >
              <div className={cn(
                'rounded-2xl p-4 flex items-center justify-center transition-all',
                active ? 'bg-primary/25 ring-2 ring-primary scale-110' : 'bg-muted/60'
              )}>
                {app && <app.icon className="w-9 h-9" />}
              </div>
              <span className={cn('text-[11px] text-center leading-tight line-clamp-2 w-full', active && 'font-semibold text-primary')}>
                {w.title}
              </span>
            </div>
          );
        })}
      </div>
      <p className="absolute bottom-24 text-xs text-muted-foreground">Tab to cycle · Shift+Tab reverse · release Alt to select · Esc to cancel</p>
    </div>
  );
}