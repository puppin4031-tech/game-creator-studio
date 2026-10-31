import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Map, Circle, CustomOverlayMap } from 'react-kakao-maps-sdk';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { ArrowLeft, Radar, Home, Backpack, Hammer, Flag } from 'lucide-react';
import { toast } from 'sonner';
import { useSurvivalGame, WorldEntity } from '@/hooks/useSurvivalGame';
import { ENTITIES, ITEMS, QUALITY_LABEL, RECIPES, SURVIVAL_CONFIG, Recipe, Stack, canCraft, countOf } from '@/lib/survival';
import { haversineDistance } from '@/lib/haversine';
import KnappingMinigame from '@/components/survival/KnappingMinigame';

const START = { lat: 37.748, lng: 126.7496 };

function PixelSprite({ color, size = 28, creature = false }: { color: string; size?: number; creature?: boolean }) {
  return (
    <motion.div
      className="pixelated"
      animate={{ y: [0, -3, 0] }}
      transition={{ repeat: Infinity, duration: creature ? 0.8 : 2, ease: 'linear' }}
      style={{ width: size, height: size, background: color, border: '3px solid #1c1917', boxShadow: '3px 3px 0 0 rgba(0,0,0,.6)' }}
    />
  );
}

function StackList({ stacks }: { stacks: Stack[] }) {
  if (!stacks.length) return <p className="text-sm text-stone-500">비어 있음</p>;
  return (
    <div className="grid grid-cols-4 gap-2">
      {stacks.map((s) => (
        <div key={s.itemId} className="pixel-frame flex flex-col items-center bg-stone-100 p-1 text-[11px]">
          <span className="pixelated mb-1 h-4 w-4" style={{ background: ITEMS[s.itemId].color }} />
          <span className="truncate">{ITEMS[s.itemId].name}</span>
          <b>x{s.count}</b>
        </div>
      ))}
    </div>
  );
}

