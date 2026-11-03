export type TechCategory = 'general' | 'craft' | 'special' | 'talk' | 'build' | 'companion';

export const TECH_CATEGORIES: { id: TechCategory; label: string }[] = [
  { id: 'general', label: '일반' },
  { id: 'craft', label: '제작' },
  { id: 'special', label: '특수' },
  { id: 'talk', label: '대화' },
  { id: 'build', label: '건축' },
  { id: 'companion', label: '동료' },
];

/** Category of each existing tech id; unknown ids fall back to general. */
export const TECH_CATEGORY: Record<string, TechCategory> = {
  knapping: 'general', binding: 'general', fire: 'general', herbalism: 'general',
  hafting: 'craft', pottery: 'craft', tanning: 'craft', bonecraft: 'craft', obsidian: 'craft', furcraft: 'craft', jadework: 'craft',
  stone_barrage: 'special', roar: 'special', ember_scatter: 'special',
  hut_building: 'build', palisade: 'build', outpost: 'build',
  wolf_taming: 'companion', recruitment: 'companion', rescue: 'companion',
  primal_strike: 'special', iron_skin: 'special', beast_mastery: 'companion',
  keen_eye: 'special', long_reach: 'special', auto_pickup: 'special',
  pocket_1: 'special', pocket_2: 'special', pocket_3: 'special',
};

