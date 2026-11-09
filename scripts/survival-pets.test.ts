import { describe, expect, it } from 'bun:test';
import { advancePetDefense, deployPet, emptyPetDefense, fusePets, hatchPet, migratePets, petStats } from '../src/lib/survival/pets';
import { offsetM } from '../src/lib/survival/geo';
import { creatureDef } from '../src/lib/survival/entities';
import type { WorldCreature } from '../src/lib/survival/types';

const pet = (uid: string, level = 1, speciesId = 'baby_raptor') => ({ ...hatchPet(uid, speciesId, speciesId, []), level, hp: petStats(level).maxHp });
const base = { lat: 37.748, lng: 126.7496 };
const beast: WorldCreature = { ...offsetM(base, 70, 0), kind: 'creature', type: 'raptor', id: 'beast' };
const save = () => ({ pets: [pet('a')], petDefense: emptyPetDefense(), damage: {}, depleted: {}, storage: [] });
describe('pet growth', () => {
  it('hatches at level 1', () => expect(hatchPet('new', 'p', 'P', []).level).toBe(1));
  it('merges two level 1 pets into level 2', () => expect(fusePets([pet('a'), pet('b')], 'a', 'b', 'c')?.pet.level).toBe(2));
  it('merges two level 2 pets into level 3', () => expect(fusePets([pet('a', 2), pet('b', 2)], 'a', 'b', 'c')?.pet.level).toBe(3));
  it('rejects different species', () => expect(fusePets([pet('a'), pet('b', 1, 'other')], 'a', 'b', 'c')).toBeNull());
  it('rejects different levels', () => expect(fusePets([pet('a'), pet('b', 2)], 'a', 'b', 'c')).toBeNull());
  it('rejects locked pets', () => expect(fusePets([{ ...pet('a'), locked: true }, pet('b')], 'a', 'b', 'c')).toBeNull());
  it('caps at level 5', () => expect(fusePets([pet('a', 5), pet('b', 5)], 'a', 'b', 'c')).toBeNull());
  it('requires two distinct owned instances', () => expect(fusePets([pet('a')], 'a', 'a', 'c')).toBeNull());
  it('preserves legacy duplicates as level 1 exactly once', () => {
    const s = migratePets({ babyDinos: ['p', 'p'] }, id => id);
    expect(s.pets.map(p => p.level)).toEqual([1, 1]);
    expect(new Set(s.pets.map(p => p.uid)).size).toBe(2);
    expect(migratePets({ ...s, pets: [] }, id => id).pets).toEqual([]);
  });
  it('keeps the merged pet deployed and removes both ingredients', () => {
    const result = fusePets([pet('a'), pet('b')], 'a', 'b', 'c');
    expect(result?.pets.map(p => p.uid)).toEqual(['c']);
    expect(result?.pet.deployed).toBe(true);
    expect(JSON.parse(JSON.stringify(result?.pets))[0].level).toBe(2);
  });
  it('allows only 3 guards', () => {
    const pets = [pet('a'), pet('b'), pet('c')];
    const fourth = hatchPet('d', 'p', 'P', pets);
    expect(fourth.deployed).toBe(false);
    expect(deployPet([...pets, fourth], 'd')).toBeNull();
  });
  it('adds 25 percent of base stats per level', () => {
    expect(petStats(1)).toEqual({ maxHp: 80, attack: 12 });
    expect(petStats(2)).toEqual({ maxHp: 100, attack: 15 });
    expect(petStats(5)).toEqual({ maxHp: 160, attack: 24 });
  });
});
describe('base pet defense', () => {
  it('retires at 25 percent hp and recovers after 60 seconds', () => {
    const s = { ...save(), pets: [{ ...pet('a'), hp: 21 }] };
    const result = advancePetDefense(s, base, 50, [beast], 100_000, false).state;
    expect(result.pets[0].restUntil).toBe(160_000);
    expect(advancePetDefense(result, base, 50, [], 159_999, false).state.pets[0].hp).toBeLessThan(80);
    expect(advancePetDefense(result, base, 50, [], 160_000, false).state.pets[0].hp).toBe(80);
  });
  it('settles shared damage and loot once', () => {
    const s = { ...save(), damage: { beast: creatureDef('raptor').hp - 1 } };
    const first = advancePetDefense(s, base, 50, [beast], 100_000, false, () => 0);
    expect(first.state.depleted.beast).toBe(100_000);
    expect(first.state.storage.length).toBeGreaterThan(0);
    const second = advancePetDefense(first.state, base, 50, [beast], 102_000, false, () => 0);
    expect(second.state.storage).toEqual(first.state.storage);
    expect(second.hits).toHaveLength(0);
  });
  it('limits loot to 10 kills per day but continues defending', () => {
    let s = save();
    for (let i = 0; i < 10; i++) s = advancePetDefense({ ...s, pets: [pet('a')], damage: { beast: creatureDef('raptor').hp - 1 }, depleted: {} }, base, 50, [beast], 100_000 + i * 2000, false, () => 0).state;
    expect(s.petDefense.claims).toBe(10);
    const next = advancePetDefense({ ...s, pets: [pet('a')], damage: { beast: creatureDef('raptor').hp - 1 }, depleted: {} }, base, 50, [beast], 130_000, false, () => 0);
    expect(next.hits[0].killed).toBe(true);
    expect(next.state.storage).toEqual(s.storage);
    expect(next.state.petDefense.claims).toBe(10);
  });
  it('resets daily allowance on the next UTC day', () => {
    const s = { ...save(), petDefense: { ...emptyPetDefense(), day: '2026-11-08', claims: 10 }, damage: { beast: creatureDef('raptor').hp - 1 } };
    expect(advancePetDefense(s, base, 50, [beast], Date.UTC(2026, 10, 9), false, () => 0).state.petDefense.claims).toBe(1);
  });
  it('ignores passive animals and creatures inside the protected zone', () => {
    expect(advancePetDefense(save(), base, 50, [{ ...beast, type: 'hare' }], 100_000, false).hits).toHaveLength(0);
    expect(advancePetDefense(save(), base, 50, [{ ...beast, ...base }], 100_000, false).hits).toHaveLength(0);
  });
  it('never chases beyond the boundary reach', () => expect(advancePetDefense(save(), base, 50, [{ ...beast, ...offsetM(base, 90, 0) }], 100_000, false).hits).toHaveLength(0));
  it('uses one exchange rather than offline catch-up', () => {
    const result = advancePetDefense(save(), base, 50, [beast], 86_400_000, false);
    expect(result.hits).toHaveLength(1);
    expect(result.state.damage.beast).toBe(12);
  });
});