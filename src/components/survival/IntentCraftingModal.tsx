import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Compass,
  Cpu,
  Flame,
  Hammer,
  HelpCircle,
  Layers,
  Minus,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { addStacks, countOf, hasAll } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';
import {
  analyzeCraftingIntent,
  BUILDING_MECHANICS_META,
  GEAR_MECHANICS_META,
  type BuildingMechanicTag,
  type GearMechanicTag,
  type IntentCraftResult,
  type PhysicalAttributes,
} from '@/lib/survival/intentCrafting';
import {
  canPlaceVillageBuilding,
  ensureVillageState,
  getVillageGridSize,
  VILLAGE_GRID_SIZE,
  type VillageState,
} from '@/lib/survival/village';
import { toast } from 'sonner';

export type CraftingMode = 'architecture' | 'armory';

interface Props {
  open: boolean;
  onClose: () => void;
  initialMode?: CraftingMode;
  storage: Stack[];
  backpack: Stack[];
  village?: VillageState;
  baseLevel?: 1 | 2 | 3;
  onConstructCustomBuilding: (params: {
    name: string;
    desc: string;
    category: 'fence' | 'tower' | 'building';
    mechanics: BuildingMechanicTag[];
    physics: PhysicalAttributes;
    hp: number;
    materials: Record<string, number>;
    x: number;
    y: number;
  }) => boolean;
  onCraftCustomGear: (params: {
    name: string;
    desc: string;
    category: 'melee' | 'ranged' | 'tool' | 'armor';
    mechanics: GearMechanicTag[];
    physics: PhysicalAttributes;
    atk?: number;
    def?: number;
    materials: Record<string, number>;
  }) => boolean;
}

// Available material options for primitive intentional crafting
const CRAFTING_MATERIAL_IDS: ItemId[] = [
  'branch',
  'log',
  'flint',
  'clay',
  'bone',
  'tusk',
  'leather',
  'obsidian',
  'quartz',
  'jade',
  'resin',
  'prime_pelt',
  'frost_pelt',
  'frost_shard',
  'ancient_fang',
  'soil',
  'fiber',
  'ochre',
  'cordage',
];

const ARCHITECTURE_PROMPTS = [
  '밤에 시야를 밝히고 적을 쏘는 높은 망루',
  '맹수의 돌진을 막아내는 견고한 가시 방책',
  '부족민과 펫을 쉬게 하고 치유하는 안식처',
  '자원을 넉넉하게 보관하는 대형 창고',
  '비바람과 폭풍우에 끄떡없는 영구 석조 성벽',
  '초음속 스텔스 전투기 격납고', // 가드레일 테스트
  '대륙간 전술 핵 미사일 발사대', // 가드레일 테스트
];

const ARMORY_PROMPTS = [
  '맹독을 바르고 빠르게 여러 번 찌르는 암살 단검',
  '멀리서 적의 급소를 꿰뚫는 정밀 저격활',
  '묵직한 중량으로 적을 내려쳐 기절시키는 충격 둔기',
  '나무와 광석을 캘 때 자원을 더 많이 주는 풍요의 도구',
  '맹수의 이빨과 돌진 피해를 감쇄하는 수호 방어구',
  '자동 소총 및 대포', // 가드레일 테스트
  '고출력 플라즈마 레이저포', // 가드레일 테스트
];

