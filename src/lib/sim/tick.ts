import {
  buildingAtTile,
  VILLAGE_BUILDINGS,
  VILLAGE_SPAWN_MARGIN,
  type PlacedVillageBuilding,
  type VillageState,
} from '@/lib/survival/village';
import {
  buildFlowField,
  evaluateBuildingSynergy,
  pickNextFlowCell,
} from './pathfinding';
import {
  directionFromTile,
  type CardinalDir,
  type SimEnemy,
  type VillageSimState,
} from './state';
import type { ItemId } from '@/lib/survival/items';

const RAID_DIRECTIONS: CardinalDir[] = [
  '북동(NE)',
  '북서(NW)',
  '남동(SE)',
  '남서(SW)',
  '북(N)',
  '동(E)',
  '남(S)',
  '서(W)',
];

function spawnCoordForDirection(dir: CardinalDir, gridSize: number): { x: number; y: number } {
  const jitter = () => (Math.random() - 0.5) * (gridSize * 0.45);
  const mid = gridSize / 2;
  switch (dir) {
    case '북(N)':
      return { x: mid + jitter(), y: -1.4 };
    case '북동(NE)':
      return { x: gridSize + 1.1, y: -1.2 + Math.random() * 2.5 };
    case '동(E)':
      return { x: gridSize + 1.3, y: mid + jitter() };
    case '남동(SE)':
      return { x: gridSize + 1.1, y: gridSize + 0.8 - Math.random() * 2 };
    case '남(S)':
      return { x: mid + jitter(), y: gridSize + 1.3 };
    case '남서(SW)':
      return { x: -1.2, y: gridSize + 0.8 - Math.random() * 2 };
    case '서(W)':
      return { x: -1.3, y: mid + jitter() };
    case '북서(NW)':
    default:
      return { x: -1.2, y: -1.2 + Math.random() * 2.5 };
  }
}

/**
 * Launches a night siege wave from `state.upcomingRaidDir` in the outer 2-tile spawn zone.
 */
export function startNightSiegeWave(
  state: VillageSimState,
  baseLevel: number,
  playerLevel: number
): void {
  const count = Math.min(18, 4 + baseLevel * 2 + Math.floor(playerLevel / 4));
  const enemies: SimEnemy[] = [];
  const dir = state.upcomingRaidDir;

  for (let i = 0; i < count; i++) {
    const pos = spawnCoordForDirection(dir, state.gridSize);
    const roll = (i + state.dayNumber) % 10;
    const species: SimEnemy['species'] =
      roll === 9 && baseLevel >= 2
        ? 'mammoth'
        : roll >= 6
          ? 'raptor'
          : roll >= 3
            ? 'boar'
            : 'wolf';
    const baseHp =
      species === 'mammoth' ? 210 : species === 'raptor' ? 95 : species === 'boar' ? 75 : 55;
    const scale = 1 + (baseLevel - 1) * 0.22;
    const maxHp = Math.round(baseHp * scale);

    enemies.push({
      id: `siege-enemy-${Date.now()}-${i}`,
      species,
      name:
        species === 'mammoth'
          ? '거대 매머드'
          : species === 'raptor'
            ? '그림자 랩터'
            : species === 'boar'
              ? '성난 멧돼지'
              : '굶주린 늑대',
      x: pos.x + (Math.random() - 0.5) * 0.8,
      y: pos.y + (Math.random() - 0.5) * 0.8,
      hp: maxHp,
      maxHp,
      atk: species === 'mammoth' ? 22 : species === 'raptor' ? 14 : species === 'boar' ? 11 : 8,
      speed: species === 'raptor' ? 1.55 : species === 'wolf' ? 1.35 : 1.05,
      facing: pos.x < state.gridSize / 2 ? 1 : -1,
      attackCooldownSec: 0.4 + Math.random() * 0.4,
      hitFlashSec: 0,
      spawnDir: dir,
    });
  }

  state.phase = 'night';
  state.phaseTimerSec = 28;
  state.enemies = enemies;
  state.projectiles = [];
  state.activeSiegeTotalRaiders = count;
  state.activeSiegeDefeated = 0;
  state.activeSiegeWallDamage = 0;
  state.activeSiegeBreaches = [];
  state.flowDirty = true;
}

