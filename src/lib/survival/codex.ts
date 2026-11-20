import type { ItemId } from './items';
import type { SpriteKey } from './types';
import type { PhysicalAttributes, BuildingMechanicTag, GearMechanicTag } from './intentCrafting';

export interface CodexPetDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
  habitat: string;
}

export interface CodexResourceDef {
  id: ItemId;
  name: string;
  desc: string;
  icon: string;
  category: 'material' | 'ore' | 'food';
  rarity: 'common' | 'rare' | 'epic';
}

export interface CodexBossDef {
  id: string;
  name: string;
  title: string;
  desc: string;
  icon: string;
  difficulty: 'normal' | 'hard' | 'nightmare';
}

export interface CodexAiInvention {
  id: string;
  name: string;
  desc: string;
  type: 'architecture' | 'armory';
  categoryLabel: string;
  physics: PhysicalAttributes;
  mechanics: (BuildingMechanicTag | GearMechanicTag)[];
  materials: Record<string, number>;
  createdAt: number;
}

export interface CodexState {
  discoveredResources: string[]; // ItemId[]
  discoveredPets: string[]; // speciesId[]
  aiInventions: CodexAiInvention[];
  defeatedBosses: string[]; // creatureId[]
  hasUnseenNew?: boolean;
}

/** 1. 공룡 펫 도감 마스터 데이터 */
export const CODEX_PETS: CodexPetDef[] = [
  { id: 'baby_raptor', name: '테라녹스', desc: '민첩한 이족보행 소형 랩터. 빠른 기동력과 날카로운 발톱을 지녔습니다.', icon: '🦖', habitat: '암석 황무지' },
  { id: 'mini_triceratops', name: '케라톱스', desc: '견고한 세 뿔과 목 프릴을 가진 아기 초식룡. 방어력이 뛰어납니다.', icon: '🦏', habitat: '평원 지대' },
  { id: 'baby_stego', name: '스테고론', desc: '등 줄기를 따라 골판이 솟아난 아기 스테고사우루스. 꼬리 가시가 위협적입니다.', icon: '🦕', habitat: '습지대' },
  { id: 'baby_ptera', name: '아기 프테라노돈', desc: '바람을 타고 활공하는 고대 익룡. 정찰과 빠른 경보에 능합니다.', icon: '🦅', habitat: '해안 절벽' },
  { id: 'skull_dragon', name: '스컬 드래곤', desc: '흑마술사의 암흑 제단에서 화석 뼈와 영혼으로 각성한 불사의 전설룡.', icon: '💀', habitat: '흑마술 성소' },
  { id: 'carnotera92', name: '카르노테라', desc: '두 뿔이 돋아난 흉포한 맹공룡. 단숨에 적의 숨통을 끊는 돌진력을 지녔습니다.', icon: '🐊', habitat: '붉은 협곡' },
  { id: 'archeron02', name: '아케론', desc: '고대 심해와 늪지를 지배하는 중갑 수룡. 단단한 껍질을 자랑합니다.', icon: '🐢', habitat: '안개 늪지' },
  { id: 'dracotera93', name: '드라코테라', desc: '몸에서 화염 증기를 뿜어내는 붉은 비룡. 뜨거운 화염 숨결을 다룹니다.', icon: '🐲', habitat: '화산 지대' },
  { id: 'megalodi_x', name: '메갈로디', desc: '태곳적 거수. 거대한 턱 힘으로 바위도 부수는 위용을 자랑합니다.', icon: '🦈', habitat: '고대 심연' },
  { id: 'faronoxtlg', name: '파로녹스', desc: '황금빛 깃털과 모래폭풍의 축복을 받은 사막의 신비로운 수호룡.', icon: '✨', habitat: '태양의 사막' },
  { id: 'balodon77', name: '발로돈', desc: '온몸이 둥근 철갑 비늘로 뒤덮인 중장갑 공룡. 절대 뚫리지 않는 방패입니다.', icon: '🛡️', habitat: '철광 산맥' },
];

