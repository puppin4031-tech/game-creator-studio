import { useState } from 'react';
import { Egg, Drumstick, Lock, LockOpen, Merge, Shield, Swords } from 'lucide-react';
import { ContextualHelpButton } from './ContextualHelpButton';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { fusionPartner, PET_DAILY_LOOT_CAP, PET_GUARD_SLOTS, PET_MAX_LEVEL, petDay, petStats, petRole, PET_ROLE_LABEL, PET_HUNT_MS, PET_DEFENSE, PET_FOLLOW_ATK, type PetRole, type OwnedPet, type PetDefense } from '@/lib/survival/pets';
import { petById } from '@/lib/survival/dinoEggs';
import PetSprite from './PetSprite';
import { HpBar } from './HitFeedback';
import { eggArt } from './eggArt';
import { fusionSpecies } from '@/lib/survival/pets';
import { abilitiesFor, abilityText } from '@/lib/survival/petAbilities';
import PetFusionModal, { type PetFusionResult } from './PetFusionModal';

export default function PetPanel({ pets, defense, ready, now, onFuse, onDeploy, onLock, onRole, onFeed, onOpenDinoExpedition, eggs = [], onHatch }: {
  onFeed?: (uid: string) => void;
  onOpenDinoExpedition?: () => void;
  eggs?: { id: string; name: string; walked: number; need: number; ready: boolean }[]; onHatch?: (id: string) => void;
  pets: OwnedPet[]; defense?: PetDefense; ready: boolean; now: number;
  onFuse: (first: string, second: string) => OwnedPet | boolean | null; onDeploy: (uid: string) => void; onLock: (uid: string) => void; onRole?: (uid: string, role: PetRole) => void;
}) {
  const [pair, setPair] = useState<[string, string] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [fusionResult, setFusionResult] = useState<PetFusionResult | null>(null);
  const effect: Record<PetRole, string> = { guard: '거점에 다가오는 맹수 자동 퇴치 · 전리품 창고로', hunt: `${PET_HUNT_MS / 60000}분마다 사냥 후 전리품 귀환`, follow: `함께 걸으며 공격 +${PET_FOLLOW_ATK}`, idle: '거점에서 휴식' };
  const first = pets.find(p => p.uid === pair?.[0]), second = pets.find(p => p.uid === pair?.[1]);
  const name = (p: OwnedPet) => petById(p.speciesId)?.name ?? p.name;
  return <section className="space-y-3" aria-label="거점 펫">
    {onOpenDinoExpedition && (
      <div className="pixel-frame flex flex-wrap items-center justify-between gap-2 bg-primary/15 p-2.5 text-xs">
        <div className="space-y-0.5">
          <b className="block text-sm text-primary">🦖 공룡 탐험대 (횡스크롤 야생 사냥)</b>
          <span className="text-[11px] text-muted-foreground">
            보유 공룡 최대 3마리를 직접 지휘해 숲속 자원·공룡 알·전리품을 획득하세요!
          </span>
        </div>
        <Button
          type="button"
          disabled={!pets.length}
          onClick={onOpenDinoExpedition}
          className="pixel-btn min-h-10 gap-1.5 bg-primary px-3 text-xs font-extrabold text-primary-foreground"
        >
          <Swords className="!h-4 !w-4" />
          🦖 공룡 사냥 내보내기
        </Button>
      </div>
    )}
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 text-xs">
      <b className="flex items-center gap-1 text-sm"><Shield className="!h-4 !w-4" />수호 {pets.filter(p => p.deployed).length}/{PET_GUARD_SLOTS}</b>
      <div className="flex items-center gap-2">
        <span>오늘 전리품 {defense?.day === petDay(now) ? defense.claims : 0}/{PET_DAILY_LOOT_CAP}</span>
        <ContextualHelpButton
          title="공룡 펫 & 알 부화"
          bullets={[
            "공룡 알을 배낭에 넣고 걸으면 부화 거리가 누적되어 새 공룡이 태어납니다.",
            "수호/사냥/동행 역할을 부여해 거점 방어와 야생 탐험에 활용하세요.",
            "같은 종의 공룡 2마리를 융합하면 상위 세대와 강력한 고유 스킬이 발현됩니다."
          ]}
        />
      </div>
    </div>
    {eggs.length > 0 && <div className="space-y-2" aria-label="부화 대기 알">
      <b className="flex items-center gap-1 text-sm"><Egg className="!h-4 !w-4" />보유한 알 {eggs.length}개</b>
      {eggs.map(e => <div key={e.id} className="pixel-frame flex items-center gap-2 bg-card p-2 text-xs">
        <img src={eggArt(e.id)} alt="공룡 알" className="pixelated h-12 w-12 shrink-0 object-contain" />
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
      const same = pets.filter(q => fusionSpecies(q.speciesId) === fusionSpecies(p.speciesId) && q.level === p.level).length;
      return <article key={p.uid} data-pet-uid={p.uid} className="pixel-frame space-y-2 bg-card p-2">
        <div className="flex items-center gap-2">
          <button type="button" className="shrink-0" aria-expanded={open === p.uid} aria-label={`${name(p)} 상세 보기`} onClick={() => setOpen(o => o === p.uid ? null : p.uid)}><PetSprite speciesId={p.speciesId} name={name(p)} height={52} /></button>
          <div className="min-w-0 flex-1 text-xs">
            <b className="block break-words text-sm">{name(p)} <span className="text-primary">Lv.{p.level}</span></b>
            <span>{resting ? `휴식 ${Math.ceil((p.restUntil - now) / 1000)}초` : PET_ROLE_LABEL[petRole(p)]}{petRole(p) === 'hunt' && p.huntAt ? ` · ${Math.max(0, Math.ceil((p.huntAt + PET_HUNT_MS - now) / 60000))}분 뒤 귀환` : ''} · 같은 펫 {same}마리</span>
            <div className="mt-1 flex items-center gap-1"><HpBar value={p.hp} max={stats.maxHp} /><span>{p.hp}/{stats.maxHp}</span></div>
            <span>공격 {stats.attack}{p.level === PET_MAX_LEVEL ? ' · 최고 레벨' : ''}</span>
            {abilitiesFor(p.speciesId).map(a => <span key={a.key} className="block font-semibold text-primary">{abilityText(a, p.level)}{a.desc ? ` · ${a.desc}` : ''}</span>)}
          </div>
          <Button size="icon" variant="ghost" disabled={!ready} className="h-11 w-11 shrink-0" title={p.locked ? '합체 잠금 해제' : '합체 잠금'} aria-label={`${name(p)} ${p.locked ? '합체 잠금 해제' : '합체 잠금'}`} aria-pressed={p.locked} onClick={() => onLock(p.uid)}>{p.locked ? <Lock /> : <LockOpen />}</Button>
        </div>
        {open === p.uid && <div className="pixel-box space-y-1.5 bg-muted/40 p-2 text-xs">
          <div className="grid grid-cols-2 gap-1"><span>전투력 <b>{Math.round(stats.attack)}</b></span><span>방어력 <b>{PET_DEFENSE}</b></span></div>
          <p>효과: {effect[petRole(p)]}</p>
          <p className="text-muted-foreground">고유 능력은 같은 공룡 여러 마리여도 가장 높은 레벨 1마리만 적용</p>
          <Button className="min-h-11 w-full text-xs" disabled={!onFeed || p.hp >= stats.maxHp} onClick={() => onFeed?.(p.uid)}><Drumstick className="!h-4 !w-4" />먹이주기 (창고 음식 1개)</Button>
        </div>}
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2 grid grid-cols-4 gap-1" role="radiogroup" aria-label={`${name(p)} 역할`}>
            {(['guard', 'hunt', 'follow', 'idle'] as PetRole[]).map(r => <Button key={r} role="radio" aria-checked={petRole(p) === r} variant={petRole(p) === r ? 'default' : 'outline'} className="min-h-11 px-1 text-[11px]" disabled={!ready} onClick={() => onRole ? onRole(p.uid, r) : r === 'guard' || petRole(p) === 'guard' ? onDeploy(p.uid) : undefined}>{PET_ROLE_LABEL[r]}</Button>)}
          </div>
          <Button className="col-span-2 min-h-11 text-xs" disabled={!ready || !partner} onClick={() => { if (partner) setPair([p.uid, partner.uid]); }}><Merge className="!h-4 !w-4" />{p.level >= PET_MAX_LEVEL ? '최고 레벨' : `Lv.${p.level + 1} 합체`}</Button>
          {p.locked && <p className="col-span-2 text-xs text-muted-foreground">합체 잠금 중 · 자물쇠를 눌러 해제</p>}
        </div>
      </article>;
    })}
    {!!defense?.logs.length && <div className="border-t border-border pt-3"><b className="text-sm">최근 수호 기록</b><ul className="mt-2 space-y-2 text-xs text-muted-foreground">{[...defense.logs].reverse().map((log, i) => <li key={`${log.at}:${i}`}>{log.text}</li>)}</ul></div>}
    <AlertDialog open={!!first && !!second} onOpenChange={open => { if (!open) setPair(null); }}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader><AlertDialogTitle>Lv.{first ? first.level + 1 : 2} 펫으로 합체할까요?</AlertDialogTitle><AlertDialogDescription>{first && `${name(first)} Lv.${first.level} 두 마리가 하나로 합쳐집니다. 추가 비용 없이 반드시 성공하며, 되돌릴 수 없습니다.`}</AlertDialogDescription></AlertDialogHeader>
        {first && second && <div className="flex items-center justify-center gap-3 py-2"><PetSprite speciesId={first.speciesId} name={name(first)} height={64} /><Merge className="text-primary" /><PetSprite speciesId={second.speciesId} name={name(second)} height={64} /></div>}
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-11">취소</AlertDialogCancel>
          <AlertDialogAction
            disabled={!ready}
            className="min-h-11"
            onClick={() => {
              if (pair && first && second) {
                const fused = onFuse(pair[0], pair[1]);
                if (fused) {
                  const pet = typeof fused === 'object' ? fused : { ...first, level: first.level + 1 };
                  setFusionResult({
                    pet,
                    prevLevel: first.level,
                    firstPet: first,
                    secondPet: second,
                  });
                }
              }
              setPair(null);
            }}
          >
            합체하기
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <PetFusionModal
      result={fusionResult}
      onClose={() => setFusionResult(null)}
    />
  </section>;
}