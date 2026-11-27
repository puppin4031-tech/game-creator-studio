/**
 * Canonical Sprite Key Registry (`src/data/spriteRegistry.ts`)
 *
 * Single Source of Truth mapping every entity ID across:
 * - Player actions & level tiers (`hunter`, `hunter:lv5`, `hunter:lv8`)
 * - Tribe members & classes (`tribe`, `tribe:gatherer`, `tribe:tank`, `tribe:ranged`, `tribe:assassin`, etc.)
 * - Dinosaur Pets (`pet:baby_raptor`, `pet:baby_stego`, `pet:baby_ptera`, `pet:mini_triceratops`, `pet:skull_dragon`, plus legacy aliases)
 * - Prehistoric Mobs & Bosses (`mob:boar`, `mob:wolf`, `mob:raptor`, `mob:mammoth`, `mob:boss_direwolf`, `mob:boss_mammoth`, etc.)
 * - Base Buildings & Defenses (`base-campfire`, `base-hut`, `wall-stone-fence`, etc.)
 * - Natural Resource Nodes (`node-oak`, `node-flint`, `node-quartz`, etc.)
 * - Map Decorative Props (`prop-jungle-tree`, `prop-palm-tree`, `prop-bush`, `prop-grass-tuft`, `prop-mossy-rock`)
 * - Weapons, Tools, Armor, Trinkets, and Materials (`item-*`)
 *
 * Both `/admin/sprites` and all in-game renderers (`SpriteAnimator`, `CreatureSprite`, `PetSprite`, `TribeSprite`, `CharacterSprite`, `MapFoliageOverlay`)
 * MUST use these canonical keys and fallback resolvers so any sprite saved in `/admin/sprites` immediately reflects in-game.
 */

import { CREATURES } from '@/lib/survival/entities';
import { TRIBE_CLASS_LIST } from '@/data/tribeClasses';
import { PREHISTORIC_MOBS } from '@/utils/mobSpriteFactory';

export interface SpriteTargetEntry {
  key: string;
  label: string;
  category:
    | 'hunter'
    | 'tribe'
    | 'pet'
    | 'mob'
    | 'building'
    | 'node'
    | 'prop'
    | 'gear'
    | 'item';
  fallbackKey?: string;
}

/**
 * Legacy / alias pet species IDs mapped to canonical `pet:*` keys.
 */
export const PET_CANONICAL_ID_MAP: Record<string, string> = {
  terranox01: 'baby_raptor',
  keratupsgt: 'mini_triceratops',
  stagogon85: 'baby_stego',
  brakoin102: 'baby_ptera',
  pteravolt: 'baby_ptera',
  baby_raptor: 'baby_raptor',
  mini_triceratops: 'mini_triceratops',
  baby_stego: 'baby_stego',
  baby_ptera: 'baby_ptera',
  skull_dragon: 'skull_dragon',
};

/**
 * Resolves a pet species ID to its primary (`pet:${speciesId}`) and canonical (`pet:${canonicalId}`) sprite keys.
 */
export function resolvePetSpriteKeys(speciesId: string): {
  primaryKey: string;
  canonicalKey: string;
} {
  const cleanId = speciesId.replace(/^pet:/, '');
  const canonicalId = PET_CANONICAL_ID_MAP[cleanId] ?? cleanId;
  return {
    primaryKey: `pet:${cleanId}`,
    canonicalKey: `pet:${canonicalId}`,
  };
}

/**
 * Boss and variant mob fallback map.
 * If a boss (`boss_direwolf`, `boss_mammoth`) does not have a dedicated custom sprite uploaded under
 * `mob:boss_direwolf` / `mob:boss_mammoth`, it automatically falls back to its base species (`mob:wolf` / `mob:mammoth`)
 * before falling back to the built-in procedural `mobSpriteFactory`.
 */
export const MOB_FALLBACK_SPECIES_MAP: Record<string, string> = {
  boss_direwolf: 'wolf',
  boss_mammoth: 'mammoth',
  direwolf: 'wolf',
  alpha_wolf: 'wolf',
  alpha_mammoth: 'mammoth',
  giant_elk: 'boar',
};

/**
 * Normalizes any mob/creature identifier (`wolf`, `mob-wolf`, `mob:wolf`, `boss_direwolf`)
 * into its canonical DB `character_key` (`mob:wolf`, `mob:boss_direwolf`) and optional base species fallback key.
 */
