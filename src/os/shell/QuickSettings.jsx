// EclipseOS — quick settings popover (Wi-Fi / Bluetooth / volume / brightness / toggles)
import React, { useState } from 'react';
import {
  Wifi, WifiOff, Bluetooth, BluetoothOff, Volume2, VolumeX, Sun, Moon, Bell, BellOff,
  Plane, BatteryCharging, ChevronRight, X,
} from 'lucide-react';
import { useOS } from '../store';
import { WIFI_NETWORKS, BLUETOOTH_DEVICES } from '../defaults';
import { cn } from '@/lib/utils';

function Tile({ icon: Icon, label, active, onClick, onExpand }) {
  return (
    <div className="flex gap-1.5">
      <button
        onClick={onClick}
        className={cn(
          'flex-1 flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-colors',
          active ? 'bg-primary text-primary-foreground' : 'bg-muted/70 hover:bg-muted text-foreground'
        )}
      >
        <Icon className="w-[18px] h-[18px] shrink-0" />
        <span className="text-xs font-medium leading-tight">{label}</span>
      </button>
      {onExpand && (
        <button
          onClick={onExpand}
          aria-label="More options"
          className="px-1.5 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

function Slider({ icon: Icon, value, onChange, min = 0, max = 100, onIconClick }) {
  return (
    <div className="flex items-center gap-3">
      <button onClick={onIconClick} className="text-muted-foreground hover:text-foreground transition-colors"><Icon className="w-[18px] h-[18px]" /></button>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="os-slider flex-1"
      />
      <span className="text-xs tabular-nums text-muted-foreground w-8 text-right">{value}</span>
    </div>
  );
}

export default function QuickSettings({ onClose }) {
  const os = useOS();
  const s = os.state.settings;
  const [expand, setExpand] = useState(null); // 'wifi' | 'bluetooth' | null

  return (
    <div className="w-[340px] rounded-2xl glass-strong p-4 shadow-2xl shadow-black/50 menu-in">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Quick settings</div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <Tile
          icon={s.wifi.enabled && !s.airplane ? Wifi : WifiOff}
          label={s.airplane ? 'Airplane' : s.wifi.enabled ? s.wifi.ssid : 'Wi-Fi off'}
          active={s.wifi.enabled && !s.airplane}
          onClick={() => os.setSettings({ wifi: { ...s.wifi, enabled: !s.wifi.enabled } })}
          onExpand={() => setExpand(expand === 'wifi' ? null : 'wifi')}
        />
        <Tile
          icon={s.bluetooth.enabled ? Bluetooth : BluetoothOff}
          label={s.bluetooth.enabled ? 'Bluetooth' : 'Bluetooth off'}
          active={s.bluetooth.enabled && !s.airplane}
          onClick={() => os.setSettings({ bluetooth: { ...s.bluetooth, enabled: !s.bluetooth.enabled } })}
          onExpand={() => setExpand(expand === 'bluetooth' ? null : 'bluetooth')}
        />
        <Tile
          icon={s.dnd ? BellOff : Bell}
          label="Do Not Disturb"
          active={s.dnd}
          onClick={() => os.setSettings({ dnd: !s.dnd })}
        />
        <Tile
          icon={Plane}
          label="Airplane Mode"
          active={s.airplane}
          onClick={() => os.setSettings({ airplane: !s.airplane, wifi: { ...s.wifi, enabled: s.airplane ? s.wifi.enabled : false } })}
        />
        <Tile
          icon={s.nightLight ? Sun : Moon}
          label={s.nightLight ? 'Night Light' : (s.theme === 'dark' ? 'Dark Mode' : 'Light Mode')}
          active={s.nightLight || s.theme === 'dark'}
          onClick={() => s.nightLight ? os.setSettings({ nightLight: false }) : os.setSettings({ theme: s.theme === 'dark' ? 'light' : 'dark' })}
        />
        <Tile
          icon={BatteryCharging}
          label={`${s.battery}% · ${s.batteryMode}`}
          active={s.batteryMode === 'performance'}
          onClick={() => os.setSettings({ batteryMode: { saver: 'balanced', balanced: 'performance', performance: 'saver' }[s.batteryMode] })}
        />
      </div>

      {expand === 'wifi' && (
        <div className="mt-2 rounded-xl bg-muted/40 p-2 space-y-0.5 menu-in">
          {s.airplane && <p className="px-2 py-1.5 text-[11px] text-muted-foreground">Wi-Fi unavailable in airplane mode</p>}
          {!s.airplane && !s.wifi.enabled && (
            <button onClick={() => os.setSettings({ wifi: { ...s.wifi, enabled: true } })} className="w-full text-left px-2 py-1.5 rounded-lg text-xs hover:bg-primary/15">Turn Wi-Fi on</button>
          )}
          {!s.airplane && s.wifi.enabled && WIFI_NETWORKS.map(n => (
            <button
              key={n.ssid}
              onClick={() => os.setSettings({ wifi: { ...s.wifi, ssid: n.ssid } })}
              className={cn('w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-primary/15', s.wifi.ssid === n.ssid && 'bg-primary/15')}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">{n.ssid}</span>
              {n.secure && <span className="text-[10px] text-muted-foreground">secure</span>}
              <span className="text-[10px] text-muted-foreground">{'▂▄▆█'.slice(0, n.strength)}</span>
              {s.wifi.ssid === n.ssid && <span className="text-[10px] font-medium text-primary">Connected</span>}
            </button>
          ))}
        </div>
      )}

      {expand === 'bluetooth' && (
        <div className="mt-2 rounded-xl bg-muted/40 p-2 space-y-0.5 menu-in">
          {s.bluetooth.enabled && BLUETOOTH_DEVICES.map(d => (
            <div key={d.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-primary/10">
              <Bluetooth className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">{d.name}</span>
              <span className={cn('text-[10px]', d.connected ? 'text-primary' : 'text-muted-foreground')}>{d.connected ? 'Connected' : 'Available'}</span>
            </div>
          ))}
          {!s.bluetooth.enabled && <p className="px-2 py-1.5 text-[11px] text-muted-foreground">Bluetooth is off</p>}
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        <Slider icon={s.muted ? VolumeX : Volume2} value={s.muted ? 0 : s.volume}
          onIconClick={() => os.setSettings({ muted: !s.muted })}
          onChange={(v) => os.setSettings({ volume: v, muted: false })} />
        <Slider icon={Sun} min={30} value={s.brightness} onChange={(v) => os.setSettings({ brightness: v })} />
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Battery {s.battery}% · simulated</span>
        <button onClick={() => { onClose(); os.openApp('settings', { section: 'network' }); }} className="hover:text-foreground transition-colors">Network settings →</button>
      </div>
    </div>
  );
}