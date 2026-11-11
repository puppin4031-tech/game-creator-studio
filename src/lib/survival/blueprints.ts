// Known altar blueprints: shown as hints and used to give matching inventions a fitting name.
import type { InventionCategory } from './invention';

export interface Blueprint { name: string; group: string; category: InventionCategory; materials: Record<string, number>; ranged?: boolean; desc: string }

export const BLUEPRINTS: Blueprint[] = [
  { name: '흑요석 단검', group: '근접 무기', category: 'weapon', materials: { obsidian: 3, cordage: 1 }, desc: '날카로운 흑요석 날을 노끈으로 감은 단검.' },
  { name: '부싯돌 투창', group: '원거리 무기', category: 'weapon', materials: { flint: 3, branch: 3, cordage: 1 }, ranged: true, desc: '멀리서 던져 짐승을 맞히는 창.' },
  { name: '가죽 갑옷', group: '방어구', category: 'building', materials: { leather: 4, hide: 2, bone: 2 }, desc: '뼈 조각을 덧댄 질긴 가죽 갑옷.' },
  { name: '겨울 방한 털옷', group: '겨울 방어구', category: 'building', materials: { frost_pelt: 4, leather: 2, bone: 1 }, desc: '눈보라도 견디는 두툼한 털옷.' },
  { name: '부싯돌 곡괭이', group: '도구', category: 'tool', materials: { flint: 3, branch: 2, cordage: 1 }, desc: '돌을 캐고 나무를 찍는 곡괭이.' },
  { name: '얼음 썰매', group: '겨울 도구', category: 'tool', materials: { frost_shard: 2, log: 2, cordage: 2 }, desc: '짐을 싣고 눈 위를 미끄러지는 썰매.' },
  { name: '옥 수호 부적', group: '부적', category: 'relic', materials: { jade: 2, quartz: 1 }, desc: '옥과 수정으로 엮은 행운의 부적.' },
];

/** Same category, same material set, each at least the blueprint amount. */
export function matchBlueprint(category: InventionCategory, materials: Record<string, number>): Blueprint | null {
  const ids = Object.keys(materials).filter(id => materials[id] > 0);
  return BLUEPRINTS.find(b => b.category === category && ids.length === Object.keys(b.materials).length
    && Object.entries(b.materials).every(([id, q]) => (materials[id] ?? 0) >= q)) ?? null;
}
