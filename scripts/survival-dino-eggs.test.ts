import { describe, expect, it } from 'bun:test';
import { advanceEggs, babyFor, eggReady, eggSpawnsNear, eggWalkedM, petFromRow, registerCustomPets, petPool } from '../src/lib/survival/dinoEggs';

describe('dino eggs', () => {
  it('keeps an owned custom species even if its catalog is unavailable or inactive', () => {
    registerCustomPets([]);
    expect(babyFor({ id: 'egg', startSteps: 0, petId: 'custom-pet' }).id).toBe('custom-pet');
    registerCustomPets([{ id: 'custom-pet', name: 'Custom', weight: 0, needM: 300, maxKmh: 8 }]);
    expect(babyFor({ id: 'egg', startSteps: 0, petId: 'custom-pet' }).name).toBe('Custom');
    expect(petPool().some(p => p.id === 'custom-pet')).toBe(false);
    registerCustomPets([]);
  });
  it('legacy eggs need 300m of walking to hatch', () => {
    expect(eggReady({ id: 'e', startSteps: 10 }, 24)).toBe(false);
    expect(eggReady({ id: 'e', startSteps: 10 }, 25)).toBe(true);
    expect(eggWalkedM({ id: 'e', startSteps: 10 }, 25)).toBe(300);
  });
  it('hides collected eggs for 24h', () => {
    let spawns = eggSpawnsNear({ lat: 37.5, lng: 127 }, {}, 0);
    for (let k = 0; !spawns.length && k < 50; k++) spawns = eggSpawnsNear({ lat: 37.5 + k * 0.003, lng: 127 }, {}, 0);
    const egg = spawns[0];
    expect(eggSpawnsNear(egg, { [egg.id]: 0 }, 23 * 3600_000).some(e => e.id === egg.id)).toBe(false);
    expect(eggSpawnsNear(egg, { [egg.id]: 0 }, 24 * 3600_000).some(e => e.id === egg.id)).toBe(true);
  });
  it('steps mode converts 500 steps to 350m', () => {
    expect(petFromRow({ pet_id: 'p', name: 'p', hatch_mode: 'steps', hatch_steps: 500, hatch_meters: 0, max_speed_kmh: 8, weight: 1 }).needM).toBe(350);
  });
  it('speed limit caps at 13 km/h and skips faster moves', () => {
    expect(petFromRow({ pet_id: 'p', name: 'p', hatch_mode: 'distance', hatch_steps: 0, hatch_meters: 300, max_speed_kmh: 30, weight: 1 }).maxKmh).toBe(13);
    const egg = { id: 'e', startSteps: 0, maxKmh: 6, walkedM: 0 };
    expect(advanceEggs([egg], 20, 10_000)[0].walkedM).toBe(0); // 7.2 km/h > 6
    expect(advanceEggs([egg], 20, 15_000)[0].walkedM).toBe(20); // 4.8 km/h
  });
});
