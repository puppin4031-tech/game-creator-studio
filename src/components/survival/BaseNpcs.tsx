import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import shamanArt from '@/assets/survival/npc-shaman.png';
import mercArt from '@/assets/survival/npc-mercenary.png';
import type { MercenaryContract } from '@/lib/survival/mercenaries';

const INTRO: { who: 'shaman' | 'hero'; text: string }[] = [
  { who: 'shaman', text: '안녕하신가? 나는 이 대륙을 떠도는 늙은 주술사라네. 보아하니 자네도 둥지가 없는 모양인데… 뼈가 시려 그러니, 자네 모닥불 곁에 잠시 머물러도 되겠나?' },
  { who: 'hero', text: '우우우…?' },
  { who: 'shaman', text: '응? 자네 아직 말을 못 하는 겐가? 잘됐네! 머무는 값으로 말과 도구, 그리고 이 험한 세상에서 살아남는 법을 가르쳐 주지.' },
  { who: 'shaman', text: '그리고 알을 줍거든 명심하게. 평범한 온기로는 깨어나지 않아. 자네 두 다리로 대지를 밟는 힘이 필요하다네.' },
  { who: 'shaman', text: '우선 저기 굴러다니는 돌부터 하나 주워 와 보게나. 일손이 모자라면 저 용병 녀석에게 고기를 주고 부려도 되고.' },
];
const TALK = ['자네가 걸을수록 알 속 생명이 꿈틀대지.', '제단에 좋은 재료를 올리면 내가 쓸 만한 걸 판별해 주겠네.', '거점이 커지면 짐승들이 냄새를 맡고 몰려올 걸세. 대비하게.'];

interface Props { shamanMet: boolean; mercenary: MercenaryContract | null | undefined; now: number; onMeet: () => void; onHire: () => boolean }

export default function BaseNpcs({ shamanMet, mercenary, now, onMeet, onHire }: Props) {
  const [open, setOpen] = useState<'shaman' | 'merc' | null>(shamanMet ? null : 'shaman');
  const [step, setStep] = useState(0);
  const hired = !!mercenary && now < mercenary.until;
  const line = shamanMet ? { who: 'shaman' as const, text: TALK[Math.floor(now / 60000) % TALK.length] } : INTRO[step];
  const next = () => { if (shamanMet) return setOpen(null); if (step < INTRO.length - 1) return setStep(step + 1); onMeet(); setOpen(null); };
  const npcBtn = 'pointer-events-auto absolute bottom-0 flex min-h-11 min-w-11 flex-col items-center';
  return <>
    <button type="button" aria-label="떠돌이 주술사와 대화" onClick={e => { e.stopPropagation(); setOpen('shaman'); }} className={npcBtn} style={{ left: 58 }}>
      {!shamanMet && <span className="animate-bounce rounded bg-primary px-1 text-[10px] font-bold text-primary-foreground">!</span>}
      <img src={shamanArt} alt="" className="pixelated h-14 w-auto" style={{ transform: 'scaleX(-1)' }} />
    </button>
    <button type="button" aria-label="용병 고용" onClick={e => { e.stopPropagation(); setOpen('merc'); }} className={npcBtn} style={{ right: 58 }}>
      {hired ? <span className="rounded bg-card px-1 text-[10px]">계약 중</span> : <span className="rounded bg-accent px-1 text-[10px] text-accent-foreground">고용</span>}
      <img src={mercArt} alt="" className={`pixelated h-14 w-auto ${hired ? 'opacity-40' : ''}`} />
    </button>
    <Dialog open={open !== null} onOpenChange={o => !o && setOpen(null)}>
      <DialogContent className="max-w-sm" onClick={e => e.stopPropagation()}>
        {open === 'shaman' ? <>
          <DialogHeader><DialogTitle>{line.who === 'hero' ? '나' : '떠돌이 주술사'}</DialogTitle><DialogDescription className="sr-only">주술사 대화</DialogDescription></DialogHeader>
          <div className="flex items-end gap-3">
            <img src={shamanArt} alt="떠돌이 주술사" className={`pixelated h-28 w-auto ${line.who === 'hero' ? 'opacity-40' : ''}`} />
            <p className="flex-1 rounded-lg border bg-card p-3 text-sm leading-relaxed">{line.text}</p>
          </div>
          <Button className="min-h-11 w-full" onClick={next}>{!shamanMet && step < INTRO.length - 1 ? '다음' : '알겠어요'}</Button>
        </> : <>
          <DialogHeader><DialogTitle>떠돌이 용병</DialogTitle><DialogDescription>"고기만 주면 어디든 다녀오지."</DialogDescription></DialogHeader>
          <div className="flex items-center gap-3">
            <img src={mercArt} alt="떠돌이 용병" className="pixelated h-28 w-auto" />
            <div className="flex-1 space-y-1 text-sm">
              {hired ? <p><b>{mercenary!.name}</b> 계약 중 · 남은 시간 {Math.ceil((mercenary!.until - now) / 3600000)}시간</p> : <p>비용: 날고기 3 + 털가죽 1 (창고 또는 배낭)</p>}
              <p className="text-muted-foreground">계약 24시간 동안 원정은 용병이 대신 다녀와요. 거점 창 [원정] 탭에서 보내세요.</p>
            </div>
          </div>
          <Button className="min-h-11 w-full" disabled={hired} onClick={() => { if (onHire()) setOpen(null); }}>{hired ? '이미 계약 중' : '고용하기'}</Button>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
