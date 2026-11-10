import { useState } from 'react';
import { Egg, Lock, LockOpen, Merge, Shield, House } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { fusionPartner, PET_DAILY_LOOT_CAP, PET_GUARD_SLOTS, PET_MAX_LEVEL, petDay, petStats, type OwnedPet, type PetDefense } from '@/lib/survival/pets';
import { petById } from '@/lib/survival/dinoEggs';
import PetSprite from './PetSprite';
import { HpBar } from './HitFeedback';

export default function PetPanel({ pets, defense, ready, now, onFuse, onDeploy, onLock, eggs = [], onHatch }: {
  eggs?: { id: string; name: string; walked: number; need: number; ready: boolean }[]; onHatch?: (id: string) => void;
  pets: OwnedPet[]; defense?: PetDefense; ready: boolean; now: number;
  onFuse: (first: string, second: string) => boolean; onDeploy: (uid: string) => void; onLock: (uid: string) => void;
}) {
  const [pair, setPair] = useState<[string, string] | null>(null);
  const first = pets.find(p => p.uid === pair?.[0]), second = pets.find(p => p.uid === pair?.[1]);
  const name = (p: OwnedPet) => petById(p.speciesId)?.name ?? p.name;
  return <section className="space-y-3" aria-label="거점 펫">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs">
      <b className="flex items-center gap-1 text-sm"><Shield className="!h-4 !w-4" />수호 {pets.filter(p => p.deployed).length}/{PET_GUARD_SLOTS}</b>
      <span>오늘 전리품 {defense?.day === petDay(now) ? defense.claims : 0}/{PET_DAILY_LOOT_CAP}</span>
    </div>
    {eggs.length > 0 && <div className="space-y-2" aria-label="부화 대기 알">
      <b className="flex items-center gap-1 text-sm"><Egg className="!h-4 !w-4" />보유한 알 {eggs.length}개</b>
      {eggs.map(e => <div key={e.id} className="pixel-frame flex items-center gap-2 bg-card p-2 text-xs">
        <div className="min-w-0 flex-1"><b className="block text-sm">{e.name}</b>
          <span>{e.ready ? '부화 준비 완료!' : `걸음 ${Math.floor(e.walked)}/${e.need}m`}</span>
          <div className="mt-1 h-1.5 bg-muted"><div className="h-full bg-primary" style={{ width: `${Math.min(100, (e.walked / e.need) * 100)}%` }} /></div></div>
        <Button className="min-h-11 shrink-0 text-xs" disabled={!e.ready || !onHatch} onClick={() => onHatch?.(e.id)}><Egg className="!h-4 !w-4" />부화하기</Button>
      </div>)}
    </div>}
    {!pets.length && <p className="py-6 text-center text-sm text-muted-foreground">아직 부화한 펫이 없습니다.</p>}
    {pets.map(p => {
      const partner = fusionPartner(pets, p), stats = petStats(p.level);
      const resting = p.restUntil > now;
      const same = pets.filter(q => q.speciesId === p.speciesId && q.level === p.level).length;
      return <article key={p.uid} data-pet-uid={p.uid} className="pixel-frame space-y-2 bg-card p-2">
        <div className="flex items-center gap-2">
          <PetSprite speciesId={p.speciesId} name={name(p)} height={52} />
          <div className="min-w-0 flex-1 text-xs">
            <b className="block break-words text-sm">{name(p)} <span className="text-primary">Lv.{p.level}</span></b>
            <span>{resting ? `휴식 ${Math.ceil((p.restUntil - now) / 1000)}초` : p.deployed ? '거점 수호 중' : '거점 대기'} · 같은 펫 {same}마리</span>
            <div className="mt-1 flex items-center gap-1"><HpBar value={p.hp} max={stats.maxHp} /><span>{p.hp}/{stats.maxHp}</span></div>
            <span>공격 {stats.attack}{p.level === PET_MAX_LEVEL ? ' · 최고 레벨' : ''}</span>
          </div>
          <Button size="icon" variant="ghost" disabled={!ready} className="h-11 w-11 shrink-0" title={p.locked ? '합체 잠금 해제' : '합체 잠금'} aria-label={`${name(p)} ${p.locked ? '합체 잠금 해제' : '합체 잠금'}`} aria-pressed={p.locked} onClick={() => onLock(p.uid)}>{p.locked ? <Lock /> : <LockOpen />}</Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={p.deployed ? 'secondary' : 'outline'} className="min-h-11 text-xs" disabled={!ready || (!p.deployed && pets.filter(q => q.deployed).length >= PET_GUARD_SLOTS)} onClick={() => onDeploy(p.uid)}>{p.deployed ? <House className="!h-4 !w-4" /> : <Shield className="!h-4 !w-4" />}{p.deployed ? '대기시키기' : '수호 배치'}</Button>
          <Button className="min-h-11 text-xs" disabled={!ready || !partner} onClick={() => { if (partner) setPair([p.uid, partner.uid]); }}><Merge className="!h-4 !w-4" />{p.level >= PET_MAX_LEVEL ? '최고 레벨' : `Lv.${p.level + 1} 합체`}</Button>
        </div>
      </article>;
    })}
    {!!defense?.logs.length && <div className="border-t border-border pt-3"><b className="text-sm">최근 수호 기록</b><ul className="mt-2 space-y-2 text-xs text-muted-foreground">{[...defense.logs].reverse().map((log, i) => <li key={`${log.at}:${i}`}>{log.text}</li>)}</ul></div>}
    <AlertDialog open={!!first && !!second} onOpenChange={open => { if (!open) setPair(null); }}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader><AlertDialogTitle>Lv.{first ? first.level + 1 : 2} 펫으로 합체할까요?</AlertDialogTitle><AlertDialogDescription>{first && `${name(first)} Lv.${first.level} 두 마리가 하나로 합쳐집니다. 추가 비용 없이 반드시 성공하며, 되돌릴 수 없습니다.`}</AlertDialogDescription></AlertDialogHeader>
        {first && second && <div className="flex items-center justify-center gap-3 py-2"><PetSprite speciesId={first.speciesId} name={name(first)} height={64} /><Merge className="text-primary" /><PetSprite speciesId={second.speciesId} name={name(second)} height={64} /></div>}
        <AlertDialogFooter><AlertDialogCancel className="min-h-11">취소</AlertDialogCancel><AlertDialogAction disabled={!ready} className="min-h-11" onClick={() => { if (pair) onFuse(pair[0], pair[1]); setPair(null); }}>합체하기</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </section>;
}