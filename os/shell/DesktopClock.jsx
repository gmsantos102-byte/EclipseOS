// EclipseOS — desktop clock widget (signature top-left widget)
import React from 'react';
import { useNow, fmtDateLong } from '../lib/utils-os';
import { useOS } from '../store';

export default function DesktopClock() {
  const { state } = useOS();
  const now = useNow(state.settings.showSeconds ? 1000 : 15000);

  if (!state.settings.showDesktopClock) return null;

  const hours = state.settings.clock24
    ? now.toLocaleTimeString(undefined, { hour: '2-digit', hour12: false })
    : now.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true }).replace(/\s?[AP]M/, '');
  const rest = now.toLocaleTimeString(undefined, { minute: '2-digit', ...(state.settings.showSeconds ? { second: '2-digit' } : {}), ...(state.settings.clock24 ? {} : { hour12: false }) });
  const meridiem = state.settings.clock24 ? '' : now.getHours() >= 12 ? 'PM' : 'AM';

  return (
    <div className="absolute left-8 top-14 select-none pointer-events-none drop-shadow-[0_2px_12px_rgba(0,0,0,.55)]">
      <div className="flex flex-col leading-none tracking-[0.35em] text-[11px] font-medium text-white/70">
        <span>{fmtDateLong(now).toUpperCase()}</span>
      </div>
      <div className="mt-2 flex items-start gap-2 text-white">
        <span className="text-[64px] font-light leading-none tabular-nums">{hours}</span>
        <span className="text-[64px] font-light leading-none tabular-nums text-violet-300/90">:{rest}</span>
        {meridiem && <span className="mt-2 text-sm font-medium text-violet-300/90">{meridiem}</span>}
      </div>
    </div>
  );
}