/**
 * Pure simulation tick (`dt` in seconds). Mutates `state` in place for 60fps canvas rendering
 * without triggering React component re-renders.
 */
export function tickVillageSim(
  state: VillageSimState,
  dt: number,
  vState: VillageState,
  context: {
    baseLevel: number;
    playerLevel: number;
    hasFoodInStorage: boolean;
    onHaulerDeposit?: (itemId: ItemId, count: number) => void;
  }
): void {
  const clampedDt = Math.min(0.1, Math.max(0.001, dt));
  const { gridSize, totalSize } = state;
  const margin = VILLAGE_SPAWN_MARGIN; // 2
  const buildings = vState.buildings;

  // Ensure buildingHpMap stays synced with placed buildings
  for (const b of buildings) {
    if (state.buildingHpMap[b.uid] === undefined) {
      state.buildingHpMap[b.uid] = b.hp ?? VILLAGE_BUILDINGS[b.buildingId]?.maxHp ?? 200;
    }
  }

  // 1. Rebuild shared Flow Field only when buildings/walls changed
  const campfire =
    buildings.find(b => b.buildingId === 'campfire') ??
    buildings.find(b => b.buildingId === 'primitive_storage') ??
    buildings[0];
  const goalInnerX = campfire ? campfire.x + 0.5 : gridSize / 2;
  const goalInnerY = campfire ? campfire.y + 0.5 : gridSize / 2;

  if (state.flowDirty) {
    state.flowField = buildFlowField(
      totalSize,
      { x: Math.round(goalInnerX + margin), y: Math.round(goalInnerY + margin) },
      (tx, ty) => {
        const ix = tx - margin;
        const iy = ty - margin;
        if (ix < 0 || iy < 0 || ix >= gridSize || iy >= gridSize) {
          return 1.0; // Outer 2-tile spawn forest
        }
        const t = state.terrain[iy * gridSize + ix];
        if (t === 'water') return Infinity;
        const placed = buildingAtTile(vState, ix, iy);
        if (placed) {
          const hp = state.buildingHpMap[placed.uid] ?? placed.hp ?? 100;
          if (hp <= 0) return 1.2; // Breached wall!
          const def = VILLAGE_BUILDINGS[placed.buildingId];
          if (def?.category === 'wall') {
            // Weakest wall has lowest traversal cost -> enemies target weak points!
            return 1 + hp / 12;
          }
          return 1 + hp / 30;
        }
        if (t === 'path') return 0.65;
        if (t === 'forest' || t === 'rock') return 2.8;
        return 1.0;
      }
    );
    state.flowDirty = false;
  }

  // 2. Update Floating Texts
  for (let i = state.floats.length - 1; i >= 0; i--) {
    state.floats[i].ttlSec -= clampedDt;
    state.floats[i].y -= clampedDt * 0.45;
    if (state.floats[i].ttlSec <= 0) {
      state.floats.splice(i, 1);
    }
  }

  // 3. Advance Day -> Dusk -> Night -> Dawn Cycle
  state.phaseTimerSec -= clampedDt;
  if (state.phaseTimerSec <= 0) {
    if (state.phase === 'day') {
      state.phase = 'dusk';
      state.phaseTimerSec = 12;
      state.upcomingRaidDir =
        RAID_DIRECTIONS[(state.dayNumber * 3 + buildings.length) % RAID_DIRECTIONS.length];
    } else if (state.phase === 'dusk') {
      startNightSiegeWave(state, context.baseLevel, context.playerLevel);
    } else if (state.phase === 'night') {
      finishNightSiege(state);
    } else if (state.phase === 'dawn') {
      state.phase = 'day';
      state.phaseTimerSec = 45;
    }
  }

  // 4. Facility Production into Work Buffers (for Hauler Logistics!)
  const workFacilities = buildings.filter(
    b =>
      b.buildingId === 'lumber_hut' ||
      b.buildingId === 'stone_smeltery' ||
      b.buildingId === 'build_workshop' ||
      b.buildingId === 'smokehouse'
  );
  if (Math.random() < clampedDt * 0.45 && workFacilities.length > 0) {
    const fac = workFacilities[Math.floor(Math.random() * workFacilities.length)];
    const syn = evaluateBuildingSynergy(
      fac.buildingId,
      fac.x,
      fac.y,
      buildings,
      state.terrain,
      gridSize
    );
    if (!state.workOutputBuffer[fac.uid]) {
      const itemInfo: { itemId: ItemId; icon: string; label: string; count: number } =
        fac.buildingId === 'lumber_hut'
          ? { itemId: 'log', icon: '🪵', label: '통나무', count: syn.efficiencyMult >= 1.2 ? 2 : 1 }
          : fac.buildingId === 'stone_smeltery'
            ? { itemId: 'flint', icon: '🪨', label: '부싯돌', count: syn.efficiencyMult >= 1.2 ? 2 : 1 }
            : fac.buildingId === 'smokehouse'
              ? { itemId: 'jerky', icon: '🥩', label: '육포', count: 1 }
              : { itemId: 'branch', icon: '🌿', label: '나뭇가지', count: 2 };
      state.workOutputBuffer[fac.uid] = itemInfo;
    }
  }

  // 5. Resident AI & Actual Hauler Logistics
  const storages = buildings.filter(b => b.buildingId === 'primitive_storage');
  const campfires = buildings.filter(
    b => b.buildingId === 'campfire' || b.buildingId === 'brazier' || b.buildingId === 'primitive_tavern'
  );
  const shelters = buildings.filter(b => b.buildingId === 'tribe_shelter' || b.buildingId === 'campfire');
  const walls = buildings.filter(b => VILLAGE_BUILDINGS[b.buildingId]?.category === 'wall');
  const maxCoord = gridSize - 1.2; // Fixes hardcoded 10.2 bug for 14x14 grids!

  const nowMs = Date.now();
  const isBlessed = nowMs < state.blessingActiveUntil;

  for (let i = 0; i < state.residents.length; i++) {
    const r = state.residents[i];
    if (r.bubble && nowMs > r.bubbleUntil) {
      r.bubble = null;
    }

    if (r.waitTimerSec > 0) {
      r.waitTimerSec -= clampedDt;
      r.moving = false;
      continue;
    }

    r.insideShelter = false;
    const tx = Math.max(0, Math.min(gridSize - 1, Math.floor(r.x)));
    const ty = Math.max(0, Math.min(gridSize - 1, Math.floor(r.y)));
    const onPath = state.terrain[ty * gridSize + tx] === 'path';
    // Dirt road gives +60% move speed; Shaman blessing gives +25%
    const moveSpeed = (onPath ? 2.15 : 1.35) * (isBlessed ? 1.25 : 1.0);

    const dx = r.targetX - r.x;
    const dy = r.targetY - r.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 0.12) {
      r.moving = true;
      const step = Math.min(dist, moveSpeed * clampedDt);
      r.x += (dx / dist) * step;
      r.y += (dy / dist) * step;
      if (Math.abs(dx) > 0.03) r.facing = dx < 0 ? -1 : 1;

      // Record foot traffic for Traffic Heatmap overlay
      const cellIdx = ty * gridSize + tx;
      if (cellIdx >= 0 && cellIdx < state.trafficCounts.length) {
        state.trafficCounts[cellIdx] = Math.min(25, state.trafficCounts[cellIdx] + clampedDt * 0.9);
      }
      continue;
    }

    // Reached destination! Decide next task based on role
    r.moving = false;
    r.waitTimerSec = 0.8 + Math.random() * 1.1;

    if (r.role === 'hauler' && workFacilities.length > 0 && storages.length > 0) {
      const storageBld = storages[0];
      const sx = storageBld.x + 0.5;
      const sy = storageBld.y + 0.8;

      if (r.carrying) {
        // Check if arrived at storage
        if (Math.hypot(r.x - sx, r.y - sy) <= 1.5) {
          const item = r.carrying;
          r.carrying = null;
          state.hauledCountTotal += item.count;
          state.floats.push({
            id: `haul-${nowMs}-${i}`,
            x: sx,
            y: sy - 0.3,
            text: `${item.icon} +${item.count} 입고`,
            color: '#4ade80',
            ttlSec: 1.4,
          });
          r.bubble = onPath ? '🛣️ 오솔길 특송 완료!' : `${item.icon} 창고 운반 완료!`;
          r.bubbleUntil = nowMs + 2200;
          // Pick next work facility
          const nextFac = workFacilities[(i + Math.floor(nowMs / 1000)) % workFacilities.length];
          r.targetX = Math.max(0.6, Math.min(maxCoord, nextFac.x + 0.5));
          r.targetY = Math.max(0.6, Math.min(maxCoord, nextFac.y + 0.8));
          continue;
        } else {
          r.targetX = Math.max(0.6, Math.min(maxCoord, sx));
          r.targetY = Math.max(0.6, Math.min(maxCoord, sy));
          continue;
        }
      } else {
        // Find a work facility with buffered output or pick one to visit
        const readyFac =
          workFacilities.find(f => !!state.workOutputBuffer[f.uid]) ??
          workFacilities[i % workFacilities.length];
        const fx = readyFac.x + 0.5;
        const fy = readyFac.y + 0.8;
        if (Math.hypot(r.x - fx, r.y - fy) <= 1.6) {
          const buf = state.workOutputBuffer[readyFac.uid] ?? {
            itemId: 'log' as ItemId,
            icon: '🪵',
            label: '통나무',
            count: 1,
          };
          delete state.workOutputBuffer[readyFac.uid];
          r.carrying = { ...buf, fromUid: readyFac.uid };
          r.bubble = `${buf.icon} ${buf.label} 운반 중`;
          r.bubbleUntil = nowMs + 2400;
          r.targetX = Math.max(0.6, Math.min(maxCoord, sx));
          r.targetY = Math.max(0.6, Math.min(maxCoord, sy));
          continue;
        } else {
          r.targetX = Math.max(0.6, Math.min(maxCoord, fx));
          r.targetY = Math.max(0.6, Math.min(maxCoord, fy));
          continue;
        }
      }
    }

    if ((r.role === 'wall_patrol' || r.role === 'archer_guard') && walls.length > 0) {
      const w = walls[(Math.floor(nowMs / 4000) + i * 3) % walls.length];
      // Uses dynamic maxCoord = gridSize - 1.2 so 14x14 outer walls are fully patrolled!
      r.targetX = Math.max(0.6, Math.min(maxCoord, w.x + 0.5));
      r.targetY = Math.max(0.6, Math.min(maxCoord, w.y + 0.5));
      continue;
    }

    if (r.role === 'shelter_rest' && shelters.length > 0) {
      const sh = shelters[i % shelters.length];
      if (Math.hypot(r.x - (sh.x + 0.5), r.y - (sh.y + 0.8)) <= 1.2 && Math.random() < 0.45) {
        r.insideShelter = true;
        r.waitTimerSec = 2.2;
      } else {
        r.targetX = Math.max(0.6, Math.min(maxCoord, sh.x + 0.5 + (Math.random() - 0.5)));
        r.targetY = Math.max(0.6, Math.min(maxCoord, sh.y + 0.8 + (Math.random() - 0.5)));
      }
      continue;
    }

    if (campfires.length > 0) {
      const cf = campfires[i % campfires.length];
      const angle = (nowMs / 2000 + i * 1.7) % (Math.PI * 2);
      r.targetX = Math.max(0.6, Math.min(maxCoord, cf.x + 0.8 + Math.cos(angle) * 1.6));
      r.targetY = Math.max(0.6, Math.min(maxCoord, cf.y + 0.8 + Math.sin(angle) * 1.6));
    } else {
      r.targetX = Math.max(0.6, Math.min(maxCoord, r.x + (Math.random() - 0.5) * 3));
      r.targetY = Math.max(0.6, Math.min(maxCoord, r.y + (Math.random() - 0.5) * 3));
    }
  }

  // 6. Night Siege Combat: Enemies follow Flow Field & Attack Weakest Walls; Defenders & Towers Fire Projectiles
  if (state.phase === 'night') {
    // 6a. Defenders (Ranged Tribe, Custom Towers, Guard Pets, Tank Tribe) attack nearby enemies
    const rangedDefenders = state.residents.filter(
      r => r.tribeClass === 'ranged' || r.role === 'archer_guard' || r.kind === 'class_npc' || r.kind === 'pet'
    );
    const towerBuildings = buildings.filter(
      b =>
        b.buildingId === 'custom_intent_building' ||
        b.buildingId === 'golden_totem' ||
        b.buildingId === 'brazier'
    );

    // Ranged residents fire every ~0.9s
    if (state.enemies.length > 0 && Math.random() < clampedDt * 2.4) {
      for (const defUnit of rangedDefenders) {
        const range = defUnit.kind === 'pet' ? 3.2 : 5.5;
        let closest: SimEnemy | null = null;
        let closestDist = range;
        for (const en of state.enemies) {
          const d = Math.hypot(en.x - defUnit.x, en.y - defUnit.y);
          if (d < closestDist) {
            closestDist = d;
            closest = en;
          }
        }
        if (closest) {
          defUnit.facing = closest.x < defUnit.x ? -1 : 1;
          // Check if enemy is inside campfire light radius (+25% damage/accuracy bonus!)
          const inCampfireLight =
            campfire && Math.hypot(closest.x - (campfire.x + 0.5), closest.y - (campfire.y + 0.5)) <= 4.5;
          const dmg = Math.round((defUnit.kind === 'class_npc' ? 26 : 18) * (inCampfireLight ? 1.25 : 1) * (isBlessed ? 1.25 : 1));
          state.projectiles.push({
            id: `proj-${nowMs}-${Math.random()}`,
            fromX: defUnit.x,
            fromY: defUnit.y,
            x: defUnit.x,
            y: defUnit.y,
            targetEnemyId: closest.id,
            targetX: closest.x,
            targetY: closest.y,
            speed: 9.5,
            damage: dmg,
            kind: defUnit.kind === 'class_npc' ? 'fireball' : 'arrow',
          });
          break;
        }
      }

      // Towers fire
      for (const tw of towerBuildings) {
        const tx = tw.x + 0.5;
        const ty = tw.y + 0.5;
        const target = state.enemies.find(en => Math.hypot(en.x - tx, en.y - ty) <= 5.0);
        if (target && Math.random() < 0.45) {
          state.projectiles.push({
            id: `tw-proj-${nowMs}-${Math.random()}`,
            fromX: tx,
            fromY: ty,
            x: tx,
            y: ty,
            targetEnemyId: target.id,
            targetX: target.x,
            targetY: target.y,
            speed: 10.5,
            damage: 22,
            kind: tw.buildingId === 'brazier' ? 'fireball' : 'stone',
          });
        }
      }
    }

    // 6b. Advance Projectiles
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      const target = state.enemies.find(e => e.id === p.targetEnemyId);
      const tx = target ? target.x : p.targetX;
      const ty = target ? target.y : p.targetY;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= 0.35) {
        if (target) {
          target.hp -= p.damage;
          target.hitFlashSec = 0.18;
          state.floats.push({
            id: `hit-${nowMs}-${i}`,
            x: target.x,
            y: target.y - 0.3,
            text: `-${p.damage}`,
            color: p.kind === 'fireball' ? '#fb923c' : '#facc15',
            ttlSec: 0.75,
          });
        }
        state.projectiles.splice(i, 1);
      } else {
        const step = Math.min(dist, p.speed * clampedDt);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
      }
    }

    // 6c. Advance Enemies along Flow Field & Resolve Wall/Melee Attacks
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const en = state.enemies[i];
      if (en.hitFlashSec > 0) en.hitFlashSec -= clampedDt;
      if (en.hp <= 0) {
        state.activeSiegeDefeated += 1;
        state.floats.push({
          id: `kill-${nowMs}-${i}`,
          x: en.x,
          y: en.y,
          text: '💥 격퇴!',
          color: '#4ade80',
          ttlSec: 1.0,
        });
        state.enemies.splice(i, 1);
        continue;
      }

      // Convert inner coordinate to total-grid coordinate (with +2 margin)
      const totalX = en.x + margin;
      const totalY = en.y + margin;
      const nextCell = pickNextFlowCell(state.flowField, totalSize, totalX, totalY);
      const nextInnerX = nextCell.nx - margin;
      const nextInnerY = nextCell.ny - margin;

      // Check if next cell or current cell has a standing building/wall
      const blockingBld =
        nextInnerX >= 0 && nextInnerY >= 0 && nextInnerX < gridSize && nextInnerY < gridSize
          ? buildingAtTile(vState, nextInnerX, nextInnerY)
          : undefined;
      const blockingHp = blockingBld ? (state.buildingHpMap[blockingBld.uid] ?? blockingBld.hp ?? 100) : 0;

      if (blockingBld && blockingHp > 0 && Math.hypot(nextInnerX + 0.5 - en.x, nextInnerY + 0.5 - en.y) <= 1.15) {
        // Attack the wall/building!
        en.attackCooldownSec -= clampedDt;
        if (en.attackCooldownSec <= 0) {
          en.attackCooldownSec = 0.95;
          // Giant tribe tanks reduce incoming wall damage by 35%
          const hasTankGuard = state.residents.some(
            r => r.tribeClass === 'tank' && Math.hypot(r.x - en.x, r.y - en.y) <= 2.5
          );
          const dmg = Math.max(2, Math.round(en.atk * (hasTankGuard ? 0.65 : 1.0)));
          const afterHp = Math.max(0, blockingHp - dmg);
          state.buildingHpMap[blockingBld.uid] = afterHp;
          state.activeSiegeWallDamage += dmg;

          // Tank counter-damage!
          en.hp -= hasTankGuard ? 16 : 7;
          en.hitFlashSec = 0.15;

          state.floats.push({
            id: `wdmg-${nowMs}-${i}`,
            x: blockingBld.x + 0.5,
            y: blockingBld.y,
            text: `🛡️ -${dmg}`,
            color: '#f87171',
            ttlSec: 0.7,
          });

          if (afterHp <= 0) {
            const defName = VILLAGE_BUILDINGS[blockingBld.buildingId]?.name ?? '성벽';
            const breachDir = directionFromTile(blockingBld.x, blockingBld.y, gridSize);
            state.activeSiegeBreaches.push({
              name: defName,
              dir: breachDir,
              x: blockingBld.x,
              y: blockingBld.y,
            });
            state.flowDirty = true; // Recompute flow field now that wall is breached!
            state.floats.push({
              id: `breach-${nowMs}-${i}`,
              x: blockingBld.x + 0.5,
              y: blockingBld.y,
              text: `⚠️ ${defName} 돌파됨!`,
              color: '#ef4444',
              ttlSec: 1.5,
            });
          }
        }
      } else {
        // March toward next flow cell center
        const targetX = nextInnerX + 0.5;
        const targetY = nextInnerY + 0.5;
        const dx = targetX - en.x;
        const dy = targetY - en.y;
        const d = Math.hypot(dx, dy) || 1;
        // Campfire light slows cautious night beasts slightly
        const inLight =
          campfire && Math.hypot(en.x - (campfire.x + 0.5), en.y - (campfire.y + 0.5)) <= 4.2;
        const step = Math.min(d, en.speed * (inLight ? 0.82 : 1.0) * clampedDt);
        en.x += (dx / d) * step;
        en.y += (dy / d) * step;
        if (Math.abs(dx) > 0.02) en.facing = dx < 0 ? -1 : 1;
      }
    }

    if (state.enemies.length === 0) {
      finishNightSiege(state);
    }
  }

  // 7. Update Resident Needs (Food, Warmth, Shelter -> Happiness)
  const foodPct = context.hasFoodInStorage ? 95 : 42;
  const warmthBuildings = buildings.filter(
    b => b.buildingId === 'campfire' || b.buildingId === 'brazier'
  ).length;
  const shelterBuildings = buildings.filter(
    b => b.buildingId === 'tribe_shelter' || b.buildingId === 'tribal_hall'
  ).length;
  const tavernBuildings = buildings.filter(
    b => b.buildingId === 'primitive_tavern' || b.buildingId === 'flower_bed' || b.buildingId === 'golden_totem'
  ).length;
  const warmthPct = Math.min(100, 60 + warmthBuildings * 20);
  const shelterPct = Math.min(100, 55 + shelterBuildings * 25);
  const happinessPct = Math.min(
    100,
    Math.round((foodPct + warmthPct + shelterPct) / 3 + tavernBuildings * 6 + (isBlessed ? 12 : 0))
  );
  state.needs = { foodPct, warmthPct, shelterPct, happinessPct };
}