export function resolveMobSpriteKeys(rawType: string): {
  canonicalKey: string;
  speciesId: string;
  fallbackKey: string | null;
  fallbackSpeciesId: string | null;
} {
  const cleaned = rawType
    .trim()
    .replace(/^mob:/, '')
    .replace(/^mob-/, '')
    .replace(/-/g, '_');

  const canonicalKey = `mob:${cleaned}`;
  const fallbackSpecies = MOB_FALLBACK_SPECIES_MAP[cleaned] ?? null;
  return {
    canonicalKey,
    speciesId: cleaned,
    fallbackKey: fallbackSpecies ? `mob:${fallbackSpecies}` : null,
    fallbackSpeciesId: fallbackSpecies,
  };
}

export const HUNTER_TARGETS: SpriteTargetEntry[] = [
  { key: 'hunter', label: '👤 유저 캐릭터 (공통 기본 · 10가지 액션)', category: 'hunter' },
  { key: 'hunter:lv5', label: '👤 유저 캐릭터 (Lv.5~7 전용 외형)', category: 'hunter', fallbackKey: 'hunter' },
  { key: 'hunter:lv8', label: '👤 유저 캐릭터 (Lv.8+ 전용 외형)', category: 'hunter', fallbackKey: 'hunter' },
];

export const TRIBE_TARGETS: SpriteTargetEntry[] = [
  { key: 'tribe', label: '부족민 (공통 기본)', category: 'tribe' },
  ...TRIBE_CLASS_LIST.map(c => ({
    key: `tribe:${c.id}`,
    label: `부족 용병 · ${c.icon} ${c.name} (${c.role})`,
    category: 'tribe' as const,
    fallbackKey: 'tribe',
  })),
];

export const DINO_PET_TARGETS: SpriteTargetEntry[] = [
  { key: 'pet:baby_raptor', label: '공룡 펫 · 🦖 아기 랩터 (테라녹스)', category: 'pet' },
  { key: 'pet:baby_stego', label: '공룡 펫 · 🦕 아기 스테고 (스테고론)', category: 'pet' },
  { key: 'pet:baby_ptera', label: '공룡 펫 · 🦅 아기 프테라 (브라코인)', category: 'pet' },
  { key: 'pet:mini_triceratops', label: '공룡 펫 · 🦏 아기 트리케라톱스 (케라톱스)', category: 'pet' },
  { key: 'pet:skull_dragon', label: '공룡 펫 · 💀 스컬 드래곤', category: 'pet' },
];

export const BUILDING_TARGETS: SpriteTargetEntry[] = [
  { key: 'base-campfire', label: '🏕️ 거점 · 캠프파이어 (모닥불)', category: 'building' },
  { key: 'base-hut', label: '🏕️ 거점 · 원시 움막 (숙소)', category: 'building' },
  { key: 'base-cave', label: '🏕️ 거점 · 동굴 거처', category: 'building' },
  { key: 'base-outpost', label: '🏕️ 거점 · 개척 전초기지', category: 'building' },
  { key: 'base-tribal-hall', label: '🏕️ 거점 · 부족 대회당', category: 'building' },
  { key: 'base-village-bg', label: '🏕️ 거점 · 원시 마을 전경 배경', category: 'building' },
  { key: 'dolmen-shrine', label: '⛩️ 제단 · 고인돌 성소', category: 'building' },
  { key: 'wall-branch-fence', label: '🪵 방벽 · 나뭇가지 울타리', category: 'building' },
  { key: 'wall-stone-fence', label: '🪨 방벽 · 돌 울타리', category: 'building' },
  { key: 'wall-wood-pillar', label: '🪵 방벽 · 목재 기둥', category: 'building' },
  { key: 'wall-marble-wall', label: '🏛️ 방벽 · 대리석 성벽', category: 'building' },
];

