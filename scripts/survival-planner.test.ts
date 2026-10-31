import { describe, expect, test } from 'bun:test';
import { plannerInputSchema } from '../src/lib/survival/plannerInput';
import { unlockedRecipes, TECHS } from '../src/lib/survival/tech';
import { RECIPES } from '../src/lib/survival/recipes';

const input = { health: 35, hunger: 20, inventory: [{ itemId: 'flint', count: 3 }], storage: [], gear: [], learnedSkills: [], nearbyResources: [{ type: 'apple_tree', distanceM: 12, count: 1 }], gathered: {}, baseLevel: 0, inBase: false, isNight: false, goal: '주먹도끼 만들기' };
describe('survival planner input and crafting gates', () => {
  test('accepts all requested state fields and a survival goal', () => {
    expect(plannerInputSchema.parse(input)).toEqual(input);
  });
  test('rejects health outside the 0–100 game range', () => {
    expect(plannerInputSchema.safeParse({ ...input, health: 101 }).success).toBe(false);
  });
  test('rejects hunger outside the 0–100 game range', () => {
    expect(plannerInputSchema.safeParse({ ...input, hunger: -1 }).success).toBe(false);
  });
  test('rejects an empty survival goal', () => {
    expect(plannerInputSchema.safeParse({ ...input, goal: '  ' }).success).toBe(false);
  });
  test('new players cannot craft any recipe before learning technology', () => {
    expect(unlockedRecipes([])).toEqual([]);
  });
  test('learning knapping unlocks the hand axe only', () => {
    expect(unlockedRecipes(['knapping']).map(r => r.id)).toEqual(['hand_axe']);
  });
  test('hand axe plans require exactly three flint and one branch', () => {
    expect(RECIPES.find(r => r.id === 'hand_axe')?.ingredients).toEqual([{ itemId: 'flint', count: 3 }, { itemId: 'branch', count: 1 }]);
  });
  test('knapping inspiration needs two lifetime gathered flint, not current inventory', () => {
    expect(TECHS.find(t => t.id === 'knapping')?.inspire).toEqual({ itemId: 'flint', count: 2 });
  });
});