function finishNightSiege(state: VillageSimState): void {
  const breaches = state.activeSiegeBreaches;
  const total = Math.max(1, state.activeSiegeTotalRaiders);
  const defeated = state.activeSiegeDefeated;
  const dmg = state.activeSiegeWallDamage;
  const victory = breaches.length === 0 || defeated >= total;
  const repairCost = Math.max(0, Math.ceil(dmg / 45));

  const firstBreach = breaches[0];
  const summaryTitle =
    breaches.length === 0
      ? `🛡️ 제${state.dayNumber}일 밤 습격 완벽 방어! (${state.upcomingRaidDir} 적 ${defeated}/${total}마리 격퇴)`
      : `⚠️ 제${state.dayNumber}일 밤 방어전 종료 (${firstBreach.dir} ${firstBreach.name} ${breaches.length}곳 파손)`;

  const summaryDetail =
    breaches.length === 0
      ? `${state.upcomingRaidDir} 외곽 경계림에서 맹수 ${total}마리가 습격했으나, 성벽 방어선(누적 피해 ${dmg})과 수호 병력이 단 한 칸의 돌파도 허용하지 않고 모두 격퇴했습니다!`
      : `${state.upcomingRaidDir} 방면 습격에서 [${firstBreach.dir} ${firstBreach.name}(타일 ${firstBreach.x + 1},${firstBreach.y + 1})] 방어선이 뚫렸습니다(총 성벽 피해 ${dmg}). 약점 구간에 상위 성벽이나 방어 병력을 보강하고 파손된 성벽을 수리하세요.`;

  state.lastSiegeReport = {
    dayNumber: state.dayNumber,
    timestamp: Date.now(),
    direction: state.upcomingRaidDir,
    totalRaiders: total,
    defeatedRaiders: defeated,
    breachedWalls: breaches,
    damagedWallsCount: breaches.length + (dmg > 0 ? 1 : 0),
    totalWallDamage: dmg,
    repairBranchCost: repairCost,
    lootProtectedPct: breaches.length === 0 ? 100 : Math.max(70, 100 - breaches.length * 10),
    summaryTitle,
    summaryDetail,
    victory,
  };

  state.enemies = [];
  state.projectiles = [];
  state.phase = 'dawn';
  state.phaseTimerSec = 10;
  state.dayNumber += 1;
}