/** 2. 발견 자원 도감 마스터 데이터 */
export const CODEX_RESOURCES: CodexResourceDef[] = [
  { id: 'branch', name: '나뭇가지', desc: '불쏘시개와 손잡이, 울타리의 가장 기초적인 땔감.', icon: '🪵', category: 'material', rarity: 'common' },
  { id: 'flint', name: '부싯돌', desc: '날카롭게 깨뜨려 날을 세우는 기초 석기이자 불을 피우는 돌.', icon: '🪨', category: 'material', rarity: 'common' },
  { id: 'berry', name: '산딸기', desc: '허기를 채우고 비타민을 공급하는 달콤한 야생 산딸기.', icon: '🍓', category: 'food', rarity: 'common' },
  { id: 'log', name: '통나무', desc: '도끼로 베어낸 거목의 원목. 거점의 기둥과 방책의 뼈대.', icon: '🪵', category: 'material', rarity: 'common' },
  { id: 'bone', name: '공룡 뼈', desc: '동물의 뼈. 날카로운 작살, 바늘, 암흑 제단의 필수 매개체.', icon: '🦴', category: 'material', rarity: 'common' },
  { id: 'fiber', name: '식물 섬유', desc: '식물의 껍질을 꼬아 만든 튼튼한 노끈과 활시위의 재료.', icon: '🧶', category: 'material', rarity: 'common' },
  { id: 'clay', name: '점토', desc: '물가 찰흙. 빚어서 말리면 단단한 토기와 화로 벽체가 된다.', icon: '🏺', category: 'material', rarity: 'common' },
  { id: 'hide', name: '가죽', desc: '사냥한 짐승의 질긴 생가죽. 방어구와 배낭의 기본 재료.', icon: '📜', category: 'material', rarity: 'common' },
  { id: 'fur', name: '털가죽', desc: '혹독한 겨울 추위를 막아주는 보온성 높은 두터운 털.', icon: '🧥', category: 'material', rarity: 'common' },
  { id: 'resin', name: '송진', desc: '소나무에서 채취한 끈끈한 천연 접착제. 횃불과 방수 코팅 재료.', icon: '🍯', category: 'material', rarity: 'common' },
  { id: 'copper_ore', name: '구리 원석', desc: '청동기 문명을 여는 연성 높은 붉은 금속 광석.', icon: '🟤', category: 'ore', rarity: 'common' },
  { id: 'tin_ore', name: '주석 원석', desc: '구리와 합금하여 청동 무기를 완성하는 은백색 희귀 광석.', icon: '⚪', category: 'ore', rarity: 'rare' },
  { id: 'bitumen', name: '천연 역청', desc: '지표면에서 솟구치는 천연 아스팔트. 100% 방수 및 강력 접착제.', icon: '🖤', category: 'material', rarity: 'rare' },
  { id: 'coal', name: '석탄', desc: '퇴적된 검은 보석. 용광로의 불길을 1000도 이상 올리는 초고열 연료.', icon: '⬛', category: 'ore', rarity: 'common' },
  { id: 'magnetite', name: '자철석', desc: '강한 자성을 띤 고순도 철광석. 강철 제련과 나침반의 핵심.', icon: '🧲', category: 'ore', rarity: 'rare' },
  { id: 'obsidian', name: '흑요석', desc: '용암이 급랭하여 형성된 천연 유리. 철보다 날카로운 절삭력.', icon: '🗡️', category: 'ore', rarity: 'rare' },
  { id: 'jade', name: '비취 옥석', desc: '은은한 녹색을 띠는 귀한 보석. 주술사의 집중력과 부적의 핵.', icon: '🟢', category: 'ore', rarity: 'epic' },
  { id: 'quartz', name: '석영 결정', desc: '빛을 굴절시키는 투명한 비전 광물. 마나 파동을 증폭한다.', icon: '🔮', category: 'ore', rarity: 'epic' },
  { id: 'hematite', name: '적철석', desc: '붉은 빛을 띠는 무거운 철광석. 견고한 대장간 무기의 원천.', icon: '🧱', category: 'ore', rarity: 'rare' },
  { id: 'ochre', name: '황토 안료', desc: '동굴 벽화와 주술적 표식을 새기는 천연 붉은 흙 안료.', icon: '🎨', category: 'material', rarity: 'common' },
];

