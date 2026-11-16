import { expect, test } from 'bun:test';
import { tribeHireCost, TRIBE_RATIO, settleUpkeep, upkeepDemand } from '../src/lib/survival/mercenaries';

test('first recruit costs raw meat 3, hide 1, apple 2', () => {
  expect(tribeHireCost(0)).toEqual([{ itemId: 'raw_meat', count: 3 }, { itemId: 'hide', count: 1 }, { itemId: 'apple', count: 2 }]);
});
test('second recruit costs cooked meat 2, flint 5, clay 5', () => {
  expect(tribeHireCost(1)).toEqual([{ itemId: 'cooked_meat', count: 2 }, { itemId: 'flint', count: 5 }, { itemId: 'clay', count: 5 }]);
});
test('tribe cap is 10', () => { expect(tribeHireCost(10)).toBeNull(); });
test('tribe stats are one sixth of the player', () => { expect(TRIBE_RATIO).toBeCloseTo(1 / 6); });
test('tribe eats fruit and cooked meat; missing food starves', () => {
  const r = settleUpkeep([{ itemId: 'apple', count: 1 }, { itemId: 'cooked_meat', count: 1 }], upkeepDemand(1, 0, 0), 1);
  expect(r.storage).toEqual([]); expect(r.starving).toBe(false);
  expect(settleUpkeep([], upkeepDemand(1, 0, 0), 1).starving).toBe(true);
});
import { escortAmbushDamage, escortReady } from '../src/lib/survival/mercenaries';
test('escort blocks ambush on low roll, halves otherwise', () => {
  expect(escortAmbushDamage(10, 0.1)).toBe(0);
  expect(escortAmbushDamage(10, 0.9)).toBe(5);
});
test('escort not ready while injured or on expedition', () => {
  const t = { count: 1, trainLevel: 0, escort: true };
  expect(escortReady(t, 0, false)).toBe(true);
  expect(escortReady(t, 0, true)).toBe(false);
  expect(escortReady({ ...t, injuredUntil: 100 }, 0, false)).toBe(false);
});
import { setPetRole, settlePetHunts, PET_HUNT_MS, type OwnedPet } from '../src/lib/survival/pets';
const pet = (uid: string): OwnedPet => ({ uid, speciesId: 'x', name: 'x', level: 1, hp: 80, deployed: false, locked: false, restUntil: 0 });
test('follow role limited to 2 pets', () => {
  let ps: OwnedPet[] = [pet('a'), pet('b'), pet('c')];
  ps = setPetRole(ps, 'a', 'follow', 0)!; ps = setPetRole(ps, 'b', 'follow', 0)!;
  expect(setPetRole(ps, 'c', 'follow', 0)).toBeNull();
});
test('hunting pet brings meat after one trip', () => {
  const ps = setPetRole([pet('a')], 'a', 'hunt', 0)!;
  const r = settlePetHunts(ps, PET_HUNT_MS, () => 0.99);
  expect(r.trips).toBe(1); expect(r.loot).toEqual([{ itemId: 'raw_meat', count: 1 }]);
});
import { TRIBE_CLASS_LIST, getTribeClass, tribeCarryBonusKg, applyTribeWallDefense } from '../src/data/tribeClasses';
import { advanceExpedition, startObservedExpedition } from '../src/lib/survival/expedition';
test('4 tribe classes are defined with distinct perks', () => {
  expect(TRIBE_CLASS_LIST.map(c => c.id)).toEqual(['tank', 'gatherer', 'ranged', 'assassin']);
  expect(getTribeClass('tank').hpMult).toBeGreaterThan(1.5);
  expect(tribeCarryBonusKg(60, 1, 'gatherer')).toBe(18);
  expect(applyTribeWallDefense(20, true, 1, 'tank')).toBe(13);
});
test('ranged tribe fires preemptively at 30m with reduced counter damage and assassin attacks twice as fast', () => {
  const home = { lat: 37.5, lng: 127 };
  const baseCrew = startObservedExpedition(home, { lat: 37.502, lng: 127 }, 0, 'hunt')!;
  const raptor25m = { id: 'r25', kind: 'creature' as const, type: 'raptor' as const, lat: 37.5002, lng: 127 };
  const rangedStep = advanceExpedition({ ...baseCrew, tribeClass: 'ranged', target: raptor25m }, [raptor25m], 1000, false, false);
  expect(rangedStep.crew.combatHit?.ranged).toBe(true);
  expect(rangedStep.crew.combatHit?.counterDamage).toBe(0);
  const assassinStep = advanceExpedition({ ...baseCrew, tribeClass: 'assassin', target: raptor25m, hitAt: 500 }, [raptor25m], 1000, false, false, () => 0.1);
  expect(assassinStep.crew.combatHit?.crit).toBe(true);
});

import { buildingAtTile, buildingFootprintCells, canPlaceVillageBuilding, createStarterVillage, VILLAGE_BUILDINGS } from '../src/lib/survival/village';
import { getSpeechStageInfo, LANGUAGE_QUEST, languageQuestProgress } from '../src/lib/survival/quests';

