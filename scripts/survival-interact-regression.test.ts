import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { ITEMS, computeRangedReach, findAvailableAmmo } from '../src/lib/survival/items';
import { creatureDef, nodeDef } from '../src/lib/survival/entities';
import { CREATURE_ATTACK_INTERVAL_MS, resolveCreatureHit, rollLoot } from '../src/lib/survival/combat';
import { addStacks, removeStacks, stackWeight } from '../src/lib/survival/inventory';
import { defaultAffinityState, applyEnergyGain } from '../src/data/affinitySystem';
import type { WorldEntity } from '../src/lib/survival/types';

// Execute the production callback with isolated state, not a duplicated hit implementation.
const text = readFileSync(new URL('../src/hooks/useSurvivalWorld.ts', import.meta.url), 'utf8');
const source = ts.createSourceFile('hook.ts', text, ts.ScriptTarget.Latest, true);
let callback = '';
function visit(node: ts.Node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'interact' && node.initializer && ts.isCallExpression(node.initializer)) {
    callback = node.initializer.arguments[0]?.getText(source) ?? '';
  }
  ts.forEachChild(node, visit);
}
visit(source);
if (!callback) throw new Error('Production interact callback not found');
const code = ts.transpile(`const hit = ${callback}; hit;`, { target: ts.ScriptTarget.ES2022 });

function harness(ranged = false, indoor = false) {
  const state = {
    pos: { lat: 37, lng: 127 }, level: 1, hp: 100, hunger: 100,
    damage: {} as Record<string, number>, depleted: {} as Record<string, number>,
    backpack: ranged ? [{ itemId: 'arrow' as const, count: 5 }] : [],
    storage: [], gathered: {}, techs: [], kills: 0,
    affinityState: { ...defaultAffinityState(), rangedHitsCount: 4 },
  };
  const ref = { current: state };
  const scope = {
    ref, options: { indoor }, enabledRef: { current: true },
    outdoorMovingRef: { current: Date.now() + 100000 },
    lastCreatureAttack: { current: 0 },
    weapon: ranged ? { itemId: 'bone_bow', quality: 'NORMAL' } : undefined,
    armor: undefined, capacity: 100,
    toast: { warning() {}, error() {}, success() {}, info() {} },
    ITEMS, computeRangedReach, findAvailableAmmo, creatureDef, nodeDef,
    CREATURE_ATTACK_INTERVAL_MS, resolveCreatureHit,
    rollLoot: (loot: Parameters<typeof rollLoot>[0]) => rollLoot(loot, () => 0),
    expeditionLoot: () => [{ itemId: 'branch', count: 10 }],
    addStacks, removeStacks, stackWeight, defaultAffinityState, applyEnergyGain,
    C: { fistAtk: 3 },
    isNodeAvailable: () => true,
    distanceM: () => ranged ? 30 : 0,
    reachRadius: () => 25,
    getPlayerReachBonusM: () => 0,
    escortReady: () => false,
    activePetAbilities: () => ({ bleed: 0 }),
    bleedDamage: () => 0,
    computeCodexProgress: () => ({ atkBonusPct: 0, gatherBonusPct: 0 }),
    atMainBase: () => false,
    petRole: () => 'follow', PET_FOLLOW_ATK: 1,
    gearMult: () => 1,
    dayPhase: () => 'day',
    maxHpOf: () => 100,
    gainXp: (s: typeof state) => s,
    learn: (s: typeof state) => s,
    checkInspiration: () => [],
    fmt: () => '',
    recordCodexResource() {}, recordCodexBoss() {},
    setS: (s: typeof state) => { ref.current = s; },
  };
  const hit = runInNewContext(code, scope) as (e: WorldEntity, opts?: { silent?: boolean }) => boolean;
  return { hit, ref };
}

const branch: WorldEntity = { id: 'regression-branch', kind: 'node', type: 'branch_pile', lat: 37, lng: 127 };

test('finishing gathering without hit options deposits loot and depletes only that node', () => {
  const { hit, ref } = harness();
  ref.current.damage[branch.id] = nodeDef('branch_pile').hp - 1;
  expect(hit(branch)).toBe(true);
  expect(ref.current.backpack).toEqual(rollLoot(nodeDef('branch_pile').loot, () => 0));
  expect(Object.keys(ref.current.depleted)).toEqual([branch.id]);
  expect(ref.current.damage[branch.id]).toBeUndefined();
});

test('silent hit options do not override the indoor world reward options', () => {
  const { hit, ref } = harness(false, true);
  ref.current.damage[branch.id] = nodeDef('branch_pile').hp - 1;
  expect(hit(branch, { silent: true })).toBe(true);
  expect(ref.current.backpack).toEqual([{ itemId: 'branch', count: 10 }]);
});

test('finishing a creature without hit options awards loot and records the kill', () => {
  const { hit, ref } = harness();
  const beast: WorldEntity = { id: 'regression-kill', kind: 'creature', type: 'boar', lat: 37, lng: 127 };
  ref.current.damage[beast.id] = creatureDef('boar').hp - 1;
  expect(hit(beast)).toBe(true);
  expect(ref.current.kills).toBe(1);
  expect(ref.current.backpack).toEqual(addStacks([], rollLoot(creatureDef('boar').loot, () => 0)));
  expect(Object.keys(ref.current.depleted)).toEqual([beast.id]);
});

test('fifth ranged hit consumes exactly one arrow and settles energy without an out-of-scope timestamp', () => {
  const { hit, ref } = harness(true);
  const beast: WorldEntity = { id: 'regression-boar', kind: 'creature', type: 'boar', lat: 37, lng: 127 };
  expect(hit(beast)).toBe(true);
  expect(ref.current.backpack).toEqual([{ itemId: 'arrow', count: 4 }]);
  expect(ref.current.affinityState.rangedHitsCount).toBe(5);
  expect(ref.current.affinityState.energies.tension).toBe(1);
  expect(ref.current.damage[beast.id]).toBe(12);
});