import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Flame, Volume2, Zap, Hammer, Tent, PawPrint, Users, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ACTIVE_SKILLS, PALISADE_COST, RECRUIT_COST, RESCUE_COST, TAME_COST, WORK_MS, type ActiveSkill, type Companion } from '@/lib/survival/abilities';
import { OUTPOST_COST } from '@/lib/survival/bases';
import { ITEMS } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

const materials = (cost: Stack[]) => cost.map(s => `${ITEMS[s.itemId].name} ${s.count}`).join(' · ');
const icons = { stone_barrage: Zap, roar: Volume2, ember_scatter: Flame };
export function SkillControls({ known, cooldowns, ready, onUse }: { known: string[]; cooldowns?: Record<string, number>; ready: boolean; onUse: (id: ActiveSkill) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  return <div className="grid grid-cols-1 gap-2">{(Object.keys(ACTIVE_SKILLS) as ActiveSkill[]).filter(id => known.includes(id)).map(id => {
    const def = ACTIVE_SKILLS[id]; const Icon = icons[id];
    const wait = Math.max(0, Math.ceil(((cooldowns?.[id] ?? 0) - now) / 1000));
    return <Button key={id} variant="outline" disabled={!ready || wait > 0} className="pixel-btn h-11 justify-start" onClick={() => onUse(id)}><Icon className="!h-5 !w-5" />{def.name}{wait > 0 && <span className="ml-auto">{wait}초</span>}</Button>;
  })}</div>;
}
export function ConstructionControls({ known, palisade, outpost, ready, onBuild }: { known: string[]; palisade?: boolean; outpost: boolean; ready: boolean; onBuild: (id: 'palisade' | 'outpost') => void }) {
  return <div className="space-y-2">{(['palisade', 'outpost'] as const).filter(id => known.includes(id)).map(id => {
    const built = id === 'palisade' ? palisade : outpost; const Icon = id === 'palisade' ? Hammer : Tent;
    return <div key={id} className="border-t border-border pt-2 text-xs"><p>{materials(id === 'palisade' ? PALISADE_COST : OUTPOST_COST)}</p><Button variant="outline" className="mt-1 h-11 w-full" disabled={!ready || !!built} onClick={() => onBuild(id)}><Icon />{built ? '설치 완료' : id === 'palisade' ? '본거지에 목책 설치' : '현재 위치에 전진기지 설치'}</Button></div>;
  })}</div>;
}
export function CompanionControls({ known, companions, ready, rescueTokens, onRecruit, onCollect, wolves, onTame }: { known: string[]; companions: Companion[]; ready: boolean; rescueTokens: number; onRecruit: (id: 'gatherer' | 'rescued') => void; onCollect: () => void; wolves: { id: string; name: string; hp: number }[]; onTame: (id: string) => void }) {
  return <div className="space-y-3 text-xs">
    {known.includes('wolf_taming') && <div><b>늑대 길들이기</b><p>{materials(TAME_COST)}</p>{wolves.map(w => <Button key={w.id} className="mt-1 h-11 w-full" variant="outline" disabled={!ready} onClick={() => onTame(w.id)}><PawPrint />{w.name} · 체력 {w.hp} · 길들이기</Button>)}{!wolves.length && <p className="text-muted-foreground">25m 안에 일반 늑대가 없습니다.</p>}</div>}
    {known.includes('recruitment') && <div><p>{materials(RECRUIT_COST)}</p><Button variant="outline" className="h-11 w-full" disabled={!ready} onClick={() => onRecruit('gatherer')}><Users />샤먼 곁에서 NPC 모집</Button></div>}
    {known.includes('rescue') && <div><p>{materials(RESCUE_COST)} · 구조 기회 {rescueTokens}/2</p><Button variant="outline" className="h-11 w-full" disabled={!ready || rescueTokens < 1} onClick={() => onRecruit('rescued')}><Users />본거지에서 포로 구출</Button></div>}
    {companions.map(c => <div key={c.id} className="flex items-center justify-between border-b border-border py-2"><b>{c.name}</b><span>{c.kind === 'wolf' ? '공격 +3' : Date.now() - c.lastWorkAt >= WORK_MS ? '재료 수령 가능' : '거점 작업 중'}</span></div>)}
    {companions.some(c => c.kind !== 'wolf') && <Button variant="outline" className="h-11 w-full" disabled={!ready} onClick={onCollect}><PackageCheck />본거지 작업 재료 받기</Button>}
  </div>;
}
export function SkillEffect({ id, stamp, radius }: { id: ActiveSkill; stamp: number; radius: number }) {
  const Icon = icons[id];
  const reduced = useReducedMotion();
  return <motion.div key={stamp} aria-hidden initial={{ opacity: 1, scale: reduced ? 1 : 0.2 }} animate={{ opacity: 0, scale: 1 }} transition={{ duration: 0.9 }} className={`pointer-events-none absolute flex items-center justify-center rounded-full border-4 ${id === 'ember_scatter' ? 'border-destructive bg-destructive/20 text-destructive' : 'border-primary bg-primary/20 text-primary'}`} style={{ width: radius * 2, height: radius * 2, left: -radius, top: -radius }}><Icon className="!h-10 !w-10" /></motion.div>;
}