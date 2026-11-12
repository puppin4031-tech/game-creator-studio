import { describe, expect, it } from 'bun:test';
import { hatchPet, migratePets } from '../src/lib/survival/pets';
import { petById } from '../src/lib/survival/dinoEggs';

describe('existing dinosaur name corrections', () => {
  for (const [id, oldName, name] of [
    ['baby_stego', '아기 스테고사우루스', '스테고론'],
    ['baby_raptor', '아기 랩터', '테라녹스'],
    ['mini_triceratops', '미니 트리케라톱스', '케라톱스'],
  ]) {
    it(`corrects ${id} without changing ownership or growth`, () => {
      const original = { ...hatchPet('owned', id, oldName, []), level: 3, hp: 42, locked: true, role: 'hunt' as const, huntAt: 123 };
      const result = migratePets({ pets: [original] }, species => petById(species)?.name ?? species);
      expect(result.pets).toEqual([{ ...original, name }]);
      expect(migratePets(result, species => species).pets).toEqual(result.pets);
      expect(migratePets({ babyDinos: [id] }, species => petById(species)?.name ?? species).pets[0].name).toBe(name);
    });
  }
  it('leaves unrelated pets unchanged', () => {
    const original = hatchPet('other', 'tetab1t', '테라비트', []);
    expect(migratePets({ pets: [original] }, id => id).pets).toEqual([original]);
  });
});