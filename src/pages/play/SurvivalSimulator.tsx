// @refresh reset
// Custom GPS/world hook changes must remount this screen instead of reusing stale hook queues.
import { useEffect, useRef, useState } from 'react';
import SpriteAnimator from '@/components/survival/SpriteAnimator';
import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Backpack, Flame, Lightbulb, LocateFixed, X, Lock, RotateCcw, Route, ListChecks } from 'lucide-react';
import { useSurvivalGps } from '@/hooks/useSurvivalGps';
import { Button } from '@/components/ui/button';
import SurvivalPlanner from '@/components/survival/SurvivalPlanner';
import SurvivalObjectives from '@/components/survival/SurvivalObjectives';
import type { PlannerInput } from '@/lib/survival/plannerInput';
import { toast } from 'sonner';
import TerrainMap from '@/components/survival/TerrainMap';
import { useSurvivalWorld } from '@/hooks/useSurvivalWorld';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import { nodeDef, creatureDef } from '@/lib/survival/entities';
import { SPRITE_META, type SpriteKey } from '@/lib/survival/spriteMeta';
import { BASE_LEVELS, CAMP_COST } from '@/lib/survival/bases';
import { SURVIVAL_CONFIG as C } from '@/lib/survival/config';
import { distanceM } from '@/lib/survival/geo';
import { TECHS, isRecipeUnlocked, prerequisitesMet, techForRecipe } from '@/lib/survival/tech';
import { countOf } from '@/lib/survival/inventory';
import type { LatLng, Stack, WorldEntity } from '@/lib/survival/types';

const START: LatLng = { lat: 37.748, lng: 126.7496 };
const spriteUrls = import.meta.glob('../../assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const url = (k: SpriteKey) => spriteUrls[`../../assets/survival/${k}.png`];

function Sprite({ k, scale = 1, className = '' }: { k: SpriteKey; scale?: number; className?: string }) {
  const m = SPRITE_META[k];
  return <img src={url(k)} width={m.w * scale} height={m.h * scale} alt="" draggable={false} className={`pixelated select-none ${className}`} />;
}

function Stacks({ stacks, onUse, have }: { stacks: Stack[]; onUse?: (id: ItemId) => void; have?: Stack[] }) {
  if (!stacks.length) return <p className="text-sm text-muted-foreground">비어 있음</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {stacks.map((s) => {
        const it = ITEMS[s.itemId];
        const short = have && countOf(have, s.itemId) < s.count;
        const usable = onUse && (it.food || it.heal);
        return (
          <button key={s.itemId} type="button" disabled={!usable} onClick={() => usable && onUse(s.itemId)}
            className={`pixel-frame flex min-h-11 items-center gap-1 bg-card px-1.5 py-1 text-xs ${short ? 'text-destructive' : ''} ${usable ? 'active:translate-y-0.5' : ''}`}>
            <Sprite k={it.sprite} scale={0.75} />
            <span>{it.name}</span><b>×{s.count}</b>
          </button>
        );
      })}
    </div>
  );
}

type Panel = 'none' | 'bag' | 'base' | 'tech' | 'quests';

