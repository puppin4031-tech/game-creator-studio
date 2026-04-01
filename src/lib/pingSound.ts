let audioCtx: AudioContext | null = null;

export function playPingSound() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const ctx = audioCtx;
  const now = ctx.currentTime;
  const duration = 1.5;

  // Main tone - pleasant "ping~" bell sound
  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1200, now);
  osc1.frequency.exponentialRampToValueAtTime(800, now + 0.3);
  osc1.frequency.exponentialRampToValueAtTime(600, now + duration);

  const gain1 = ctx.createGain();
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.15, now + 0.4);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + duration);

  // Harmonic overtone for richer "ping" quality
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(2400, now);
  osc2.frequency.exponentialRampToValueAtTime(1200, now + duration);

  const gain2 = ctx.createGain();
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.12, now + 0.01);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

  osc1.connect(gain1).connect(ctx.destination);
  osc2.connect(gain2).connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + duration);
  osc2.stop(now + duration);
}
