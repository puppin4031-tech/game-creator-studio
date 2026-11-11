import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import shamanArt from '@/assets/survival/npc-shaman.png';
import mercArt from '@/assets/survival/npc-mercenary.png';
import { tribeHireCost, tribeTrainCost, tribeInjured, tribeRatio, TRIBE_MAX, TRIBE_TREAT_COST, type TribeState } from '@/lib/survival/mercenaries';
import { ITEMS } from '@/lib/survival/items';
import type { Stack } from '@/lib/survival/types';

const INTRO: { who: 'shaman' | 'hero'; text: string }[] = [
  { who: 'shaman', text: '안녕하신가? 나는 이 대륙을 떠도는 늙은 주술사라네. 보아하니 자네도 둥지가 없는 모양인데… 뼈가 시려 그러니, 자네 모닥불 곁에 잠시 머물러도 되겠나?' },
  { who: 'hero', text: '우우우…?' },
  { who: 'shaman', text: '응? 자네 아직 말을 못 하는 겐가? 잘됐네! 머무는 값으로 말과 도구, 그리고 이 험한 세상에서 살아남는 법을 가르쳐 주지.' },
  { who: 'shaman', text: '그리고 알을 줍거든 명심하게. 평범한 온기로는 깨어나지 않아. 자네 두 다리로 대지를 밟는 힘이 필요하다네.' },
  { who: 'shaman', text: '우선 저기 굴러다니는 돌부터 하나 주워 와 보게나. 일손이 모자라면 저 용병 녀석에게 고기를 주고 부려도 되고.' },
];
const TALK = ['자네가 걸을수록 알 속 생명이 꿈틀대지.', '제단에 좋은 재료를 올리면 내가 쓸 만한 걸 판별해 주겠네.', '부족민과 짐승들은 창고 식량을 먹고 산다네. 창고를 비우지 말게.'];
/** Shaman's interface tour, one panel per stop. */
const TOUR = [
  { title: '거점 · 모닥불', text: '여기가 자네의 성역일세. 거점 안에서는 체력이 차오르고, 부족민과 짐승들이 머문다네.' },
  { title: '창고 · 배낭', text: '거점에 들어오면 배낭 짐이 창고로 옮겨지지. 부족민과 짐승은 창고 식량을 매시간 먹는다네.' },
  { title: '제작', text: '배운 기술로 도구·무기·방어구를 만드는 곳이네. 연구할수록 만들 수 있는 게 늘어나지.' },
  { title: '제단 (발명)', text: '재료를 올리면 새 장비를 빚어낸다네. 높은 등급 재료일수록 더 강해지지.' },
  { title: '원정', text: '부족민을 밖으로 보내 자원을 긁어오게. 다만 부족민 힘은 자네의 6분의 1이라네. 직접 걷는 자가 진짜 강자지.' },
  { title: '펫 · 공룡 알', text: '알은 자네 발걸음으로 깨어나고, 같은 짐승 둘을 합치면 더 강해진다네. 과일과 날고기를 먹이게.' },
];
const label = (c: Stack[]) => c.map(x => `${ITEMS[x.itemId]?.name ?? x.itemId} ${x.count}`).join(' · ');
const have = (c: Stack[], a: Stack[] = [], b: Stack[] = []) => c.every(x => [...(a ?? []), ...(b ?? [])].filter(y => y.itemId === x.itemId).reduce((n, y) => n + y.count, 0) >= x.count);

interface Props { shamanMet: boolean; tribe: TribeState | undefined; storage: Stack[]; backpack: Stack[]; now: number; onMeet: () => void; onHire: () => boolean; onTrain: () => boolean; onTreat: () => boolean; onEscort: () => void; expeditionBusy: boolean }

