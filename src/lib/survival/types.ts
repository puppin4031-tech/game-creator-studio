import type { ItemId } from './items';
import type { NodeType, CreatureType } from './entities';
import type { ClassId } from './classes';

export interface LatLng { lat: number; lng: number }

export type Quality = 'CRUDE' | 'NORMAL' | 'MASTERWORK';
export type StrikeResult = 'CRIT' | 'HIT' | 'MISS';

export interface Stack { itemId: ItemId; count: number }

export interface GearInstance {
  uid: string;
  itemId: ItemId;
  quality: Quality;
  durability: number;
  /** 0 = indestructible. */
  maxDurability: number;
  /** Altar reinforcement level (0-5). */
  plus?: number;
  /** Custom intent mechanics awarded during crafting. */
  mechanics?: string[];
}

export type EquipSlot = 'weapon' | 'armor' | 'trinket';

export interface DropPile {
  id: string;
  lat: number;
  lng: number;
  stacks: Stack[];
  kind: 'death' | 'overflow';
  expiresAt: number;
}

export interface CraftJob {
  id: string;
  recipeId: string;
  quality: Quality;
  startedAt: number;
  endsAt: number;
}

export interface BaseState extends LatLng {
  level: 1 | 2 | 3;
  placedAt: number;
}

export interface OutpostState extends LatLng { placedAt: number }

export interface SurvivalStats {
  gathered: Partial<Record<ItemId, number>>;
  crafted: Partial<Record<ItemId, number>>;
  kills: number;
  deposits: number;
  deaths: number;
  distanceM: number;
}

export type MapStyle = 'terrain' | 'road';
export type PositionMode = 'gps' | 'sim';

export interface SurvivalState {
  version: 1;
  createdAt: number;
  player: {
    name: string;
    classId: ClassId;
    level: number;
    xp: number;
    hp: number;
    hunger: number;
  };
  pos: LatLng;
  backpack: Stack[];
  gear: GearInstance[];
  equipped: Partial<Record<EquipSlot, string>>;
  base: BaseState | null;
  baseMovedAt: number;
  storage: Stack[];
  storedGear: GearInstance[];
  queue: CraftJob[];
  outpost: OutpostState | null;
  lastShipAt: number;
  drops: DropPile[];
  /** World entity id → depletion timestamp. */
  depleted: Record<string, number>;
  /** Partial damage on nodes/creatures (id → damage dealt). */
  damage: Record<string, number>;
  /** Creature id → timestamp until which it ignores the player. */
  calmUntil: Record<string, number>;
  questIndex: number;
  stats: SurvivalStats;
  lastTickAt: number;
  scanReadyAt: number;
  revealUntil: number;
  revealCenter: LatLng | null;
  settings: { mapStyle: MapStyle; mode: PositionMode };
  uidSeq: number;
}

export type GameEventTone = 'info' | 'success' | 'warning' | 'danger' | 'loot' | 'level';

export interface GameEvent {
  tone: GameEventTone;
  message: string;
  /** Optional item/sprite to decorate the toast. */
  itemId?: ItemId;
}

export interface Outcome {
  state: SurvivalState;
  events: GameEvent[];
}

export interface Ctx {
  now: number;
  rng: () => number;
}

export interface WorldNode {
  id: string;
  kind: 'node';
  type: NodeType;
  lat: number;
  lng: number;
}

export interface WorldCreature {
  id: string;
  kind: 'creature';
  type: CreatureType;
  lat: number;
  lng: number;
}

export type WorldEntity = WorldNode | WorldCreature;