test('village buildings support 2-tile, 4-tile, and 6-tile footprints while walls are 1-tile', () => {
  expect(VILLAGE_BUILDINGS.branch_fence.widthTiles * VILLAGE_BUILDINGS.branch_fence.heightTiles).toBe(1);
  expect(VILLAGE_BUILDINGS.brazier.widthTiles * VILLAGE_BUILDINGS.brazier.heightTiles).toBe(2);
  expect(VILLAGE_BUILDINGS.campfire.widthTiles * VILLAGE_BUILDINGS.campfire.heightTiles).toBe(4);
  expect(VILLAGE_BUILDINGS.expedition_barracks.widthTiles * VILLAGE_BUILDINGS.expedition_barracks.heightTiles).toBe(6);

  const starter = createStarterVillage(false);
  // Campfire at (5,5) is 2x2 -> occupies (5,5), (6,5), (5,6), (6,6)
  expect(buildingAtTile(starter, 6, 6)?.buildingId).toBe('campfire');
  expect(buildingFootprintCells('expedition_barracks', 0, 0).length).toBe(6);
  // Overlapping placement is rejected
  expect(canPlaceVillageBuilding(starter, 'tribe_shelter', 5, 5, 3).ok).toBe(false);
});

test('shaman language quest unlocks at level 5 and enables speech', () => {
  expect(LANGUAGE_QUEST.shamanQuote).toContain('이제 자네도 말을 좀 배워야 될것같네.');
  expect(getSpeechStageInfo(3, false).canSpeak).toBe(false);
  expect(getSpeechStageInfo(5, true).canSpeak).toBe(true);
  expect(languageQuestProgress({ level: 4, backpack: [], storage: [] }).unlocked).toBe(false);
  expect(languageQuestProgress({ level: 5, backpack: [{ itemId: 'branch', count: 2 }], storage: [] }).ready).toBe(true);
});

import { computeBuildingHarvestBubble, computeVillagePopulationCapacity } from '../src/lib/survival/village';
import { FRESHNESS_SPOIL_INTERVAL_MS, settleFoodSpoilage, TAVERN_RECIPES } from '../src/lib/survival/culinary';

test('idle harvest bubbles accumulate on buildings and population scales with village development', () => {
  const starter = createStarterVillage(false);
  const campfire = starter.buildings.find(b => b.buildingId === 'campfire')!;
  const bubble = computeBuildingHarvestBubble(campfire, Date.now() + 30 * 60_000, 2);
  expect(bubble?.itemId).toBe('cooked_meat');
  expect(bubble?.count).toBeGreaterThan(0);

  const popLv1 = computeVillagePopulationCapacity(starter, 1);
  const popLv3 = computeVillagePopulationCapacity(starter, 3);
  expect(popLv3.totalResidentDisplay).toBeGreaterThan(popLv1.totalResidentDisplay);
});

test('perishable raw foods spoil into green-mold spoiled_food if left unpreserved and tavern recipes use spices', () => {
  const res = settleFoodSpoilage(
    [{ itemId: 'raw_meat', count: 3 }],
    [{ itemId: 'apple', count: 2 }],
    0,
    FRESHNESS_SPOIL_INTERVAL_MS * 2
  );
  expect(res.spoiledCount).toBeGreaterThan(0);
  expect(res.storage.some(s => s.itemId === 'spoiled_food')).toBe(true);
  expect(TAVERN_RECIPES.some(r => r.result === 'bone_stew')).toBe(true);
  expect(TAVERN_RECIPES.some(r => r.result === 'spice_roast')).toBe(true);
});

import { registerCustomMobs } from '../src/lib/survival/customMobs';
import { generateCreatures } from '../src/lib/survival/world';
import { beastAggro } from '../src/lib/survival/combat';

test('admin custom mobs spawn on the map, creatures form 1-2m packs, and ranged attacks pull even passive mobs into aggro chase', () => {
  registerCustomMobs([
    { mob_id: 'snow_tiger', name: '설원 호랑이', hp: 40, atk: 8, temper: 'aggressive', xp: 50, spawn_weight: 8, is_active: true },
  ]);
  const spawned = generateCreatures({
    center: { lat: 37.748, lng: 126.7496 },
    radiusM: 120,
    now: 1000,
    isNight: false,
    depleted: {},
  });
  expect(spawned.length).toBeGreaterThan(3);
  expect(spawned.some(c => (c.type as string) === 'custom_snow_tiger')).toBe(true);
  expect(spawned.some(c => c.id.includes(':p1'))).toBe(true);

  // Passive mob (rabbit) does not aggro unprovoked, but chases player when hit at 25m range!
  expect(beastAggro('rabbit', 8, { isNight: false, engaged: false, calm: false })).toBe(false);
  expect(beastAggro('rabbit', 25, { isNight: false, engaged: true, calm: false })).toBe(true);
});

import { requiredRangedAmmo } from '../src/lib/survival/items';
import { RECIPES } from '../src/lib/survival/recipes';
import { isRecipeUnlocked } from '../src/lib/survival/tech';

test('ranged weapons require matching ammo (arrow for bow, sling_stone for sling) and recipes are unlocked via crafting techs', () => {
  expect(requiredRangedAmmo('bone_bow')).toBe('arrow');
  expect(requiredRangedAmmo('sling')).toBe('sling_stone');
  expect(requiredRangedAmmo('bone_dagger')).toBeNull();

  const arrowRecipe = RECIPES.find(r => r.id === 'arrow')!;
  const stoneRecipe = RECIPES.find(r => r.id === 'sling_stone')!;
  expect(arrowRecipe.count).toBe(8);
  expect(stoneRecipe.count).toBe(10);
  expect(isRecipeUnlocked(arrowRecipe, ['bonecraft'])).toBe(true);
  expect(isRecipeUnlocked(stoneRecipe, ['knapping'])).toBe(true);
});
