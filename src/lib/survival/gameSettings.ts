import bgmTrack from '@/assets/bone_flute_ritual.mp3.asset.json';

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

// ---- BGM: looping track ----
let bgmEl: HTMLAudioElement | null = null;
let bgmWanted = false;
function syncBgmVolume() { if (bgmEl) bgmEl.volume = Math.min(1, VOLUME_GAIN[current.volume] * 1.8); }
listeners.add(syncBgmVolume);
function tryPlay() {
  if (!bgmEl || !bgmWanted) return;
  bgmEl.play().catch(() => {
    // Autoplay blocked: start on the next user gesture.
    const resume = () => { window.removeEventListener('pointerdown', resume); tryPlay(); };
    window.addEventListener('pointerdown', resume, { once: true });
  });
}
export function setBgmPlaying(on: boolean) {
  bgmWanted = on;
  if (!on) { bgmEl?.pause(); return; }
  if (!bgmEl) { bgmEl = new Audio(bgmTrack.url); bgmEl.loop = true; bgmEl.preload = 'auto'; }
  syncBgmVolume();
  tryPlay();
}