export const NODE_TARGETS: SpriteTargetEntry[] = [
  { key: 'node-oak', label: '🌳 자연물 · 참나무 (단단한 목재)', category: 'node' },
  { key: 'node-pine', label: '🌲 자연물 · 소나무 (송진 채취)', category: 'node' },
  { key: 'node-bush', label: '🌿 자연물 · 야생 덤불 (섬유·나뭇가지)', category: 'node' },
  { key: 'node-apple', label: '🍎 자연물 · 사과나무', category: 'node' },
  { key: 'node-pear', label: '🍐 자연물 · 돌배나무', category: 'node' },
  { key: 'node-flint', label: '🪨 채집 노드 · 부싯돌 바위', category: 'node' },
  { key: 'node-quartz', label: '💎 채집 노드 · 석영 광맥', category: 'node' },
  { key: 'node-obsidian', label: '🌋 채집 노드 · 흑요석 바위', category: 'node' },
  { key: 'node-hematite', label: '🔴 채집 노드 · 적철석/빙결석 광맥', category: 'node' },
  { key: 'node-jade', label: '🟢 채집 노드 · 옥 광맥', category: 'node' },
  { key: 'node-herb', label: '🌿 채집 노드 · 약초 군락', category: 'node' },
  { key: 'node-clay', label: '🏺 채집 노드 · 점토 채취장', category: 'node' },
  { key: 'node-soil', label: '🌱 채집 노드 · 비옥한 흙더미', category: 'node' },
  { key: 'node-bones', label: '🦴 채집 노드 · 고대 뼈 무덤', category: 'node' },
  { key: 'node-branch', label: '🪵 채집 노드 · 나뭇가지 더미', category: 'node' },
];

export const PROP_TARGETS: SpriteTargetEntry[] = [
  { key: 'prop-jungle-tree', label: '🌴 배경 장식 · 정글 거목', category: 'prop' },
  { key: 'prop-palm-tree', label: '🌴 배경 장식 · 야자수', category: 'prop' },
  { key: 'prop-bush', label: '🌿 배경 장식 · 덤불/수풀', category: 'prop' },
  { key: 'prop-grass-tuft', label: '🌱 배경 장식 · 잔디/풀 포기', category: 'prop' },
  { key: 'prop-mossy-rock', label: '🪨 배경 장식 · 이끼 바위', category: 'prop' },
];