export default function SurvivalSimulator({ realGps = false }: { realGps?: boolean }) {
  const navigate = useNavigate();
  const [gpsReady, setGpsReady] = useState(false);
  const g = useSurvivalWorld(START, { enabled: !realGps || gpsReady, saveKey: realGps ? 'survival-gps-world-v1' : 'survival-world-v1' });
  const gps = useSurvivalGps(realGps, g.moveTo);
  useEffect(() => setGpsReady(gps.ready), [gps.ready]);
  const { state: s } = g;
  const [panel, setPanel] = useState<Panel>('none');
  const [plannerOpen, setPlannerOpen] = useState(false);
  const nearbyResources: PlannerInput['nearbyResources'] = [];
  for (const entity of g.entities) {
    if (entity.kind !== 'node') continue;
    const existing = nearbyResources.find(r => r.type === entity.type);
    const distance = Math.round(distanceM(s.pos, entity));
    if (existing) { existing.count += 1; existing.distanceM = Math.min(existing.distanceM, distance); }
    else nearbyResources.push({ type: entity.type, distanceM: distance, count: 1 });
  }
  const plannerSnapshot: PlannerInput = { health: s.hp, hunger: s.hunger, inventory: s.backpack, storage: s.storage, gear: s.gear.map(x => x.itemId), learnedSkills: s.techs, nearbyResources, gathered: s.gathered, baseLevel: s.base?.level ?? 0, inBase: g.inBase, isNight: g.isNight, goal: '' };

  const onTap = (p: LatLng) => {
    if (realGps) return;
    const d = distanceM(s.pos, p);
    if (d > g.vision * 1.2) { toast('안개 속으로는 한 걸음씩 나아가세요'); return; }
    g.moveTo(p);
  };

  const tapEntity = (e: WorldEntity) => {
    if (realGps && !gps.ready) { toast.warning('정확한 GPS 신호를 기다려 주세요.'); return; }
    if (!realGps && distanceM(s.pos, e) > C.interactRadiusM) { g.moveTo({ lat: e.lat, lng: e.lng }); return; }
    playAction(e.kind === 'creature' ? 'attack' : 'gather', 900);
    g.interact(e);
  };

  const { data: anims } = useSpriteAnimations('hunter');
  const [action, setAction] = useState<SpriteAction>('idle');
  const actionTimer = useRef<number>();
  const playAction = (a: SpriteAction, ms: number) => {
    setAction(a); window.clearTimeout(actionTimer.current);
    actionTimer.current = window.setTimeout(() => setAction('idle'), ms);
  };
  const lastPos = useRef(s.pos);
  useEffect(() => {
    if (lastPos.current.lat !== s.pos.lat || lastPos.current.lng !== s.pos.lng) { lastPos.current = s.pos; setAction(a => (a === 'idle' ? 'walk' : a)); window.clearTimeout(actionTimer.current); actionTimer.current = window.setTimeout(() => setAction('idle'), 1500); }
  }, [s.pos]);
  useEffect(() => () => window.clearTimeout(actionTimer.current), []);
  const activeAnim = anims?.[action] ?? anims?.idle;

  const hpPct = (s.hp / C.baseMaxHp) * 100;

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden font-pixel">
      {(!realGps || gps.fix) && <TerrainMap center={s.pos} visionM={g.vision} explored={s.explored} onTap={onTap}>
        {(project, mpp) => (
          <>
            {s.base && g.baseDef && (() => {
              const p = project(s.base); const r = g.baseDef.radiusM / mpp;
              return (
                <div className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                  <div className="rounded-full border-2 border-dashed border-primary/70 bg-primary/10" style={{ width: r * 2, height: r * 2 }} />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"><Sprite k={g.baseDef.sprite} /></div>
                </div>
              );
            })()}
            {g.entities.map((e) => {
              const p = project(e);
              const sprite = e.kind === 'node' ? nodeDef(e.type).sprite : creatureDef(e.type).sprite;
              const name = e.kind === 'node' ? nodeDef(e.type).name : creatureDef(e.type).name;
              const dmg = s.damage[e.id];
              return (
                <button key={e.id} type="button" aria-label={name} onClick={(ev) => { ev.stopPropagation(); tapEntity(e); }}
                  data-resource-id={e.id} data-lat={e.lat} data-lng={e.lng}
                  className="pointer-events-auto absolute flex min-h-11 min-w-11 flex-col items-center"
                  style={{ left: p.x, top: p.y, transform: 'translate(-50%,-100%)' }}>
                  <motion.div animate={{ y: e.kind === 'creature' ? [0, -3, 0] : 0 }} transition={{ repeat: Infinity, duration: 0.8 }}>
                    <Sprite k={sprite} />
                  </motion.div>
                  {dmg ? <span className="rounded bg-background/80 px-1 text-[10px]">타격 중</span> : null}
                </button>
              );
            })}
            {(() => {
              const p = project(s.pos); const r = C.interactRadiusM / mpp;
              return (
                <div className="absolute" style={{ left: p.x, top: p.y, transform: 'translate(-50%,-50%)' }}>
                  <div className="rounded-full border border-primary/60" style={{ width: r * 2, height: r * 2 }} />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[85%]">{activeAnim ? <SpriteAnimator url={activeAnim.url} frames={activeAnim.frame_count} fps={activeAnim.fps} height={SPRITE_META['char-hunter'].h} /> : <Sprite k="char-hunter" />}</div>
                </div>
              );
            })()}
          </>
        )}
      </TerrainMap>}
      {realGps && !gps.fix && <div className="absolute inset-0 flex items-center justify-center bg-muted px-6 text-center text-sm">{gps.error ?? '현재 GPS 위치를 확인하고 있습니다…'}</div>}

      {/* Top HUD */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-background/80 px-2 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <button type="button" aria-label="뒤로" onClick={() => navigate('/play')} className="pixel-btn flex h-11 w-11 items-center justify-center bg-card"><ArrowLeft className="!h-6 !w-6" /></button>
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex items-center gap-1">체력<div className="h-2.5 flex-1 border border-foreground bg-muted"><div className="h-full bg-destructive" style={{ width: `${hpPct}%` }} /></div>{s.hp}</div>
          <div className="flex items-center gap-1">허기<div className="h-2.5 flex-1 border border-foreground bg-muted"><div className="h-full bg-primary" style={{ width: `${s.hunger}%` }} /></div>{s.hunger}</div>
        </div>
        <div className="text-right text-[11px] leading-tight">
          <div>{g.isNight ? '밤' : '낮'} · 시야 {g.vision}m</div>
          <div>배낭 {g.weight}/{g.capacity}kg</div>
          <div aria-label="성장 진행도">Lv.{s.level} · XP {s.xp}/{g.nextLevelXp}</div>
        </div>
      </div>

      {realGps && <div className="absolute left-2 right-2 top-[calc(4.5rem+env(safe-area-inset-top))] z-20 flex items-center justify-between gap-2 bg-background/90 px-2 py-1 text-[11px]">
        <span className="min-w-0 break-words" role="status">{gps.error ?? (gps.fix ? `${s.pos.lat.toFixed(5)}, ${s.pos.lng.toFixed(5)} · ±${Math.round(gps.fix.accuracy)}m` : 'GPS 연결 중')}</span>
        {!gps.ready && <Button variant="outline" className="min-h-11 shrink-0" onClick={gps.retry}>재시도</Button>}
      </div>}

      {/* Right action stack */}
      <div className="absolute bottom-40 right-2 top-32 z-20 flex flex-col gap-2 overflow-y-auto overscroll-contain pb-2 pr-1">
        {[
          { id: 'bag' as Panel, icon: Backpack, label: '배낭' },
          { id: 'base' as Panel, icon: Flame, label: '거점' },
          { id: 'tech' as Panel, icon: Lightbulb, label: '기술' },
          { id: 'quests' as Panel, icon: ListChecks, label: '생존 목표' },
        ].map((b) => (
          <Button key={b.id} type="button" variant="outline" onClick={() => setPanel(b.id)} className="pixel-btn flex h-16 min-h-16 w-16 shrink-0 flex-col items-center justify-center gap-0 bg-card px-0 text-xs">
            <b.icon className="!h-7 !w-7" />{b.label}
          </Button>
        ))}
        {realGps && <Button type="button" variant="outline" onClick={gps.retry} className="pixel-btn h-16 min-h-16 w-16 flex-col gap-0 bg-card px-0 text-xs"><LocateFixed className="!h-7 !w-7" />GPS 갱신</Button>}
        <Button type="button" variant="outline" className="pixel-btn h-16 min-h-16 w-16 shrink-0 flex-col gap-0 bg-card px-0 text-xs" onClick={() => setPlannerOpen(true)}><Route className="!h-7 !w-7" />생존 계획</Button>
      </div>

      {!s.base && (
        <div className="absolute inset-x-3 bottom-[max(1rem,env(safe-area-inset-bottom))] z-20 pixel-frame bg-card p-3 text-sm">
          나뭇가지 {countOf(s.backpack, 'branch')}/{CAMP_COST[0].count}개를 모아 모닥불 거점을 세우세요.
          <Button type="button" disabled={realGps && !gps.ready} onClick={g.placeBase} className="pixel-btn mt-2 h-11 w-full">여기에 모닥불 세우기</Button>
        </div>
      )}

      {s.base && <Button variant="outline" onClick={() => setPanel('quests')} className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 right-3 z-20 h-auto min-h-11 justify-between gap-2 whitespace-normal bg-card px-3 py-3 text-left text-xs">
        <span className="min-w-0">{g.quest?.title ?? '모든 생존 목표 완료'}</span>
        <span className="shrink-0 text-primary">{g.canClaimQuest ? '보상 받기' : g.questProgress ? `${g.questProgress.cur}/${g.questProgress.max}` : '완료'}</span>
      </Button>}

      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            className="absolute inset-x-0 bottom-0 z-30 flex max-h-[75dvh] flex-col border-t-4 border-foreground bg-background">
            <div className="flex items-center justify-between border-b-2 border-foreground px-3 py-2">
              <b className="text-lg">{panel === 'bag' ? '배낭' : panel === 'base' ? (g.baseDef?.name ?? '거점') : panel === 'quests' ? '생존 목표' : '제작 기술'}</b>
              <button type="button" aria-label="닫기" onClick={() => setPanel('none')} className="flex h-11 w-11 items-center justify-center"><X className="!h-7 !w-7" /></button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {panel === 'quests' && <SurvivalObjectives state={{ ...s, storedGear: [], stats: { gathered: s.gathered, crafted: s.crafted, kills: s.kills, deposits: s.deposits } }} canClaim={g.inBase && (!realGps || gps.ready)} onClaim={g.claimQuest} />}
              {panel === 'bag' && (
                <>
                  <p className="text-xs text-muted-foreground">음식은 눌러서 먹을 수 있어요.</p>
                  <Stacks stacks={s.backpack} onUse={g.eat} />
                  <div>
                    <b className="text-sm">장비</b>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {s.gear.length ? s.gear.map((x) => (
                        <div key={x.uid} className="pixel-frame flex items-center gap-1 bg-card px-1.5 py-1 text-xs"><Sprite k={ITEMS[x.itemId].sprite} scale={0.75} />{ITEMS[x.itemId].name}</div>
                      )) : <p className="text-sm text-muted-foreground">맨손입니다. 기술을 깨우쳐 도구를 만드세요.</p>}
                    </div>
                  </div>
                  <button type="button" onClick={() => { if (confirm('처음부터 다시 시작할까요?')) g.reset(); }} className="flex min-h-11 items-center gap-1 text-xs text-muted-foreground"><RotateCcw className="!h-4 !w-4" />처음부터 다시</button>
                </>
              )}

              {panel === 'base' && (!s.base ? <p className="text-sm">아직 거점이 없습니다.</p> : (
                <>
                  {!g.inBase && <p className="pixel-frame bg-accent p-2 text-sm">거점 반경 안에서만 제작·연구할 수 있어요.</p>}
                  <div><b className="text-sm">창고</b><div className="mt-1"><Stacks stacks={s.storage} onUse={g.eat} /></div></div>
                  <div>
                    <b className="text-sm">제작</b>
                    <div className="mt-1 space-y-2">
                      {g.recipes.map((r) => {
                        const known = isRecipeUnlocked(r, s.techs);
                        const it = ITEMS[r.result];
                        if (!known) return (
                          <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground"><Lock className="!h-4 !w-4" />??? — 「{techForRecipe(r.id)?.name}」 기술 필요</div>
                        );
                        const ok = g.inBase && (s.base?.level ?? 0) >= r.baseLevel && g.canAfford(r.ingredients);
                        return (
                          <div key={r.id} className="pixel-frame flex items-center gap-2 bg-card p-2">
                            <Sprite k={it.sprite} />
                            <div className="flex-1 text-xs"><b className="text-sm">{it.name}</b>{r.baseLevel > 1 && ` (거점 ${r.baseLevel}단계)`}<div className="mt-1"><Stacks stacks={r.ingredients} have={s.storage} /></div></div>
                            <button type="button" disabled={!ok} onClick={() => g.craft(r)} className="pixel-btn h-11 bg-primary px-3 text-primary-foreground disabled:opacity-40">제작</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {s.base.level < 3 && (() => {
                    const nx = BASE_LEVELS[(s.base.level + 1) as 2 | 3];
                    return (
                      <div className="pixel-frame bg-card p-2 text-xs">
                        <b className="text-sm">{nx.name}(으)로 발전</b> — {nx.unlocks}
                        <div className="my-1"><Stacks stacks={nx.cost} have={s.storage} /></div>
                        <button type="button" disabled={!g.inBase || !g.canAfford(nx.cost)} onClick={g.upgradeBase} className="pixel-btn h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">발전시키기</button>
                      </div>
                    );
                  })()}
                  <button type="button" onClick={g.placeBase} className="min-h-11 text-xs text-muted-foreground underline">현재 위치로 거점 옮기기 (나뭇가지 3)</button>
                </>
              ))}

              {panel === 'tech' && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">처음엔 아무것도 만들 줄 모릅니다. 자원을 모으면 깨달음을 얻고, 일부 기술은 거점에서 재료를 바쳐 연구해야 합니다.</p>
                  {TECHS.map((t) => {
                    const known = s.techs.includes(t.id);
                    const ready = prerequisitesMet(t, s.techs);
                    return (
                      <div key={t.id} className={`pixel-frame p-2 text-xs ${known ? 'bg-primary/15' : 'bg-card'} ${!ready && !known ? 'opacity-50' : ''}`}>
                        <div className="flex items-center gap-1"><b className="text-sm">{t.name}</b>{known ? <span className="ml-auto text-primary">습득</span> : <Lock className="ml-auto !h-4 !w-4" />}</div>
                        <p>{t.desc}</p>
                        {t.requires.length > 0 && <p className="text-muted-foreground">선행: {t.requires.map((r) => TECHS.find((x) => x.id === r)?.name).join(', ')}</p>}
                        <p>제작법: {t.recipes.map(id => { const r = g.recipes.find(x => x.id === id); return r ? ITEMS[r.result].name : ''; }).join(', ')}</p>
                        {!known && t.inspire && <p className="mt-1">깨달음: {ITEMS[t.inspire.itemId].name} {Math.min(s.gathered[t.inspire.itemId] ?? 0, t.inspire.count)}/{t.inspire.count}개 채집</p>}
                        {!known && t.research && (
                          <div className="mt-1">
                            <Stacks stacks={t.research} have={s.storage} />
                            <button type="button" disabled={!ready || !g.inBase || !g.canAfford(t.research)} onClick={() => g.research(t.id)} className="pixel-btn mt-1 h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">거점에서 연구하기</button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {plannerOpen && <SurvivalPlanner snapshot={plannerSnapshot} onClose={() => setPlannerOpen(false)} />}
    </div>
  );
}
