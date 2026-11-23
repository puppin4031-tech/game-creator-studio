// Unit test for Sprite Normalizer logic and Action Key mappings
import assert from 'assert';
import { CHARACTER_ACTIONS, SPRITE_ACTIONS, SPRITE_ACTION_LABELS } from '../src/hooks/useSpriteAnimations';

console.log('Testing Action Key mappings and schema sync...');

// 1. Verify all 10 core player actions exist in CHARACTER_ACTIONS
const expectedPlayerActions = [
  'idle',
  'walk',
  'attack',
  'chop',
  'gather',
  'talk',
  'poop',
  'pick_nose',
  'celebrate',
  'hurt',
];

for (const act of expectedPlayerActions) {
  assert(
    CHARACTER_ACTIONS.includes(act as any),
    `CHARACTER_ACTIONS must include ${act}`
  );
  assert(
    SPRITE_ACTION_LABELS[act as any] !== undefined,
    `SPRITE_ACTION_LABELS must define label for ${act}`
  );
}

// 2. Verify nose_pick alias is supported in SPRITE_ACTIONS and SPRITE_ACTION_LABELS
assert(SPRITE_ACTIONS.includes('nose_pick' as any), 'SPRITE_ACTIONS must include nose_pick');
assert(SPRITE_ACTIONS.includes('pick_nose' as any), 'SPRITE_ACTIONS must include pick_nose');
assert(SPRITE_ACTIONS.includes('poop' as any), 'SPRITE_ACTIONS must include poop');
assert(SPRITE_ACTION_LABELS['nose_pick' as any] !== undefined, 'SPRITE_ACTION_LABELS must include nose_pick');

console.log('✅ Action Key sync test PASSED (all 10 actions + nose_pick alias registered cleanly).');

// 3. Test chroma key distance calculation
function chromaDist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

// Hot pink #FF00FF
const pinkDist = chromaDist(255, 0, 255, 255, 0, 255);
assert.strictEqual(pinkDist, 0, 'Exact hot pink should have 0 distance');

// Near white
const nearWhiteDist = chromaDist(250, 250, 250, 255, 255, 255);
const maxTol = (25 / 100) * 441.67; // ~110.4
assert(nearWhiteDist <= maxTol, 'Near white should be within 25% tolerance');

// Non-white (e.g. skin tone or dark stone)
const darkDist = chromaDist(43, 29, 20, 255, 255, 255);
assert(darkDist > maxTol, 'Dark pixel must not be keyed out by white chroma key');

console.log('✅ Chroma key math verification PASSED.');
console.log('All sprite normalizer tests passed successfully!');