export const GEAR_TARGETS: SpriteTargetEntry[] = [
  { key: 'item-hand-axe', label: '🪓 도구 · 주먹도끼', category: 'gear' },
  { key: 'item-stone-pickaxe', label: '⛏️ 도구 · 돌곡괭이', category: 'gear' },
  { key: 'item-obsidian-pickaxe', label: '⛏️ 도구 · 흑요석 곡괭이', category: 'gear' },
  { key: 'item-flint-hatchet', label: '🪓 도구 · 부싯돌 손도끼', category: 'gear' },
  { key: 'item-obsidian-axe', label: '🪓 도구 · 흑요석 도끼', category: 'gear' },
  { key: 'item-wood-mallet', label: '🔨 도구 · 나무 메', category: 'gear' },
  { key: 'item-bone-pick', label: '⛏️ 도구 · 뼈 곡괭이', category: 'gear' },
  { key: 'item-digging-stick', label: '⛏️ 도구 · 토기 삽', category: 'gear' },
  { key: 'item-bone-dagger', label: '🗡️ 무기 · 뼈 단검', category: 'gear' },
  { key: 'item-flint-spear', label: '🗡️ 무기 · 부싯돌 창 (투창)', category: 'gear' },
  { key: 'item-obsidian-spear', label: '🗡️ 무기 · 흑요석 창', category: 'gear' },
  { key: 'item-stone-maul', label: '🔨 무기 · 돌 망치', category: 'gear' },
  { key: 'item-wooden-club', label: '🪵 무기 · 나무 몽둥이', category: 'gear' },
  { key: 'item-sling', label: '🎯 무기 · 새총 · 물매', category: 'gear' },
  { key: 'item-bone-bow', label: '🏹 무기 · 원거리 뼈 활', category: 'gear' },
  { key: 'item-arrow', label: '🏹 탄환 · 뼈 화살', category: 'gear' },
  { key: 'item-sling-stone', label: '🎯 탄환 · 물매용 둥근 돌멩이', category: 'gear' },
  { key: 'item-bark-vest', label: '🛡️ 방어구 · 나무껍질 조끼', category: 'gear' },
  { key: 'item-bone-plate', label: '🛡️ 방어구 · 뼈 흉갑', category: 'gear' },
  { key: 'item-hide-armor', label: '🛡️ 방어구 · 가죽 갑옷', category: 'gear' },
  { key: 'item-fur-cloak', label: '🛡️ 방어구 · 늑대 털망토', category: 'gear' },
  { key: 'item-bone-charm', label: '✨ 장신구 · 뼈 부적', category: 'gear' },
  { key: 'item-quartz-charm', label: '✨ 장신구 · 석영 부적', category: 'gear' },
  { key: 'item-jade-amulet', label: '✨ 장신구 · 옥 목걸이', category: 'gear' },
  { key: 'item-bronze-sword', label: '⚔️ 문명 무기 · 청동 검', category: 'gear' },
  { key: 'item-iron-sword', label: '⚔️ 문명 무기 · 철제 검', category: 'gear' },
  { key: 'item-steel-sword', label: '⚔️ 문명 무기 · 강철 검', category: 'gear' },
  { key: 'item-bronze-axe', label: '🪓 문명 도구 · 청동 도끼', category: 'gear' },
  { key: 'item-iron-axe', label: '🪓 문명 도구 · 철제 도끼', category: 'gear' },
  { key: 'item-steel-axe', label: '🪓 문명 도구 · 강철 도끼', category: 'gear' },
  { key: 'item-bronze-pickaxe', label: '⛏️ 문명 도구 · 청동 곡괭이', category: 'gear' },
  { key: 'item-iron-pickaxe', label: '⛏️ 문명 도구 · 철제 곡괭이', category: 'gear' },
  { key: 'item-steel-pickaxe', label: '⛏️ 문명 도구 · 강철 곡괭이', category: 'gear' },
  { key: 'item-torch', label: '🔥 보조 무기 · 원시 횃불', category: 'gear' },
  { key: 'item-stone-shield', label: '🛡️ 방어구 · 돌 방패', category: 'gear' },
  { key: 'item-leather-shield', label: '🛡️ 방어구 · 가죽 방패', category: 'gear' },
  { key: 'item-bronze-shield', label: '🛡️ 방어구 · 청동 방패', category: 'gear' },
  { key: 'item-iron-shield', label: '🛡️ 방어구 · 철제 방패', category: 'gear' },
  { key: 'item-bronze-spear', label: '🗡️ 무기 · 청동 창', category: 'gear' },
  { key: 'item-iron-spear', label: '🗡️ 무기 · 철제 창', category: 'gear' },
  { key: 'item-steel-spear', label: '🗡️ 무기 · 강철 창', category: 'gear' },
  { key: 'item-obsidian-dagger', label: '🗡️ 무기 · 흑요석 단검', category: 'gear' },
  { key: 'item-bone-harpoon', label: '🗡️ 무기 · 뼈 작살', category: 'gear' },
  { key: 'item-composite-bow', label: '🏹 무기 · 명품 합성궁', category: 'gear' },
  { key: 'item-heavy-club', label: '🪵 무기 · 돌가시 몽둥이', category: 'gear' },
  { key: 'item-stone-chisel', label: '⛏️ 도구 · 돌 끌', category: 'gear' },
  { key: 'item-bronze-knife', label: '🔪 도구 · 청동 손칼', category: 'gear' },
  { key: 'item-iron-knife', label: '🔪 도구 · 철제 손칼', category: 'gear' },
  { key: 'item-bone-needle', label: '🧵 도구 · 뼈 바늘', category: 'gear' },
  { key: 'item-fishing-rod', label: '🎣 생존 도구 · 원시 낚싯대', category: 'gear' },
];