export default function SurvivalSimulator() {
  const navigate = useNavigate();
  const g = useSurvivalGame(START);
  const [target, setTarget] = useState<WorldEntity | null>(null);
  const [lastMsg, setLastMsg] = useState('');
  const [panel, setPanel] = useState<'none' | 'bag' | 'base'>('none');
  const [crafting, setCrafting] = useState<Recipe | null>(null);
  const [now, setNow] = useState(Date.now());
  const shake = useAnimationControls();

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const targetLive = target ? g.entities.find((e) => e.id === target.id) ?? null : null;
  const secs = Math.max(0, Math.ceil((g.nextScanAt - now) / 1000));
  const weightPct = Math.min(100, (g.backpackWeight / SURVIVAL_CONFIG.backpackMaxWeight) * 100);

  const hit = () => {
    if (!target) return;
    const r = g.interact(target.id);
    setLastMsg(r.message);
    if (r.ok) shake.start({ x: [-4, 4, -2, 2, 0], transition: { duration: 0.25 } });
    else toast.warning(r.message);
    if (!g.entities.find((e) => e.id === target.id)) setTarget(null);
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-stone-900 font-pixel text-base">
      {/* Map (tap = simulated walk) */}
      <div className="absolute inset-0" style={{ filter: 'sepia(.35) saturate(.8) contrast(1.05)' }}>
        <Map center={g.pos} isPanto style={{ width: '100%', height: '100%' }} level={3}
          onClick={(_, e) => g.setPos({ lat: e.latLng.getLat(), lng: e.latLng.getLng() })}>
          <Circle center={g.base} radius={SURVIVAL_CONFIG.baseRadiusM} strokeWeight={3} strokeColor="#d4a843" strokeStyle="dash" fillColor="#d4a843" fillOpacity={0.12} />
          <CustomOverlayMap position={g.base} xAnchor={0.5} yAnchor={0.5} zIndex={5}>
            <motion.div className="pixelated h-6 w-6" animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 0.6 }}
              style={{ background: '#f97316', border: '3px solid #7c2d12', boxShadow: '0 0 12px 4px #fb923c' }} />
          </CustomOverlayMap>
          {g.entities.map((e) => (
            <CustomOverlayMap key={e.id} position={{ lat: e.lat, lng: e.lng }} xAnchor={0.5} yAnchor={0.5} zIndex={10}>
              <button onClick={() => { setTarget(e); setLastMsg(''); }} className="flex h-11 w-11 items-center justify-center" aria-label={ENTITIES[e.type].name}>
                <PixelSprite color={ENTITIES[e.type].color} creature={ENTITIES[e.type].isCreature} size={ENTITIES[e.type].isCreature ? 30 : 24} />
              </button>
            </CustomOverlayMap>
          ))}
          {g.drops.map((d) => (
            <CustomOverlayMap key={d.id} position={{ lat: d.lat, lng: d.lng }} xAnchor={0.5} yAnchor={0.5} zIndex={9}>
              <div className="pixelated h-5 w-5 animate-pulse" style={{ background: '#facc15', border: '3px solid #713f12' }} />
            </CustomOverlayMap>
          ))}
          <CustomOverlayMap position={g.pos} xAnchor={0.5} yAnchor={0.5} zIndex={20}>
            <div className="pixelated h-5 w-5" style={{ background: '#2563eb', border: '3px solid #fff', boxShadow: '0 0 0 3px #1e3a8a' }} />
          </CustomOverlayMap>
        </Map>
        <div className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
      </div>

      {/* Top status */}
      <div className="absolute inset-x-2 z-[1200] space-y-2" style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/play')} className="pixel-btn flex h-11 w-11 items-center justify-center bg-stone-200" aria-label="뒤로">
            <ArrowLeft className="!h-6 !w-6" />
          </button>
          <div className={`pixel-frame flex-1 px-2 py-2 text-sm ${g.inBase ? 'bg-yellow-300' : 'bg-green-300'}`}>
            {g.inBase ? '거점 안전지대 · 제작/창고 활성화' : `야생 필드 · 배낭 모드 (거점 ${Math.round(g.distToBase)}m)`}
          </div>
        </div>
        <div className="pixel-frame bg-stone-200 p-2 text-xs">
          <div className="mb-1 flex justify-between"><span>HP {g.hp}/100</span><span>배낭 {g.backpackWeight}/{SURVIVAL_CONFIG.backpackMaxWeight}</span></div>
          <div className="flex gap-2">
            <div className="h-3 flex-1 border-2 border-stone-800 bg-stone-400"><div className="h-full bg-red-600" style={{ width: `${g.hp}%` }} /></div>
            <div className="h-3 flex-1 border-2 border-stone-800 bg-stone-400"><div className={`h-full ${weightPct > 85 ? 'bg-orange-500' : 'bg-amber-700'}`} style={{ width: `${weightPct}%` }} /></div>
          </div>
          <p className="mt-1 truncate">도구: {g.tool ? `${QUALITY_LABEL[g.tool.quality]} ${ITEMS[g.tool.itemId].name} (${g.tool.durability})` : '맨손'} · 무기: {g.weapon ? `${ITEMS[g.weapon.itemId].name} (${g.weapon.durability})` : '없음'}</p>
        </div>
        <p className="text-center text-[11px] text-stone-100 drop-shadow">지도를 탭하면 그 위치로 이동(테스트)</p>
      </div>

      {/* Right action stack */}
      <div className="absolute right-3 z-[1200] flex flex-col gap-3" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
        <button onClick={g.scan} className="pixel-btn flex h-16 w-16 flex-col items-center justify-center bg-cyan-300 text-[10px]"><Radar className="!h-7 !w-7" />{secs}s</button>
        <button onClick={() => setPanel('bag')} className="pixel-btn flex h-16 w-16 flex-col items-center justify-center bg-amber-300 text-[10px]"><Backpack className="!h-7 !w-7" />배낭</button>
        <button onClick={() => setPanel('base')} className="pixel-btn flex h-16 w-16 flex-col items-center justify-center bg-yellow-400 text-[10px]"><Hammer className="!h-7 !w-7" />거점</button>
        <button onClick={() => { g.setBase(g.pos); toast.success('여기에 거점(모닥불)을 설치했습니다'); }} className="pixel-btn flex h-16 w-16 flex-col items-center justify-center bg-orange-300 text-[10px]"><Flag className="!h-7 !w-7" />설치</button>
      </div>

      {/* Interaction modal */}
      <AnimatePresence>
        {targetLive && (
          <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
            className="pixel-frame absolute inset-x-2 z-[1300] bg-stone-200 p-3 pr-20" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            {(() => {
              const def = ENTITIES[targetLive.type];
              const dist = Math.round(haversineDistance(g.pos.lat, g.pos.lng, targetLive.lat, targetLive.lng));
              const lacking = !def.isCreature && (g.tool?.gatherTier ?? 0) < def.requiredToolTier;
              return (
                <>
                  <div className="flex items-center gap-3">
                    <motion.div animate={shake}><PixelSprite color={def.color} size={40} creature={def.isCreature} /></motion.div>
                    <div className="flex-1 text-sm">
                      <b>{def.name}</b> · {dist}m
                      <div className="mt-1 h-2 border-2 border-stone-800 bg-stone-400"><div className="h-full bg-green-600" style={{ width: `${(targetLive.hp / def.hp) * 100}%` }} /></div>
                      {lacking && <p className="mt-1 text-xs text-red-700">도구가 부족합니다 (맨손 시 HP -{SURVIVAL_CONFIG.bareHandHpPenalty}, 50% 실패)</p>}
                      {def.isCreature && <p className="mt-1 text-xs text-red-700">반격 데미지 {def.atk}</p>}
                      {lastMsg && <p className="mt-1 text-xs">{lastMsg}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => setTarget(null)} className="pixel-btn min-h-[48px] flex-1 bg-stone-400">닫기</button>
                    <button onClick={hit} className={`pixel-btn min-h-[48px] flex-[2] ${def.isCreature ? 'bg-red-500' : 'bg-green-500'}`}>{def.isCreature ? '공격하기' : '채취하기'}</button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panels */}
      <AnimatePresence>
        {panel !== 'none' && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'tween', duration: 0.2 }}
            className="absolute inset-x-0 bottom-0 z-[1400] flex max-h-[75dvh] flex-col border-t-4 border-stone-800 bg-stone-300 p-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg">{panel === 'bag' ? '배낭' : '거점 제작소'}</h2>
              <button onClick={() => setPanel('none')} className="pixel-btn min-h-[44px] bg-stone-100 px-3">닫기</button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {panel === 'bag' ? (
                <>
                  <StackList stacks={g.backpack} />
                  <p className="text-xs">거점 반경 {SURVIVAL_CONFIG.baseRadiusM}m 안에 들어가면 자동으로 창고에 보관됩니다.</p>
                  <h3>장비</h3>
                  {g.gear.length === 0 && <p className="text-sm text-stone-500">없음</p>}
                  {g.gear.map((it) => {
                    const isTool = it.gatherTier > 0;
                    const equipped = it.instanceId === g.tool?.instanceId || it.instanceId === g.weapon?.instanceId;
                    return (
                      <button key={it.instanceId} onClick={() => (isTool ? g.setEquippedToolId(it.instanceId) : g.setEquippedWeaponId(it.instanceId))}
                        className={`pixel-btn flex min-h-[44px] w-full justify-between px-2 text-sm ${equipped ? 'bg-yellow-300' : 'bg-stone-100'}`}>
                        <span>[{QUALITY_LABEL[it.quality]}] {ITEMS[it.itemId].name}</span>
                        <span>공{it.atk} · {it.durability}/{it.maxDurability}</span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <>
                  <h3>창고</h3>
                  <StackList stacks={g.storage} />
                  <h3>제작 (창고 재료 사용 · 어디서나 가능)</h3>
                  {RECIPES.map((r) => {
                    const ok = canCraft(g.storage, r);
                    return (
                      <div key={r.resultItemId} className="pixel-frame flex items-center gap-2 bg-stone-100 p-2">
                        <span className="pixelated h-8 w-8 shrink-0" style={{ background: ITEMS[r.resultItemId].color, border: '3px solid #1c1917' }} />
                        <div className="flex-1 text-xs">
                          <b className="text-sm">{ITEMS[r.resultItemId].name}</b>
                          <p>{r.ingredients.map((i) => `${ITEMS[i.itemId].name} ${countOf(g.storage, i.itemId)}/${i.count}`).join(' · ')}</p>
                        </div>
                        <button disabled={!ok} onClick={() => setCrafting(r)} className="pixel-btn min-h-[44px] bg-orange-400 px-3 text-sm">제작</button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {crafting && (
        <KnappingMinigame recipe={crafting} onCancel={() => setCrafting(null)}
          onDone={(q) => { g.craft(crafting, q); setCrafting(null); }} />
      )}

      {!g.inBase && g.distToBase > 0 && false && <Home />}
    </div>
  );
}
