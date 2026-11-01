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
  primal_strike: 'special', iron_skin: 'special', beast_mastery: 'companion',
};

/** Planned features shown as locked previews until implemented. */
export const PLANNED: Partial<Record<TechCategory, { name: string; desc: string }[]>> = {
  special: [
    { name: '돌팔매 연타', desc: '짧은 시간 연속 투척 이펙트 기술' },
    { name: '포효', desc: '주변 짐승을 겁주어 물러나게 하는 기술' },
    { name: '불씨 뿌리기', desc: '모닥불에서 불똥을 뿌리는 범위 기술' },
  ],
  build: [
    { name: '움집', desc: '거점을 움집으로 확장해 저장 공간 증가' },
    { name: '목책', desc: '거점 주변 짐승 습격 방어' },
    { name: '전진기지', desc: '먼 곳에 두 번째 거점 건설' },
  ],
  companion: [
    { name: '늑대 길들이기', desc: '고기를 주어 늑대를 펫으로 테이밍' },
    { name: '부족원 모집', desc: '동맹을 부하로 받아 함께 채집' },
    { name: '포로 노역', desc: '쓰러뜨린 적을 거점 노역에 배치' },
  ],
};