export const ITEM_TARGETS: SpriteTargetEntry[] = [
  { key: 'item-sinew', label: '🧵 재료 · 동물 힘줄', category: 'item' },
  { key: 'item-fossil', label: '🐚 보물 · 암모나이트 화석', category: 'item' },
  { key: 'item-amber', label: '🍯 보물 · 호박 보석', category: 'item' },
  { key: 'item-ruby', label: '💎 보석 · 타오르는 루비', category: 'item' },
  { key: 'item-sapphire', label: '💎 보석 · 차가운 사파이어', category: 'item' },
  { key: 'item-emerald', label: '💎 보석 · 생명의 에메랄드', category: 'item' },
  { key: 'item-poison-gland', label: '☠️ 재료 · 맹독샘', category: 'item' },
  { key: 'item-dragon-scale', label: '🐉 보물 · 용의 비늘', category: 'item' },
  { key: 'item-jerky', label: '🥩 식량 · 말린 고기 (육포)', category: 'item' },
  { key: 'item-spring-water', label: '💧 식수 · 맑은 샘물', category: 'item' },
  { key: 'item-grindstone', label: '🪨 도구 재료 · 원시 숫돌', category: 'item' },
  { key: 'item-mortar-pestle', label: '🥣 가공 도구 · 약초 절구', category: 'item' },
  { key: 'item-healing-ointment', label: '🌿 의약품 · 상처 치료 연고', category: 'item' },
  { key: 'item-antidote', label: '🧪 의약품 · 해독 물약', category: 'item' },
  { key: 'item-flint', label: '🪨 재료 · 부싯돌', category: 'item' },
  { key: 'item-branch', label: '🪵 재료 · 나뭇가지', category: 'item' },
  { key: 'item-log', label: '🪵 재료 · 통나무', category: 'item' },
  { key: 'item-fiber', label: '🧶 재료 · 식물 섬유', category: 'item' },
  { key: 'item-bone', label: '🦴 재료 · 뼈', category: 'item' },
  { key: 'item-hide', label: '🧥 재료 · 날가죽', category: 'item' },
  { key: 'item-tusk', label: '🦣 재료 · 엄니 (상아)', category: 'item' },
  { key: 'item-clay', label: '🏺 재료 · 점토', category: 'item' },
  { key: 'item-soil', label: '🌱 재료 · 흙', category: 'item' },
  { key: 'item-herb', label: '🌿 재료 · 약초', category: 'item' },
  { key: 'item-resin', label: '🍯 재료 · 송진', category: 'item' },
  { key: 'item-bitumen', label: '🖤 재료 · 천연 역청 (아스팔트)', category: 'item' },
  { key: 'item-coal', label: '⬛ 재료 · 석탄', category: 'item' },
  { key: 'item-limestone', label: '⬜ 재료 · 석회석', category: 'item' },
  { key: 'item-sulfur', label: '💛 재료 · 유황', category: 'item' },
  { key: 'item-obsidian', label: '🖤 광물 · 흑요석', category: 'item' },
  { key: 'item-quartz', label: '💎 광물 · 석영', category: 'item' },
  { key: 'item-ochre', label: '🎨 광물 · 황토 안료', category: 'item' },
  { key: 'item-jade', label: '🟢 광물 · 옥', category: 'item' },
  { key: 'item-copper-ore', label: '🟤 광물 · 구리 원석', category: 'item' },
  { key: 'item-tin-ore', label: '⚪ 광물 · 주석 원석', category: 'item' },
  { key: 'item-silver-ore', label: '🥈 광물 · 은광석', category: 'item' },
  { key: 'item-gold-ore', label: '🥇 광물 · 사금·금광석', category: 'item' },
  { key: 'item-magnetite', label: '🧲 광물 · 자철석', category: 'item' },
  { key: 'item-mercury', label: '💧 광물 · 진사·수은', category: 'item' },
  { key: 'item-meteor-shard', label: '🌠 광물 · 운석 파편', category: 'item' },
  { key: 'item-mana-stone', label: '🔮 광물 · 고대 마력석', category: 'item' },
  { key: 'item-cordage', label: '🧵 가공 · 노끈', category: 'item' },
  { key: 'item-fur', label: '🧥 가공 · 털가죽', category: 'item' },
  { key: 'item-leather', label: '🥋 가공 · 가죽', category: 'item' },
  { key: 'item-clay-pot', label: '🏺 가공 · 토기', category: 'item' },
  { key: 'item-copper-ingot', label: '🧱 가공 · 구리 주괴', category: 'item' },
  { key: 'item-bronze-ingot', label: '🧱 가공 · 청동 주괴', category: 'item' },
  { key: 'item-steel-ingot', label: '🧱 가공 · 강철 주괴', category: 'item' },
  { key: 'item-charcoal', label: '🪵 가공 · 목탄 (가공 숯)', category: 'item' },
  { key: 'item-salve', label: '🧪 가공 · 약초 연고', category: 'item' },
  { key: 'item-ancient-fang', label: '🦷 보물 · 고대의 송곳니', category: 'item' },
  { key: 'item-dino-egg', label: '🥚 보물 · 신비한 픽셀 공룡 알', category: 'item' },
  { key: 'item-frost-shard', label: '❄️ 보물 · 빙결석 조각', category: 'item' },
  { key: 'item-frost-pelt', label: '❄️ 보물 · 혹한의 모피', category: 'item' },
  { key: 'item-prime-pelt', label: '👑 보물 · 우두머리 털가죽', category: 'item' },
  { key: 'item-alpha-heart', label: '💖 보물 · 야수의 심장', category: 'item' },
  { key: 'item-taming-snare', label: '🪤 도구 · 가죽 올가미', category: 'item' },
  { key: 'item-beast-bait', label: '🥩 도구 · 특제 미끼', category: 'item' },
  { key: 'item-tome-primal-strike', label: '📜 비전서 · 원시 일격', category: 'item' },
  { key: 'item-tome-iron-skin', label: '📜 비전서 · 바위 피부', category: 'item' },
  { key: 'item-tome-beast-mastery', label: '📜 비전서 · 야수 교감', category: 'item' },
  { key: 'item-berry', label: '🍓 식량 · 산딸기', category: 'item' },
  { key: 'item-apple', label: '🍎 식량 · 사과', category: 'item' },
  { key: 'item-pear', label: '🍐 식량 · 돌배', category: 'item' },
  { key: 'item-coconut', label: '🥥 식량 · 야자 열매', category: 'item' },
  { key: 'item-raw-meat', label: '🥩 식량 · 날고기', category: 'item' },
  { key: 'item-cooked-meat', label: '🍖 식량 · 구운 고기', category: 'item' },
  { key: 'item-dried-fruit', label: '🍎 식량 · 말린 과일', category: 'item' },
  { key: 'item-dino-tail-steak', label: '🥩 식량 · 우두머리 스테이크 정식', category: 'item' },
  { key: 'item-sweet-fruit-skewers', label: '🍡 식량 · 달콤 과일 구이 꼬치', category: 'item' },
  { key: 'item-bone-stew', label: '🍲 식량 · 진한 뼈 고기 스튜', category: 'item' },
  { key: 'item-spice-roast', label: '🍗 식량 · 향신료 통고기 구이', category: 'item' },
  { key: 'item-sacred-bread', label: '🍞 식량 · 생명의 떡', category: 'item' },
  { key: 'item-purify-dew', label: '💧 식량 · 정화의 이슬', category: 'item' },
  { key: 'item-sacred-essence', label: '✨ 비약 · 성스러운 정수', category: 'item' },
  { key: 'item-wild-spice', label: '🌿 조미료 · 야생 향신초', category: 'item' },
  { key: 'item-rock-salt', label: '🧂 조미료 · 암염 결정', category: 'item' },
  { key: 'item-pepper-berry', label: '🌶️ 조미료 · 매운 후추열매', category: 'item' },
  { key: 'item-shell', label: '🐚 화폐 · 조개 화폐', category: 'item' },
  { key: 'bundle-drop', label: '📦 드롭 · 전리품 보따리', category: 'item' },
];