/** 3. 우두머리 도감 마스터 데이터 */
export const CODEX_BOSSES: CodexBossDef[] = [
  { id: 'boss_direwolf', name: '우두머리 · 거대 늑대', title: '설원의 백은 군주', desc: '회색 늑대 무리를 통솔하는 거구의 우두머리. 날카로운 냉기 이빨로 기습합니다.', icon: '🐺', difficulty: 'hard' },
  { id: 'boss_mammoth', name: '우두머리 · 분노한 매머드', title: '대지의 거신', desc: '상아 길이가 성벽 높이에 달하는 초대형 고대 매머드. 밟는 곳마다 지진이 일어납니다.', icon: '🦣', difficulty: 'nightmare' },
  { id: 'raptor', name: '우두머리 랩터', title: '그림자 습격자', desc: '사냥꾼들을 무리지어 포위하는 잔혹하고 교활한 공룡 무리의 알파.', icon: '🦖', difficulty: 'normal' },
  { id: 'boar', name: '거대 돌진 멧돼지', title: '숲의 폭군', desc: '두꺼운 가죽과 송곳니로 바위도 들이받아 부수는 저돌적인 맹수.', icon: '🐗', difficulty: 'normal' },
  { id: 'wolf', name: '심야의 검은 늑대', title: '어둠의 사냥꾼', desc: '밤이 깊어지면 눈을 붉게 빛내며 원정대의 숨통을 노리는 맹수.', icon: '🐾', difficulty: 'normal' },
];

export interface CodexProgressResult {
  totalItems: number;
  discoveredCount: number;
  percentage: number;
  activeBuffs: {
    threshold: number;
    title: string;
    desc: string;
    active: boolean;
    icon: string;
  }[];
  atkBonusPct: number;
  gatherBonusPct: number;
  petHpBonusPct: number;
  hatchDiscountPct: number;
}

/** 도감 달성도 및 영구 패시브 버프 계산기 */
export function computeCodexProgress(codex?: Partial<CodexState>): CodexProgressResult {
  const discoveredPets = codex?.discoveredPets ?? [];
  const discoveredResources = codex?.discoveredResources ?? [];
  const defeatedBosses = codex?.defeatedBosses ?? [];
  const aiInventions = codex?.aiInventions ?? [];

  // 4개 카테고리 고정 총합 (발명품은 최소 5개 기준, 그 이상 발명 시 가변 확장)
  const petTotal = CODEX_PETS.length;
  const resTotal = CODEX_RESOURCES.length;
  const bossTotal = CODEX_BOSSES.length;
  const invTotal = Math.max(5, aiInventions.length);

  const totalItems = petTotal + resTotal + bossTotal + invTotal;
  const discoveredCount =
    discoveredPets.length +
    discoveredResources.length +
    defeatedBosses.length +
    aiInventions.length;

  const percentage = Math.min(100, Math.round((discoveredCount / totalItems) * 100));

  const b10 = percentage >= 10;
  const b30 = percentage >= 30;
  const b50 = percentage >= 50;
  const b80 = percentage >= 80;

  const activeBuffs = [
    { threshold: 10, title: '용맹의 기록', desc: '공격력 +5%', active: b10, icon: '⚔️' },
    { threshold: 30, title: '풍요의 안목', desc: '채집량 +10% (추가 수확 확률)', active: b30, icon: '🎒' },
    { threshold: 50, title: '고대 생명력', desc: '수호 펫 최대 체력 +15%', active: b50, icon: '🦖' },
    { threshold: 80, title: '생명의 박동', desc: '공룡 알 부화 거리 -20%', active: b80, icon: '🥚' },
  ];

  return {
    totalItems,
    discoveredCount,
    percentage,
    activeBuffs,
    atkBonusPct: b10 ? 5 : 0,
    gatherBonusPct: b30 ? 10 : 0,
    petHpBonusPct: b50 ? 15 : 0,
    hatchDiscountPct: b80 ? 20 : 0,
  };
}

export function defaultCodexState(): CodexState {
  return {
    discoveredResources: ['branch', 'flint', 'berry'], // 시작 기본 자원 3종
    discoveredPets: ['baby_raptor'], // 기본 공룡
    aiInventions: [],
    defeatedBosses: [],
    hasUnseenNew: false,
  };
}
