import { Hourglass, Sparkles, Compass, MapPin } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { ContextualHelpButton } from './ContextualHelpButton';
import { EXPEDITION_FOOD_COUNT, expeditionLog, fmtRemaining, jobProgress, mapFragments, type Expedition, type ScoutTarget, type TimedJob } from '@/lib/survival/homeActivities';

/** Live real-time job card: shows remaining time or a claim button. */
export function JobCard({ title, job, now, claimLabel, onClaim }: { title: string; job: TimedJob; now: number; claimLabel: string; onClaim: () => void }) {
  const done = now >= job.readyAt;
  return (
    <div className={`pixel-frame p-2 text-xs ${done ? 'bg-primary/20' : 'bg-card'}`}>
      <div className="flex items-center gap-1.5">
        {done ? <Sparkles className="!h-5 !w-5 text-primary" /> : <Hourglass className="!h-5 !w-5" />}
        <b className="text-sm">{title}</b>
        <span className="ml-auto">{done ? '완료!' : `남은 시간 ${fmtRemaining(job.readyAt - now)}`}</span>
      </div>
      {done
        ? <button type="button" onClick={onClaim} className="pixel-btn mt-2 h-11 w-full bg-primary text-primary-foreground">{claimLabel}</button>
        : <Progress value={jobProgress(job, now) * 100} className="mt-2 h-2" />}
    </div>
  );
}

interface ExpProps {
  expedition: Expedition | null | undefined; report: ScoutTarget[] | undefined; now: number;
  exploredTotal: number; mark: number; foodOwned: number; canSend: boolean;
  onSend: () => void; onClaim: () => void; onPin: (t: ScoutTarget) => void;
}
/** Base expedition: send with outside-earned fuel, watch the log, collect rewards and tomorrow's scout report. */
export function ExpeditionPanel({ expedition, report, now, exploredTotal, mark, foodOwned, canSend, onSend, onClaim, onPin }: ExpProps) {
  const frags = mapFragments(exploredTotal, mark);
  const walked = Math.max(0, exploredTotal - mark) % 25;
  return (
    <div className="pixel-frame space-y-2 bg-card p-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5"><Compass className="!h-5 !w-5" /><b className="text-sm">원정대</b></div>
        <ContextualHelpButton
          title="부족 원정대"
          bullets={[
            "밖에서 실제 걸음을 누적하여 새로운 사냥터 지도 조각을 획득하세요.",
            "식량을 챙겨 원정대를 파견하면 고기·뼈·가죽 등의 자원을 자동으로 물어옵니다.",
            "귀환 후 정찰 보고서를 확인해 유용한 랜드마크를 나침반/지도에 등록하세요."
          ]}
        />
      </div>
      {expedition ? (
        <>
          <JobCard title="사냥터 원정" job={{ id: 'exp', ...expedition }} now={now} claimLabel="전리품 받기" onClaim={onClaim} />
          <ul className="space-y-0.5 border-l-2 border-primary/50 pl-2">
            {expeditionLog(expedition, now).map((l, i) => <li key={i}>{l}</li>)}
          </ul>
        </>
      ) : (
        <>
          <p className="text-muted-foreground">밖에서 걸어 새 지역을 밝히면 사냥터 지도 조각이 생겨요. 원정은 4시간 걸리고 고기·뼈·가죽·나뭇가지를 가져옵니다. 희귀 재료는 직접 사냥해야 해요.</p>
          <p>지도 조각 {frags}개 {frags < 1 && `(다음 조각까지 ${walked}/25 걸음)`} · 식량 {foodOwned}/{EXPEDITION_FOOD_COUNT}</p>
          <button type="button" disabled={!canSend || frags < 1 || foodOwned < EXPEDITION_FOOD_COUNT} onClick={onSend} className="pixel-btn h-11 w-full bg-primary text-primary-foreground disabled:opacity-40">원정대 보내기</button>
        </>
      )}
      {report && report.length > 0 && (
        <div className="space-y-1">
          <b>정찰 보고서 · 내일의 목표</b>
          {report.map((t, i) => (
            <button key={i} type="button" onClick={() => onPin(t)} className="pixel-btn flex min-h-11 w-full items-center gap-2 bg-background px-2 text-left">
              <MapPin className="!h-4 !w-4 shrink-0" /><span className="flex-1">{t.bearing}쪽 {t.distanceM}m · {t.label}</span><span className="text-primary">즐겨찾기</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