export const MOB_TARGETS: SpriteTargetEntry[] = [
  ...PREHISTORIC_MOBS.map(m => ({
    key: `mob:${m.id}`,
    label: `🦖 선사시대 몹 · [${m.tier}] ${m.name}`,
    category: 'mob' as const,
    fallbackKey: MOB_FALLBACK_SPECIES_MAP[m.id] ? `mob:${MOB_FALLBACK_SPECIES_MAP[m.id]}` : undefined,
  })),
  ...Object.entries(CREATURES)
    .filter(([k]) => !PREHISTORIC_MOBS.some(m => m.id === k))
    .map(([k, c]) => ({
      key: `mob:${k}`,
      label: `${k.startsWith('custom_') ? '커스텀 몹' : '야생 몹'} · ${c.name}`,
      category: 'mob' as const,
      fallbackKey: MOB_FALLBACK_SPECIES_MAP[k] ? `mob:${MOB_FALLBACK_SPECIES_MAP[k]}` : undefined,
    })),
];

/**
 * Returns the complete ordered list of canonical sprite targets for `/admin/sprites`.
 */
export function getAllSpriteRegistryTargets(
  customPets: { pet_id: string; name: string }[] = []
): SpriteTargetEntry[] {
  const dynamicPets: SpriteTargetEntry[] = customPets
    .filter(p => !DINO_PET_TARGETS.some(d => d.key === `pet:${p.pet_id}`))
    .map(p => ({
      key: `pet:${p.pet_id}`,
      label: `커스텀 펫 · 🐾 ${p.name}`,
      category: 'pet' as const,
    }));

  return [
    ...HUNTER_TARGETS,
    ...TRIBE_TARGETS,
    ...DINO_PET_TARGETS,
    ...dynamicPets,
    ...MOB_TARGETS,
    ...BUILDING_TARGETS,
    ...NODE_TARGETS,
    ...PROP_TARGETS,
    ...GEAR_TARGETS,
    ...ITEM_TARGETS,
  ];
}
