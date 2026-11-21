import React, { useMemo, useState } from 'react';
import {
  CODEX_BOSSES,
  computeCodexProgress,
  getAllCodexPets,
  getAllCodexResources,
  normalizeCodexPetId,
  syncCodexStateWithSave,
  type CodexState,
  type CodexAiInvention,
  type SaveLikeForCodex,
} from '@/lib/survival/codex';
import { Sparkles } from 'lucide-react';
import PetSprite from './survival/PetSprite';
import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import { bundledSpriteUrl, useItemCatalog } from '@/hooks/useItemCatalog';

interface TribeCodexModalProps {
  open: boolean;
  onClose: () => void;
  codex: Partial<CodexState>;
  save?: SaveLikeForCodex;
}

type CodexTab = 'pets' | 'resources' | 'inventions' | 'bosses';
type ResourceFilter = 'all' | 'material' | 'ore' | 'food' | 'processed';

const CATEGORY_LABELS: Record<Exclude<ResourceFilter, 'all'>, string> = {
  material: '기초 재료',
  ore: '광물·보석',
  food: '식량·요리',
  processed: '가공·비전',
};

export const TribeCodexModal: React.FC<TribeCodexModalProps> = ({
  open,
  onClose,
  codex,
  save,
}) => {
  const [tab, setTab] = useState<CodexTab>('pets');
  const [resFilter, setResFilter] = useState<ResourceFilter>('all');

  const { data: customCatalog } = useCustomCatalog();
  const { data: itemCatalog } = useItemCatalog();

  const allPets = useMemo(
    () => getAllCodexPets(customCatalog?.pets),
    [customCatalog?.pets]
  );

  const allResources = useMemo(
    () => getAllCodexResources(itemCatalog),
    [itemCatalog]
  );

  // Merge codex state with live save (currently owned + historically owned items & pets)
  const effectiveCodex = useMemo(() => {
    if (save) {
      return syncCodexStateWithSave({ ...save, codex });
    }
    return {
      discoveredResources: codex.discoveredResources ?? [],
      discoveredPets: (codex.discoveredPets ?? []).map(normalizeCodexPetId),
      aiInventions: codex.aiInventions ?? [],
      defeatedBosses: codex.defeatedBosses ?? [],
      hasUnseenNew: codex.hasUnseenNew ?? false,
    };
  }, [codex, save]);

  const progress = useMemo(
    () => computeCodexProgress(effectiveCodex, allPets, allResources),
    [effectiveCodex, allPets, allResources]
  );

  // Live current ownership lookup (backpack + storage for items, pets[] for dinos)
  const currentOwnedItemCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const st of save?.backpack ?? []) {
      if (st && st.count > 0) map.set(st.itemId, (map.get(st.itemId) ?? 0) + st.count);
    }
    for (const st of save?.storage ?? []) {
      if (st && st.count > 0) map.set(st.itemId, (map.get(st.itemId) ?? 0) + st.count);
    }
    return map;
  }, [save?.backpack, save?.storage]);

  const currentOwnedPetLevels = useMemo(() => {
    const map = new Map<string, { count: number; maxLevel: number }>();
    for (const p of save?.pets ?? []) {
      if (!p?.speciesId) continue;
      const cid = normalizeCodexPetId(p.speciesId);
      const prev = map.get(cid);
      map.set(cid, {
        count: (prev?.count ?? 0) + 1,
        maxLevel: Math.max(prev?.maxLevel ?? 0, p.level ?? 1),
      });
    }
    return map;
  }, [save?.pets]);

  if (!open) return null;

  const discoveredPets = new Set(effectiveCodex.discoveredPets.map(normalizeCodexPetId));
  const discoveredResources = new Set(effectiveCodex.discoveredResources);
  const defeatedBosses = new Set(effectiveCodex.defeatedBosses);
  const aiInventions: CodexAiInvention[] = effectiveCodex.aiInventions ?? [];

  const unlockedPetCount = allPets.filter(p => discoveredPets.has(p.id)).length;
  const unlockedResCount = allResources.filter(r => discoveredResources.has(r.id)).length;
  const unlockedBossCount = CODEX_BOSSES.filter(b => defeatedBosses.has(b.id)).length;

  const filteredResources =
    resFilter === 'all'
      ? allResources
      : allResources.filter(r => r.category === resFilter);

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 font-pixel">
      <div className="w-full max-w-lg bg-stone-950 border-4 border-amber-500 rounded p-4 text-white shadow-2xl space-y-3.5 max-h-[92dvh] overflow-y-auto">
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <div>
              <h2 className="text-base font-bold text-amber-300">부족 대도감 (Tribe Codex)</h2>
              <p className="text-[10px] text-stone-400">
                현재 보유 중이거나 과거에 획득했던 모든 재료·공룡 펫이 자동 해금되며 영구 버프를 부여합니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-white px-2 py-1 border border-stone-700 bg-stone-900 rounded shrink-0"
          >
            [닫기]
          </button>
        </div>

        {/* 전체 달성도 프로그레스 바 & 버프 뱃지 */}
        <div className="p-3 bg-stone-900 border border-stone-700 rounded space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              전체 수집 달성도: <b className="text-white font-mono">{progress.percentage}%</b>
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              {progress.discoveredCount} / {progress.totalItems} 항목 수집
            </span>
          </div>

          <div className="h-3 w-full bg-stone-800 border border-stone-600 rounded-xs overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>

          {/* 4대 영구 마일스톤 버프 뱃지 */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {progress.activeBuffs.map((buff) => (
              <div
                key={buff.threshold}
                className={`flex items-center justify-between px-2 py-1.5 border rounded text-[11px] transition-all ${
                  buff.active
                    ? 'bg-amber-950/40 border-amber-400/80 text-amber-100 shadow-sm'
                    : 'bg-black/40 border-stone-800 text-stone-500 opacity-70'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm shrink-0">{buff.icon}</span>
                  <div className="min-w-0">
                    <span className="font-bold block truncate">{buff.title}</span>
                    <span className="text-[9px] block text-stone-300 truncate">{buff.desc}</span>
                  </div>
                </div>
                <span className={`text-[10px] font-mono font-bold shrink-0 ml-1 ${buff.active ? 'text-emerald-400' : 'text-stone-500'}`}>
                  {buff.active ? '● 활성' : `${buff.threshold}%`}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4개 카테고리 탭 선택 */}
        <div className="grid grid-cols-4 gap-1 border-b border-stone-800 pb-1">
          <button
            type="button"
            onClick={() => setTab('pets')}
            className={`py-2 px-1 text-center text-xs font-bold border-b-2 transition-all ${
              tab === 'pets'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🦖 공룡 펫 ({unlockedPetCount}/{allPets.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('resources')}
            className={`py-2 px-1 text-center text-xs font-bold border-b-2 transition-all ${
              tab === 'resources'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            💎 재료 ({unlockedResCount}/{allResources.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('inventions')}
            className={`py-2 px-1 text-center text-xs font-bold border-b-2 transition-all ${
              tab === 'inventions'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            🔮 AI 발명 ({aiInventions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('bosses')}
            className={`py-2 px-1 text-center text-xs font-bold border-b-2 transition-all ${
              tab === 'bosses'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            👑 우두머리 ({unlockedBossCount}/{CODEX_BOSSES.length})
          </button>
        </div>

        {/* 탭 내용 영역 */}
        <div className="space-y-2 min-h-[240px]">
          {/* 1. 공룡 펫 탭 (저장된 모든 공룡 펫 & 관리자 지정 스프라이트 표시) */}
          {tab === 'pets' && (
            <div className="grid grid-cols-2 gap-2">
              {allPets.map((pet) => {
                const isFound = discoveredPets.has(pet.id);
                const livePet = currentOwnedPetLevels.get(pet.id);
                return (
                  <div
                    key={pet.id}
                    className={`p-2.5 rounded border transition-all ${
                      isFound
                        ? 'bg-stone-900/90 border-stone-700 text-white'
                        : 'bg-black/60 border-stone-800/80 text-stone-500'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div
                        className={`w-11 h-11 rounded flex items-center justify-center shrink-0 overflow-hidden ${
                          isFound
                            ? 'bg-amber-950/40 border border-amber-600/40'
                            : 'bg-stone-900 border border-stone-800'
                        }`}
                      >
                        <div className={isFound ? '' : 'brightness-0 opacity-40 pointer-events-none select-none'}>
                          <PetSprite speciesId={pet.id} name={isFound ? pet.name : '???'} height={36} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs block truncate">
                            {isFound ? pet.name : '??? (미발견 공룡)'}
                          </span>
                          {isFound && (
                            <span
                              className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                livePet
                                  ? 'bg-emerald-950 border border-emerald-600/60 text-emerald-300'
                                  : 'bg-stone-800 text-amber-300'
                              }`}
                            >
                              {livePet ? `보유 Lv.${livePet.maxLevel}` : '수집됨'}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 block truncate">
                          서식지: {isFound ? pet.habitat : '???'}
                        </span>
                        {isFound && pet.abilitySummary && (
                          <span className="text-[9px] text-amber-300 block truncate font-semibold">
                            ★ {pet.abilitySummary}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] text-stone-400 leading-snug line-clamp-2">
                      {isFound ? pet.desc : '공룡 알을 부화하거나 합성하여 이 고대 생명체를 발견하세요.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* 2. 재료·자원 탭 (저장된 모든 비장비 재료/광물/식량/가공품 표시) */}
          {tab === 'resources' && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ['all', `전체 (${allResources.length})`],
                    ['material', '기초 재료'],
                    ['ore', '광물·보석'],
                    ['food', '식량·요리'],
                    ['processed', '가공·비전'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setResFilter(key)}
                    className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors ${
                      resFilter === key
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {filteredResources.map((res) => {
                  const isFound = discoveredResources.has(res.id);
                  const ownedCount = currentOwnedItemCounts.get(res.id) ?? 0;
                  const spriteSrc = res.imageUrl ?? bundledSpriteUrl(res.spriteKey);
                  return (
                    <div
                      key={res.id}
                      className={`p-2.5 rounded border transition-all ${
                        isFound
                          ? 'bg-stone-900/90 border-stone-700 text-white'
                          : 'bg-black/60 border-stone-800/80 text-stone-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`w-9 h-9 rounded flex items-center justify-center text-lg shrink-0 ${
                            isFound
                              ? 'bg-stone-800 border border-stone-600'
                              : 'bg-stone-900 border border-stone-800'
                          }`}
                        >
                          {spriteSrc ? (
                            <img
                              src={spriteSrc}
                              alt={isFound ? res.name : '???'}
                              className={`pixelated h-7 w-7 object-contain ${
                                isFound ? '' : 'brightness-0 opacity-40 select-none'
                              }`}
                            />
                          ) : (
                            <span className={isFound ? '' : 'brightness-0 opacity-40 select-none'}>
                              {res.icon}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs block truncate">
                              {isFound ? res.name : '??? (미발견 재료)'}
                            </span>
                            {isFound && (
                              <span
                                className={`text-[9px] px-1 py-0.2 rounded font-mono shrink-0 ${
                                  ownedCount > 0
                                    ? 'bg-emerald-950 border border-emerald-600/60 text-emerald-300'
                                    : 'bg-stone-800 text-stone-300'
                                }`}
                              >
                                {ownedCount > 0 ? `보유 ×${ownedCount}` : '수집됨'}
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-amber-400 block truncate">
                            {isFound
                              ? `${CATEGORY_LABELS[res.category] ?? '재료'} · ${
                                  res.rarity === 'epic'
                                    ? '★ 전설'
                                    : res.rarity === 'rare'
                                      ? '◆ 희귀'
                                      : res.rarity === 'uncommon'
                                        ? '▲ 고급'
                                        : '일반'
                                }`
                              : '미탐색'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-stone-400 leading-snug line-clamp-2">
                        {isFound ? res.desc : '채집, 사냥, 원정 또는 제작을 통해 획득하면 도감에 해금됩니다.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. AI 발명품 탭 */}
          {tab === 'inventions' && (
            <div className="space-y-2">
              {aiInventions.length > 0 ? (
                aiInventions.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-3 bg-stone-900 border border-amber-500/40 rounded space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{inv.type === 'architecture' ? '🏛️' : '⚔️'}</span>
                        <span className="font-bold text-amber-300 text-sm">{inv.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {inv.categoryLabel}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-stone-300 text-[11px] leading-snug">{inv.desc}</p>

                    {/* 물리 속성 분석 */}
                    <div className="grid grid-cols-4 gap-1 p-1.5 bg-black/60 border border-stone-800 rounded text-[10px] text-center font-mono">
                      <div>
                        <span className="text-stone-400 block">탄성</span>
                        <span className="text-amber-300 font-bold">{inv.physics?.elasticity ?? 50}%</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">내구</span>
                        <span className="text-emerald-400 font-bold">{inv.physics?.durability ?? 100}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">내후</span>
                        <span className="text-sky-300 font-bold">{inv.physics?.weatherResist ?? 60}%</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block">밀도</span>
                        <span className="text-purple-300 font-bold">{inv.physics?.density ?? 50}%</span>
                      </div>
                    </div>

                    {/* 기능 태그 */}
                    {inv.mechanics?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {inv.mechanics.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-600/40 text-amber-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center bg-stone-900/50 border border-dashed border-stone-800 rounded space-y-2">
                  <span className="text-3xl block">✨</span>
                  <p className="text-xs text-stone-300 font-bold">아직 AI로 발명한 창작물이 없습니다.</p>
                  <p className="text-[10px] text-stone-400 max-w-xs mx-auto leading-relaxed">
                    거점의 <b>[AI 맞춤 의도 설계 공방]</b>이나 <b>[고대 제단]</b>에서 자유로운 의도로 건축물과 장비를 설계하면 도감에 영구 소장됩니다!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 4. 우두머리 탭 */}
          {tab === 'bosses' && (
            <div className="space-y-2">
              {CODEX_BOSSES.map((boss) => {
                const isDefeated = defeatedBosses.has(boss.id);
                return (
                  <div
                    key={boss.id}
                    className={`p-3 rounded border transition-all ${
                      isDefeated
                        ? 'bg-stone-900 border-red-500/40 text-white'
                        : 'bg-black/60 border-stone-800/80 text-stone-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-9 h-9 rounded flex items-center justify-center text-xl shrink-0 ${
                            isDefeated
                              ? 'bg-red-950/40 border border-red-600/40'
                              : 'bg-stone-900 border border-stone-800 brightness-0 opacity-40'
                          }`}
                        >
                          {boss.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs">{isDefeated ? boss.name : '??? (미토벌 우두머리)'}</span>
                            <span className="text-[9px] px-1 rounded bg-red-950 border border-red-800 text-red-300 font-mono">
                              {boss.difficulty === 'nightmare' ? '악몽급' : boss.difficulty === 'hard' ? '상급' : '보통'}
                            </span>
                          </div>
                          <span className="text-[10px] text-stone-400">{isDefeated ? boss.title : '???'}</span>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold font-mono ${isDefeated ? 'text-emerald-400' : 'text-stone-600'}`}>
                        {isDefeated ? '🏆 토벌 완료' : '🔒 미토벌'}
                      </span>
                    </div>
                    <p className="text-[10px] text-stone-400 leading-snug">
                      {isDefeated ? boss.desc : '원정대를 이끌고 필드의 강력한 우두머리를 쓰러뜨려 도감에 기록을 새기세요.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs rounded border border-stone-600 transition-colors cursor-pointer"
        >
          도감 닫기
        </button>
      </div>
    </div>
  );
};

export default TribeCodexModal;