export default function IntentCraftingModal({
  open,
  onClose,
  initialMode = 'architecture',
  storage,
  backpack,
  village,
  baseLevel = 1,
  onConstructCustomBuilding,
  onCraftCustomGear,
}: Props) {
  const [mode, setMode] = useState<CraftingMode>(initialMode);
  const [archCategory, setArchCategory] = useState<'fence' | 'tower' | 'building'>('tower');
  const [gearCategory, setGearCategory] = useState<'melee' | 'ranged' | 'tool' | 'armor'>('ranged');

  // Up to 3 material slots: { itemId, count }
  const [slots, setSlots] = useState<{ itemId: ItemId; count: number }[]>([
    { itemId: 'branch', count: 3 },
    { itemId: 'flint', count: 2 },
  ]);

  const [intentInput, setIntentInput] = useState('');
  const [analysisResult, setAnalysisResult] = useState<IntentCraftResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const vState = useMemo(() => ensureVillageState(village, false), [village]);

  if (!open) return null;

  const currentCategory = mode === 'architecture' ? archCategory : gearCategory;

  const handleSlotChange = (index: number, itemId: ItemId) => {
    setSlots(prev => {
      const next = [...prev];
      next[index] = { ...next[index], itemId };
      return next;
    });
    setAnalysisResult(null);
  };

  const handleSlotCount = (index: number, delta: number) => {
    setSlots(prev => {
      const next = [...prev];
      const newCount = Math.max(1, Math.min(10, next[index].count + delta));
      next[index] = { ...next[index], count: newCount };
      return next;
    });
    setAnalysisResult(null);
  };

  const handleAddSlot = () => {
    if (slots.length >= 3) return;
    const unused = CRAFTING_MATERIAL_IDS.find(id => !slots.some(s => s.itemId === id)) ?? 'bone';
    setSlots(prev => [...prev, { itemId: unused, count: 1 }]);
    setAnalysisResult(null);
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 1) return;
    setSlots(prev => prev.filter((_, i) => i !== index));
    setAnalysisResult(null);
  };

  const getMaterialsRecord = (): Record<string, number> => {
    const res: Record<string, number> = {};
    for (const s of slots) {
      if (s.count > 0) {
        res[s.itemId] = (res[s.itemId] ?? 0) + s.count;
      }
    }
    return res;
  };

  const runAnalysis = () => {
    const materials = getMaterialsRecord();
    const hasAny = Object.values(materials).some(q => q > 0);
    if (!hasAny) {
      toast.warning('슬롯에 최소 1개 이상의 재료를 투입해 주세요');
      return;
    }

    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeCraftingIntent({
        mode: mode === 'architecture' ? 'building' : 'gear',
        subCategory: currentCategory,
        materials,
        userIntent: intentInput,
      });
      setAnalysisResult(result);
      setIsAnalyzing(false);
      if (result.isAnachronistic) {
        toast.info('⚠️ 시대적 한계가 감지되어 현실적 원시 물리 설계로 보정되었습니다.');
      } else {
        toast.success('🔬 물리 속성 및 의도 분석 완료!');
      }
    }, 250);
  };

  // Find empty 1x1 tile for architecture placement
  const findNextEmptyTile = (): { x: number; y: number } | null => {
    const gridSize = getVillageGridSize(vState.shamanLevel ?? 1);
    for (let r = 1; r < gridSize; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const x = 5 + dx;
          const y = 5 + dy;
          if (canPlaceVillageBuilding(vState, 'custom_intent_building', x, y, 3).ok) {
            return { x, y };
          }
        }
      }
    }
    return null;
  };

  const handleFinalCraft = () => {
    if (!analysisResult) return;
    const materials = getMaterialsRecord();
    const neededStacks: Stack[] = Object.entries(materials).map(([itemId, count]) => ({
      itemId: itemId as ItemId,
      count,
    }));

    if (!hasAll(owned, neededStacks)) {
      toast.error('투입에 필요한 재료가 부족합니다. 배낭이나 창고 수량을 확인해 주세요.');
      return;
    }

    if (mode === 'architecture') {
      const tile = findNextEmptyTile();
      if (!tile) {
        toast.warning('마을 내에 건물을 배치할 빈 공간이 없습니다.');
        return;
      }
      const ok = onConstructCustomBuilding({
        name: analysisResult.name,
        desc: analysisResult.desc,
        category: archCategory,
        mechanics: analysisResult.awardedMechanics as BuildingMechanicTag[],
        physics: analysisResult.physics,
        hp: analysisResult.hp ?? 500,
        materials,
        x: tile.x,
        y: tile.y,
      });
      if (ok) {
        onClose();
      }
    } else {
      const ok = onCraftCustomGear({
        name: analysisResult.name,
        desc: analysisResult.desc,
        category: gearCategory,
        mechanics: analysisResult.awardedMechanics as GearMechanicTag[],
        physics: analysisResult.physics,
        atk: analysisResult.atk,
        def: analysisResult.def,
        materials,
      });
      if (ok) {
        onClose();
      }
    }
  };

  // SVG Radar Polygon calculations
  const renderRadarPolygon = (physics: PhysicalAttributes) => {
    // 4 axes: Top(Durability), Right(Elasticity), Bottom(Density), Left(WeatherResist)
    // Scale 0 ~ 10 -> radius 0 ~ 65 (center 80, 80)
    const cx = 80;
    const cy = 80;
    const maxR = 60;
    const pD = Math.min(10, Math.max(0, physics.durability)) / 10;
    const pE = Math.min(10, Math.max(0, physics.elasticity)) / 10;
    const pM = Math.min(10, Math.max(0, physics.density)) / 10;
    const pW = Math.min(10, Math.max(0, physics.weatherResist)) / 10;

    const topX = cx;
    const topY = cy - pD * maxR;

    const rightX = cx + pE * maxR;
    const rightY = cy;

    const bottomX = cx;
    const bottomY = cy + pM * maxR;

    const leftX = cx - pW * maxR;
    const leftY = cy;

    const polyPoints = `${topX},${topY} ${rightX},${rightY} ${bottomX},${bottomY} ${leftX},${leftY}`;

    return (
      <svg viewBox="0 0 160 160" className="w-36 h-36 mx-auto drop-shadow-md">
        {/* Background Grids */}
        <polygon
          points={`${cx},${cy - maxR} ${cx + maxR},${cy} ${cx},${cy + maxR} ${cx - maxR},${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <polygon
          points={`${cx},${cy - maxR * 0.66} ${cx + maxR * 0.66},${cy} ${cx},${cy + maxR * 0.66} ${cx - maxR * 0.66},${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <polygon
          points={`${cx},${cy - maxR * 0.33} ${cx + maxR * 0.33},${cy} ${cx},${cy + maxR * 0.33} ${cx - maxR * 0.33},${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />

        {/* Axes */}
        <line x1={cx} y1={cy - maxR} x2={cx} y2={cy + maxR} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        <line x1={cx - maxR} y1={cy} x2={cx + maxR} y2={cy} stroke="rgba(255,255,255,0.18)" strokeWidth="1" />

        {/* Active Polygon */}
        <polygon
          points={polyPoints}
          fill="rgba(56, 189, 248, 0.3)"
          stroke="#38bdf8"
          strokeWidth="2"
          className="transition-all duration-300"
        />

        {/* Axis Vertex Dots */}
        <circle cx={topX} cy={topY} r="3" fill="#60a5fa" />
        <circle cx={rightX} cy={rightY} r="3" fill="#fbbf24" />
        <circle cx={bottomX} cy={bottomY} r="3" fill="#f87171" />
        <circle cx={leftX} cy={leftY} r="3" fill="#34d399" />

        {/* Labels */}
        <text x={cx} y={cy - maxR - 4} textAnchor="middle" fill="#93c5fd" fontSize="9" fontWeight="bold">
          내구성
        </text>
        <text x={cx + maxR + 4} y={cy + 3} textAnchor="start" fill="#fde047" fontSize="9" fontWeight="bold">
          탄성
        </text>
        <text x={cx} y={cy + maxR + 12} textAnchor="middle" fill="#fca5a5" fontSize="9" fontWeight="bold">
          밀도
        </text>
        <text x={cx - maxR - 4} y={cy + 3} textAnchor="end" fill="#6ee7b7" fontSize="9" fontWeight="bold">
          내후성
        </text>
      </svg>
    );
  };

  return (
    <div
      role="dialog"
      aria-label="유저 의도 기반 AI 건축 및 제련소"
      className="fixed inset-0 z-[1100] flex flex-col bg-background font-pixel text-xs"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/90 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-500/20 text-amber-400">
            <Sparkles className="h-4 w-4 animate-spin-slow" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>AI 의도 설계 공방</span>
              <span className="text-[10px] text-primary/80 font-normal">
                (재료 물리 분석 & 가드레일 매핑)
              </span>
            </h1>
            <p className="text-[10px] text-muted-foreground">
              원하는 용도를 자연어로 적으면 물리 속성을 분석해 실제 게임 메커닉을 부여합니다
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="닫기"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-2 border-b border-border bg-card/50">
        <button
          type="button"
          onClick={() => {
            setMode('architecture');
            setAnalysisResult(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${
            mode === 'architecture'
              ? 'border-b-2 border-amber-500 bg-amber-500/10 text-amber-400'
              : 'text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <Hammer className="h-4 w-4" />
          <span>건축공방 탭 (울타리 / 망루 / 건축물)</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('armory');
            setAnalysisResult(null);
          }}
          className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${
            mode === 'armory'
              ? 'border-b-2 border-orange-500 bg-orange-500/10 text-orange-400'
              : 'text-muted-foreground hover:bg-muted/40'
          }`}
        >
          <Swords className="h-4 w-4" />
          <span>무기/도구/방어구 제작소 탭</span>
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Category Picker */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="text-[11px] font-bold text-muted-foreground flex items-center justify-between">
            <span>제작 유형 카테고리 선택</span>
            <span className="text-[10px] text-amber-400/90 font-mono">STEP 1</span>
          </div>
          {mode === 'architecture' ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'fence', label: '울타리 / 방책', icon: '🛡️', desc: '적 이동 차단 및 성벽 방어' },
                { id: 'tower', label: '망루 / 감시탑', icon: '🏹', desc: '야간 시야 및 반경 원거리 요격' },
                { id: 'building', label: '특수 건축물', icon: '🏛️', desc: '안식처, 창고 및 회복 공간' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setArchCategory(cat.id as any);
                    setAnalysisResult(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-md border text-center transition-all ${
                    archCategory === cat.id
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/50'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className="text-xl mb-1">{cat.icon}</span>
                  <span className="font-bold text-xs">{cat.label}</span>
                  <span className="text-[10px] opacity-75 mt-0.5">{cat.desc}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'melee', label: '단거리 무기', icon: '🗡️', desc: '신속 연타 & 출혈' },
                { id: 'ranged', label: '원거리 무기', icon: '🎯', desc: '저격 & 맹독 사격' },
                { id: 'tool', label: '채집 도구', icon: '⛏️', desc: '풍요로운 추가 수확' },
                { id: 'armor', label: '수호 방어구', icon: '🛡️', desc: '피해 감쇄 & 충격 방어' },
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setGearCategory(cat.id as any);
                    setAnalysisResult(null);
                  }}
                  className={`flex flex-col items-center justify-center p-2 rounded-md border text-center transition-all ${
                    gearCategory === cat.id
                      ? 'border-orange-500 bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/50'
                      : 'border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className="text-xl mb-1">{cat.icon}</span>
                  <span className="font-bold text-xs">{cat.label}</span>
                  <span className="text-[10px] opacity-75 mt-0.5 leading-tight">{cat.desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Material Slots (1 ~ 3 slots) */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <span>투입 재료 슬롯 (1~3개)</span>
              <span className="text-[10px] text-muted-foreground/70">
                (투입한 재료의 탄성·내구도·내후성·밀도가 합산 계산됩니다)
              </span>
            </span>
            {slots.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSlot}
                className="pixel-btn h-6 gap-1 px-2 text-[10px]"
              >
                <Plus className="h-3 w-3" />
                <span>재료 슬롯 추가</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {slots.map((slot, idx) => {
              const def = ITEMS[slot.itemId];
              const ownedCount = countOf(owned, slot.itemId);
              const isShort = ownedCount < slot.count;

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-md border border-border/80 bg-background/60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-muted-foreground">슬롯 #{idx + 1}</span>
                      <span className={`text-[10px] font-mono ${isShort ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                        보유 {ownedCount}개
                      </span>
                    </div>
                    <select
                      value={slot.itemId}
                      onChange={e => handleSlotChange(idx, e.target.value as ItemId)}
                      className="w-full rounded bg-muted/60 border border-border px-2 py-1 text-xs text-foreground focus:outline-none"
                    >
                      {CRAFTING_MATERIAL_IDS.map(matId => {
                        const mDef = ITEMS[matId];
                        const have = countOf(owned, matId);
                        return (
                          <option key={matId} value={matId}>
                            {mDef ? `${mDef.name} (${have}개 보유)` : matId}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col items-center gap-1 shrink-0 pt-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSlotCount(idx, -1)}
                        className="pixel-btn h-6 w-6 p-0 flex items-center justify-center text-xs"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-bold font-mono text-xs text-primary">
                        {slot.count}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSlotCount(idx, 1)}
                        className="pixel-btn h-6 w-6 p-0 flex items-center justify-center text-xs"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {slots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(idx)}
                        className="text-[10px] text-destructive/80 hover:text-destructive flex items-center gap-0.5"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        <span>삭제</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intent Textarea & Presets */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="intent-text" className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
              <span>만들고자 하는 용도 및 기능 텍스트 입력</span>
              <span className="text-[10px] text-amber-400/90 font-mono">STEP 2</span>
            </label>
            <span className="text-[10px] text-muted-foreground/60">
              *비행기/총기 등 시대착오 입력 시 원시 물리 설계로 자동 보정
            </span>
          </div>

          <textarea
            id="intent-text"
            rows={2}
            value={intentInput}
            onChange={e => setIntentInput(e.target.value)}
            placeholder={
              mode === 'architecture'
                ? '예: 밤에 시야를 밝히고 적을 쏘는 높은 망루'
                : '예: 맹독을 바르고 빠르게 여러 번 찌르는 단검'
            }
            className="w-full rounded-md border border-border bg-background p-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {/* Quick Presets Chips */}
          <div className="flex flex-wrap gap-1.5 items-center pt-1">
            <span className="text-[10px] text-muted-foreground font-bold shrink-0">빠른 예시:</span>
            {(mode === 'architecture' ? ARCHITECTURE_PROMPTS : ARMORY_PROMPTS).map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIntentInput(prompt)}
                className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                  prompt.includes('전투기') || prompt.includes('핵') || prompt.includes('소총') || prompt.includes('레이저')
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    : 'border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="pt-2">
            <Button
              type="button"
              disabled={isAnalyzing}
              onClick={runAnalysis}
              className="pixel-btn w-full h-9 gap-1.5 bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>재료 물리 속성 및 의도 분석 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>
                    {mode === 'architecture'
                      ? '🔬 재료 물리 분석 및 맞춤 건축 설계도 도출'
                      : '⚡ 재료 물리 분석 및 맞춤 장비 제련안 도출'}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Analysis Result Card */}
        {analysisResult && (
          <div className="rounded-lg border-2 border-primary/40 bg-card p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{mode === 'architecture' ? '🏛️' : '⚔️'}</span>
                <div>
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <span>{analysisResult.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40">
                      {analysisResult.statsLabel}
                    </span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground">{analysisResult.desc}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-muted-foreground block">종합 강도</span>
                <span className="font-mono font-bold text-base text-amber-400">
                  ★ {analysisResult.powerScore}
                </span>
              </div>
            </div>

            {/* Anachronism Guardrail Alert */}
            {analysisResult.isAnachronistic && analysisResult.anachronismExplanation && (
              <div className="rounded-md border border-amber-500/50 bg-amber-500/10 p-2.5 flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-300 text-xs block">
                    시대적 한계 극복 — 원시 물리 자동 보정
                  </span>
                  <p className="text-[10px] text-amber-200/90 leading-relaxed">
                    {analysisResult.anachronismExplanation}
                  </p>
                </div>
              </div>
            )}

            {/* Physics Radar & 4 Gauges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-muted/20 p-3 rounded-lg border border-border/60">
              <div>
                <span className="text-[10px] font-bold text-muted-foreground block text-center mb-1">
                  4대 물리 속성 매트릭스 레이더
                </span>
                {renderRadarPolygon(analysisResult.physics)}
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-0.5">
                    <span className="text-blue-400">🛡️ 내구성 (Durability)</span>
                    <span className="font-mono">{analysisResult.physics.durability} / 10.0</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${analysisResult.physics.durability * 10}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-0.5">
                    <span className="text-yellow-400">🏹 탄성 / 반발력 (Elasticity)</span>
                    <span className="font-mono">{analysisResult.physics.elasticity} / 10.0</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 transition-all duration-500"
                      style={{ width: `${analysisResult.physics.elasticity * 10}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-0.5">
                    <span className="text-emerald-400">🌧️ 내후 / 부식성 (Weather Resist)</span>
                    <span className="font-mono">{analysisResult.physics.weatherResist} / 10.0</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${analysisResult.physics.weatherResist * 10}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-bold mb-0.5">
                    <span className="text-rose-400">🪨 밀도 / 질량 (Density)</span>
                    <span className="font-mono">{analysisResult.physics.density} / 10.0</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${analysisResult.physics.density * 10}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Awarded Mechanics Cards (Strictly 1~2 tags from allowed pool) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                <span>부여된 특수 작동 메커닉 (최대 1~2개 가드레일 매핑)</span>
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {analysisResult.awardedMechanics.map(tag => {
                  const meta =
                    mode === 'architecture'
                      ? BUILDING_MECHANICS_META[tag as BuildingMechanicTag]
                      : GEAR_MECHANICS_META[tag as GearMechanicTag];
                  if (!meta) return null;

                  return (
                    <div
                      key={tag}
                      className={`p-2.5 rounded-md border flex items-start gap-2 ${meta.badgeClass}`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{meta.icon}</span>
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{meta.name}</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-background/50 border border-current">
                            {tag}
                          </span>
                        </div>
                        <p className="text-[10px] opacity-90 leading-tight">{meta.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Real Game Engine Specs Box */}
            {mode === 'architecture' && analysisResult.buildingSpecs && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-2.5 space-y-1.5 text-xs">
                <span className="font-bold text-primary flex items-center gap-1.5 text-[11px]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>실제 적용 게임 기능 태그 (Game Engine Specs)</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-[11px] font-mono">
                  <div className="flex items-center justify-between p-1 rounded bg-background/60 border border-primary/20">
                    <span className="text-muted-foreground">night_vision_radius:</span>
                    <span className="text-sky-400 font-bold">+{analysisResult.buildingSpecs.night_vision_radius}m (야간 시야)</span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded bg-background/60 border border-primary/20">
                    <span className="text-muted-foreground">auto_turret_range:</span>
                    <span className="text-red-400 font-bold">{analysisResult.buildingSpecs.auto_turret_range}m, atk: {analysisResult.buildingSpecs.auto_turret_atk}</span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded bg-background/60 border border-primary/20">
                    <span className="text-muted-foreground">durability:</span>
                    <span className="text-amber-400 font-bold">{analysisResult.buildingSpecs.durability}</span>
                  </div>
                  <div className="flex items-center justify-between p-1 rounded bg-background/60 border border-primary/20">
                    <span className="text-muted-foreground">corrosion_resist:</span>
                    <span className="text-emerald-400 font-bold">{analysisResult.buildingSpecs.corrosion_resist}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Final Action Button */}
            <div className="pt-2">
              <Button
                type="button"
                onClick={handleFinalCraft}
                className="pixel-btn w-full h-10 gap-2 bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 shadow-md"
              >
                <Check className="h-4 w-4" />
                <span>
                  {mode === 'architecture'
                    ? '🌿 마을 그리드에 즉시 배치하기 (자재 투입 & 완공)'
                    : '⚔️ 맞춤 장비 제련 완료 & 인벤토리 수령 (자재 소진)'}
                </span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
