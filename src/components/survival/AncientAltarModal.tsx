import { useMemo, useState } from 'react';
import { BookOpen, Flame, Sparkles, X, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ITEMS, gearEffect, type ItemId } from '@/lib/survival/items';
import {
  MATERIAL_PHYSICS,
  MATERIAL_TIER,
  MAX_SLOTS,
  physicsSignal,
  type InventionCategory,
  type InventionInput,
} from '@/lib/survival/invention';
import { fallbackInventionName, type InventedItem } from '@/lib/survival/inventedItems';
import { BLUEPRINTS, matchBlueprint } from '@/lib/survival/blueprints';
import { addStacks } from '@/lib/survival/inventory';
import type { Stack } from '@/lib/survival/types';
import altarImg from '@/assets/survival/dolmen-shrine.png';

const CATS: { id: InventionCategory; label: string; effect: string }[] = [
  { id: 'relic', label: '🔮 특수 유물·부적', effect: '신성 보너스' },
  { id: 'weapon', label: '⚔️ 신성 무기', effect: '공격력' },
  { id: 'building', label: '🛡️ 고대 방어구', effect: '방어력' },
  { id: 'tool', label: '⛏️ 성소 도구', effect: '채집 효율' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  storage: Stack[];
  backpack: Stack[];
  inventions: InventedItem[];
  onDiscover: (
    input: InventionInput,
    naming: { name: string; desc: string; masterwork?: boolean; ranged?: boolean }
  ) => InventedItem | null;
}

export default function AncientAltarModal({
  open,
  onClose,
  storage,
  backpack,
  inventions,
  onDiscover,
}: Props) {
  const [tab, setTab] = useState<'altar' | 'codex'>('altar');
  const [cat, setCat] = useState<InventionCategory>('relic');
  const [mats, setMats] = useState<Record<string, number>>({});
  const [heat, setHeat] = useState(true);
  const [sacred, setSacred] = useState(true);

  const owned = useMemo(() => addStacks(storage, backpack), [storage, backpack]);
  const have = (id: string) =>
    owned.filter(s => s.itemId === id).reduce((n, s) => n + s.count, 0);

  const input: InventionInput = { category: cat, materials: mats, heat, sacred };
  const signal = useMemo(() => physicsSignal(input, true), [cat, mats, heat, sacred]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const selectedKeys = Object.keys(mats).filter(k => mats[k] > 0);
  const slotCount = selectedKeys.length;
  const validSlotCount = slotCount >= 2 && slotCount <= MAX_SLOTS;
  const usableMats = Object.keys(MATERIAL_PHYSICS).filter(id => have(id) > 0);

  const stepMat = (id: string, delta: number) => {
    setMats(prev => {
      const curKeys = Object.keys(prev).filter(k => prev[k] > 0);
      if (delta > 0 && !prev[id] && curKeys.length >= MAX_SLOTS) return prev;
      const nextCount = Math.max(0, Math.min(have(id), 20, (prev[id] ?? 0) + delta));
      const next = { ...prev, [id]: nextCount };
      if (!nextCount) delete next[id];
      return next;
    });
  };

  const handleCombine = () => {
    if (!signal.result.ok || !validSlotCount) return;
    const bp = matchBlueprint(cat, mats);
    const naming = bp
      ? {
          name: bp.name,
          desc: bp.desc,
          ranged: bp.ranged,
          masterwork: signal.kind === 'sacred',
        }
      : {
          name: fallbackInventionName(cat, mats),
          desc: '고대 제단의 신성한 홈에서 공명하여 탄생한 유물.',
          masterwork: signal.kind === 'sacred',
        };
    const made = onDiscover(input, naming);
    if (made) setMats({});
  };

  return (
    <div
      role="dialog"
      aria-label="고대 제단"
      className="fixed inset-0 z-50 flex flex-col bg-background font-pixel text-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-foreground bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <img src={altarImg} alt="" className="pixelated h-7 w-7 object-contain" />
          <div>
            <b className="text-sm">🔮 고대 제단 · 유물 조합 & 발견 도감</b>
            <p className="text-[10px] text-muted-foreground">
              미지의 재료 2~4종을 제단 홈에 올려 새로운 유물과 장비를 발견하세요
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="고대 제단 닫기"
          onClick={onClose}
          className="pixel-btn flex items-center justify-center bg-card py-1.5 px-2.5 text-xs"
        >
          <X className="!h-4 !w-4" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div role="tablist" className="grid grid-cols-2 gap-1 border-b border-border bg-background px-3 py-1.5">
        <Button
          type="button"
          role="tab"
          aria-selected={tab === 'altar'}
          size="sm"
          variant={tab === 'altar' ? 'default' : 'outline'}
          onClick={() => setTab('altar')}
          className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs"
        >
          <Sparkles className="!h-4 !w-4" />
          제단 홈 조합 (2~4종)
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={tab === 'codex'}
          size="sm"
          variant={tab === 'codex' ? 'default' : 'outline'}
          onClick={() => setTab('codex')}
          className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs"
        >
          <BookOpen className="!h-4 !w-4" />
          유물·레시피 도감 ({inventions.length}/{BLUEPRINTS.length + inventions.length})
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {tab === 'altar' ? (
          <>
            {/* Category Selector */}
            <div className="grid grid-cols-2 gap-1.5">
              {CATS.map(c => (
                <Button
                  key={c.id}
                  type="button"
                  size="sm"
                  variant={cat === c.id ? 'default' : 'outline'}
                  onClick={() => setCat(c.id)}
                  className="pixel-btn h-auto min-h-0 py-1.5 px-2.5 text-xs"
                >
                  {c.label}
                </Button>
              ))}
            </div>

            {/* 4 Sacred Grooves (제단 홈 1~4) */}
            <div className="pixel-frame space-y-2 bg-card p-2.5">
              <div className="flex items-center justify-between">
                <b>고대 제단 4대 공명 홈 (현재 {slotCount}/4종 투입)</b>
                <span className={validSlotCount ? 'font-bold text-primary' : 'text-destructive'}>
                  {validSlotCount ? '조합 가능 (2~4종 충족)' : '재료 2~4종을 홈에 올려주세요'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: MAX_SLOTS }, (_, i) => {
                  const key = selectedKeys[i];
                  return (
                    <div
                      key={i}
                      data-altar-slot={i + 1}
                      className={`pixel-box flex h-16 flex-col items-center justify-center p-1 text-center ${
                        key ? 'border-primary bg-primary/15 font-bold' : 'bg-background text-muted-foreground'
                      }`}
                    >
                      <span className="text-[10px]">제단 홈 {i + 1}</span>
                      {key ? (
                        <>
                          <span className="truncate text-xs">
                            {ITEMS[key as ItemId]?.name ?? key}
                          </span>
                          <span className="text-[11px] text-primary">×{mats[key]}</span>
                        </>
                      ) : (
                        <span className="text-[10px]">비어 있음</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Heat & Sacred Switches */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-2">
                <label className="flex items-center gap-1.5">
                  <Flame className="!h-4 !w-4 text-amber-500" />
                  <span>태고의 화염 가열</span>
                  <Switch checked={heat} onCheckedChange={setHeat} />
                </label>
                <label className="flex items-center gap-1.5">
                  <Zap className="!h-4 !w-4 text-sky-400" />
                  <span>신성력 공명</span>
                  <Switch checked={sacred} onCheckedChange={setSacred} />
                </label>
              </div>
            </div>

            {/* Material Picker */}
            <div className="pixel-frame space-y-1.5 bg-card p-2.5">
              <b>투입할 미지의 재료 선택</b>
              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                {usableMats.map(id => {
                  const itemName = ITEMS[id as ItemId]?.name ?? id;
                  const cur = mats[id] ?? 0;
                  return (
                    <div
                      key={id}
                      className="pixel-box flex items-center justify-between bg-background px-2 py-1"
                    >
                      <span>
                        <b className="mr-1 rounded bg-primary/15 px-1 text-[10px] text-primary">
                          T{MATERIAL_TIER[id] ?? 1}
                        </b>
                        {itemName}{' '}
                        <span className="text-[10px] text-muted-foreground">
                          (보유 {have(id)})
                        </span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`${itemName} 빼기`}
                          disabled={cur <= 0}
                          onClick={() => stepMat(id, -1)}
                          className="h-6 w-6 p-0 text-xs"
                        >
                          -
                        </Button>
                        <b className="w-5 text-center">{cur}</b>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`${itemName} 올리기`}
                          disabled={(slotCount >= MAX_SLOTS && !cur) || cur >= have(id)}
                          onClick={() => stepMat(id, 1)}
                          className="h-6 w-6 p-0 text-xs"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Physics Resonance Signal */}
            <div className={`pixel-frame space-y-1 bg-card p-2.5 signal-${signal.kind}`} role="status">
              <b className="flex items-center gap-1.5 text-sm">
                <Flame className="!h-4 !w-4" />
                {signal.kind === 'smoke'
                  ? '회색 연기 · 물성이 맞지 않음'
                  : signal.kind === 'sacred'
                    ? '푸른 신성 불꽃 · 고효율 유물 공명!'
                    : '주황 불꽃 · 조합 가능'}
              </b>
              <p className="whitespace-pre-line text-[11px] leading-relaxed">{signal.advice}</p>
              <p className="text-[10px] text-muted-foreground">
                경도 {signal.hardness} · 탄성 {signal.elasticity} · 예리함 {signal.sharpness} · 가연성 {signal.flammability}
              </p>
              {signal.result.ok && validSlotCount && (
                <p className="font-bold text-primary">
                  예상 발견물: {matchBlueprint(cat, mats)?.name ?? fallbackInventionName(cat, mats)}
                </p>
              )}
            </div>

            <Button
              type="button"
              disabled={!signal.result.ok || !validSlotCount}
              onClick={handleCombine}
              className="pixel-btn h-auto min-h-0 w-full gap-1.5 py-2 px-3 text-xs font-bold"
            >
              <Sparkles className="!h-4 !w-4" />
              제단 의식 거행 · 유물 발견하기
            </Button>
          </>
        ) : (
          /* CODEX TAB: 발견한 유물 & 고대 청사진 도감 */
          <div className="space-y-3">
            <div className="pixel-frame space-y-2 bg-card p-2.5">
              <b className="text-sm">📜 고대 제단 청사진 도감 ({BLUEPRINTS.length}종)</b>
              <div className="space-y-1.5">
                {BLUEPRINTS.map(bp => {
                  const discovered = inventions.some(inv => inv.name === bp.name);
                  const matStr = Object.entries(bp.materials)
                    .map(([id, q]) => `${ITEMS[id as ItemId]?.name ?? id} ${q}`)
                    .join(' + ');
                  return (
                    <div
                      key={bp.name}
                      className={`pixel-box flex items-center justify-between gap-2 p-2 ${
                        discovered ? 'border-primary bg-primary/10' : 'bg-background'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <b>{bp.name}</b>
                          <span className="rounded bg-muted px-1 text-[10px]">{bp.group}</span>
                          {discovered && (
                            <span className="rounded bg-primary px-1 text-[9px] text-primary-foreground">
                              발견 완료
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{bp.desc}</p>
                        <p className="text-[10px] font-bold text-primary">조합식: {matStr}</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCat(bp.category);
                          setMats(bp.materials);
                          setTab('altar');
                        }}
                        className="pixel-btn h-auto min-h-0 shrink-0 py-1 px-2 text-xs"
                      >
                        홈에 올리기
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pixel-frame space-y-2 bg-card p-2.5">
              <b className="text-sm">✨ 내가 발견한 발명품·유물 도감 ({inventions.length}종)</b>
              {!inventions.length ? (
                <p className="py-3 text-center text-muted-foreground">
                  아직 발견한 유물이 없습니다. 제단 홈에 재료를 올려 조합해 보세요!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {inventions.map(inv => (
                    <div key={inv.id} className="pixel-box bg-background p-2">
                      <div className="flex items-center justify-between">
                        <b>
                          {inv.masterwork ? '[명품] ' : ''}
                          {inv.name}
                        </b>
                        {gearEffect(ITEMS[inv.id as ItemId]) && (
                          <span className="font-bold text-primary">
                            {gearEffect(ITEMS[inv.id as ItemId])}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{inv.desc}</p>
                      <p className="text-[10px] text-muted-foreground">
                        레시피:{' '}
                        {Object.entries(inv.materials)
                          .map(([id, q]) => `${ITEMS[id as ItemId]?.name ?? id} ${q}`)
                          .join(' + ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
