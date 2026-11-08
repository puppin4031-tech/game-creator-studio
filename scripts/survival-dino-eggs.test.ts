import { describe, expect, it } from 'bun:test';
import { eggReady, eggSpawnsNear, eggWalkedM } from '../src/lib/survival/dinoEggs';

describe('dino eggs', () => {
  it('needs 300m of walking to hatch', () => {
    expect(eggReady({ id: 'e', startSteps: 10 }, 24)).toBe(false); // 280m
    expect(eggReady({ id: 'e', startSteps: 10 }, 25)).toBe(true); // 300m
    expect(eggWalkedM({ id: 'e', startSteps: 10 }, 25)).toBe(300);
  });
  it('hides collected eggs for 24h', () => {
    const c = { lat: 37.5, lng: 127 };
    let spawns = eggSpawnsNear(c, {}, 0);
    for (let k = 0; !spawns.length && k < 50; k++) spawns = eggSpawnsNear({ lat: c.lat + k * 0.003, lng: c.lng }, {}, 0);
    const egg = spawns[0];
    const near = { lat: egg.lat, lng: egg.lng };
    expect(eggSpawnsNear(near, { [egg.id]: 0 }, 23 * 3600_000).some(e => e.id === egg.id)).toBe(false);
    expect(eggSpawnsNear(near, { [egg.id]: 0 }, 24 * 3600_000).some(e => e.id === egg.id)).toBe(true);
  });
});
