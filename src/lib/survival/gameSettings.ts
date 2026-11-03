export type VolumeLevel = 'S' | 'M' | 'L';
export interface GameSettings { bgm: boolean; sfx: boolean; volume: VolumeLevel; haptic: boolean }

const KEY = 'survival-settings-v1';
export const DEFAULT_SETTINGS: GameSettings = { bgm: false, sfx: true, volume: 'M', haptic: true };
export const VOLUME_GAIN: Record<VolumeLevel, number> = { S: 0.08, M: 0.18, L: 0.32 };

export function loadSettings(): GameSettings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULT_SETTINGS; }
}

const listeners = new Set<(s: GameSettings) => void>();
let current = typeof window === 'undefined' ? DEFAULT_SETTINGS : loadSettings();

export function getSettings() { return current; }
export function saveSettings(patch: Partial<GameSettings>) {
  current = { ...current, ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* storage full */ }
  listeners.forEach((l) => l(current));
}
export function subscribeSettings(l: (s: GameSettings) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

// ---- Sound (WebAudio synth, no asset files) ----
let ctx: AudioContext | null = null;
function audio() {
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export type SfxId = 'hit' | 'warn' | 'notify' | 'emote';
const SFX: Record<SfxId, { f: number[]; type: OscillatorType; dur: number }> = {
  hit: { f: [140, 70], type: 'square', dur: 0.12 },
  warn: { f: [880, 440, 880, 440], type: 'sawtooth', dur: 0.12 },
  notify: { f: [660, 990], type: 'triangle', dur: 0.1 },
  emote: { f: [520, 780], type: 'sine', dur: 0.09 },
};

export function playSfx(id: SfxId) {
  const s = current; if (!s.sfx) return;
  const a = audio(); if (!a) return;
  const def = SFX[id]; let t = a.currentTime;
  for (const f of def.f) {
    const o = a.createOscillator(); const g = a.createGain();
    o.type = def.type; o.frequency.value = f;
    g.gain.setValueAtTime(VOLUME_GAIN[s.volume], t); g.gain.exponentialRampToValueAtTime(0.0001, t + def.dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + def.dur); t += def.dur;
  }
}

export function haptic(pattern: number | number[]) {
  if (!current.haptic) return;
  try { navigator.vibrate?.(pattern); } catch { /* unsupported */ }
}

// ---- BGM: soft procedural pentatonic loop ----
const SCALE = [220, 247, 277, 330, 370, 440, 494];
let bgmTimer: number | null = null;
export function setBgmPlaying(on: boolean) {
  if (!on) { if (bgmTimer !== null) window.clearInterval(bgmTimer); bgmTimer = null; return; }
  if (bgmTimer !== null) return;
  bgmTimer = window.setInterval(() => {
    const a = audio(); if (!a || !current.bgm) return;
    const o = a.createOscillator(); const g = a.createGain(); const t = a.currentTime;
    o.type = 'sine'; o.frequency.value = SCALE[Math.floor(Math.random() * SCALE.length)] / (Math.random() < 0.3 ? 2 : 1);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(VOLUME_GAIN[current.volume] * 0.35, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + 2.3);
  }, 1400);
}