export default function BaseNpcs({ shamanMet, tribe, storage, backpack, now, onMeet, onHire, onTrain, onTreat, onEscort, expeditionBusy }: Props) {
  const [open, setOpen] = useState<'shaman' | 'merc' | null>(shamanMet ? null : 'shaman');
  const [step, setStep] = useState(0);
  const [tour, setTour] = useState<number | null>(null);
  const count = tribe?.count ?? 0;
  const injured = tribeInjured(tribe, now);
  const hireCost = tribeHireCost(count);
  const trainCost = tribeTrainCost(tribe?.trainLevel ?? 0);
  const line = shamanMet ? { who: 'shaman' as const, text: TALK[Math.floor(now / 60000) % TALK.length] } : INTRO[step];
  const next = () => {
    if (tour !== null) return tour < TOUR.length - 1 ? setTour(tour + 1) : (setTour(null), setOpen(null));
    if (shamanMet) return setOpen(null);
    if (step < INTRO.length - 1) return setStep(step + 1);
    onMeet(); setTour(0);
  };
  const npcBtn = 'pointer-events-auto absolute bottom-0 flex min-h-11 min-w-11 flex-col items-center';
  const pixelBtn = 'min-h-11 w-full rounded-none border-2 border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground)/0.6)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none';
  return <>
    <button type="button" aria-label="떠돌이 주술사와 대화" onClick={e => { e.stopPropagation(); setOpen('shaman'); }} className={npcBtn} style={{ left: 58 }}>
      {!shamanMet && <span className="animate-bounce bg-primary px-1 text-[10px] font-bold text-primary-foreground">!</span>}
      <img src={shamanArt} alt="" className="pixelated h-14 w-auto" style={{ transform: 'scaleX(-1)' }} />
    </button>
    <button type="button" aria-label="부족민 영입" onClick={e => { e.stopPropagation(); setOpen('merc'); }} className={npcBtn} style={{ right: 58 }}>
      <span className={`px-1 text-[10px] ${injured ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}>{injured ? '부상' : `부족 ${count}/${TRIBE_MAX}`}</span>
      <img src={mercArt} alt="" className={`pixelated h-14 w-auto ${injured ? 'opacity-40' : ''}`} />
    </button>
    <Dialog open={open !== null} onOpenChange={o => { if (!o) { setOpen(null); setTour(null); } }}>
      <DialogContent className="pixel-panel max-w-sm" onClick={e => e.stopPropagation()}>
        {open === 'shaman' ? <>
          <DialogHeader><DialogTitle>{tour !== null ? `안내 ${tour + 1}/${TOUR.length} · ${TOUR[tour].title}` : line.who === 'hero' ? '나' : '떠돌이 주술사'}</DialogTitle><DialogDescription className="sr-only">주술사 대화</DialogDescription></DialogHeader>
          <div className="flex items-end gap-3">
            <img src={shamanArt} alt="떠돌이 주술사" className={`pixelated h-28 w-auto ${tour === null && line.who === 'hero' ? 'opacity-40' : ''}`} />
            <p className="pixel-box flex-1 bg-background p-3 text-sm leading-relaxed">{tour !== null ? TOUR[tour].text : line.text}</p>
          </div>
          <Button className={pixelBtn} onClick={next}>{tour !== null ? (tour < TOUR.length - 1 ? '다음 안내' : '안내 끝') : !shamanMet && step < INTRO.length - 1 ? '다음' : !shamanMet ? '거점 안내 듣기' : '알겠어요'}</Button>
          {shamanMet && tour === null && <Button variant="outline" className={pixelBtn} onClick={() => setTour(0)}>거점 둘러보기 (안내)</Button>}
        </> : <>
          <DialogHeader><DialogTitle>부족 회관 · {count}/{TRIBE_MAX}명</DialogTitle><DialogDescription>"먹을 것만 넉넉하면 부족을 위해 뛰겠소."</DialogDescription></DialogHeader>
          <div className="flex items-start gap-3">
            <img src={mercArt} alt="떠돌이 용병" className="pixelated h-24 w-auto" />
            <div className="flex-1 space-y-1 text-xs">
              <p>부족민 힘: 공격·채집·방어·체력 모두 내 능력의 <b>{Math.round(tribeRatio(tribe) * 100)}%</b>{tribe?.starving ? ' (굶주림)' : ''}</p>
              <p className="text-muted-foreground">매시간 1명당 과일 1 + 구운/말린 고기 1을 창고에서 먹어요. 원정에서 쓰러지면 30분 부상.</p>
              {injured && <p className="text-destructive">부상 중 · {Math.ceil((tribe!.injuredUntil! - now) / 60000)}분 남음</p>}
            </div>
          </div>
          {injured && <Button className={pixelBtn} variant="destructive" disabled={!have(TRIBE_TREAT_COST, storage, backpack)} onClick={onTreat}>응급 치료 ({label(TRIBE_TREAT_COST)})</Button>}
          <div className="pixel-box space-y-1 bg-background p-2 text-xs"><b>새 부족민 영입</b><p>{hireCost ? label(hireCost) : '가득 찼어요'}</p></div>
          <Button className={pixelBtn} disabled={!hireCost || !have(hireCost, storage, backpack)} onClick={onHire}>{count + 1}번째 부족민 영입</Button>
          {count > 0 && <>
            <div className="pixel-box space-y-1 bg-background p-2 text-xs"><b>걷기 동행 {tribe?.escort ? '· 켜짐' : ''}</b><p>함께 걸으면 채집 속도 +30%, 맹수 기습 35% 차단·나머지 피해 절반.{expeditionBusy ? ' (원정 중에는 동행 불가)' : ''} 원정은 [원정] 탭에서 보내면 부족민이 대신 다녀와요.</p></div>
            <Button variant={tribe?.escort ? 'secondary' : 'default'} className={pixelBtn} disabled={injured} onClick={onEscort}>{tribe?.escort ? '동행 멈추기' : '함께 걷기'}</Button>
            <div className="pixel-box space-y-1 bg-background p-2 text-xs"><b>부족민 훈련 {tribe?.trainLevel ?? 0}/5</b><p>{trainCost ? label(trainCost) : '최고 단계'}</p></div>
            <Button variant="outline" className={pixelBtn} disabled={!trainCost || !have(trainCost, storage, backpack)} onClick={onTrain}>훈련하기 (능력 +3%)</Button>
          </>}
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
