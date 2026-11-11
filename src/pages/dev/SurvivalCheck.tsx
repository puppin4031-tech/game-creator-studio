import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, RefreshCw, ArrowLeft, Hammer } from 'lucide-react';
import { runSurvivalSelfCheck, summarizeChecks, type CheckResult } from '@/lib/survival/selfCheck';
import { SPRITE_META, type SpriteKey } from '@/lib/survival/spriteMeta';
import CharacterSprite from '@/components/survival/CharacterSprite';

const spriteModules = import.meta.glob('../../assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const spriteUrl = (key: SpriteKey) =>
  Object.entries(spriteModules).find(([p]) => p.endsWith(`/${key}.png`))?.[1];

function SpriteGallery() {
  const keys = Object.keys(SPRITE_META) as SpriteKey[];
  return (
    <div className="grid grid-cols-6 gap-2">
      {keys.map((k) => (
        <div key={k} className="flex flex-col items-center gap-1 rounded border border-border bg-card p-1.5">
          {k === 'char-hunter' ? <CharacterSprite height={32} /> : <img src={spriteUrl(k)} alt={k} className="pixelated h-8 w-8 object-contain" />}
          <span className="w-full truncate text-center text-[9px] text-muted-foreground">{k}</span>
        </div>
      ))}
    </div>
  );
}

function ResultRow({ r }: { r: CheckResult }) {
  return (
    <div className="flex items-start gap-2 rounded border border-border bg-card px-3 py-2">
      {r.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      ) : (
        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium">{r.label}</p>
        {r.detail && <p className="mt-0.5 break-words text-xs text-destructive">{r.detail}</p>}
      </div>
    </div>
  );
}

export default function SurvivalCheck() {
  const [runAt, setRunAt] = useState(() => Date.now());
  const results = useMemo(() => runSurvivalSelfCheck(), [runAt]);
  const summary = summarizeChecks(results);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-xl bg-background px-4 pb-10 pt-4">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/play/survival-sim" className="flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> 생존 게임
        </Link>
        <button
          onClick={() => setRunAt(Date.now())}
          className="flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm"
        >
          <RefreshCw className="h-4 w-4" /> 다시 검사
        </button>
      </div>

      <h1 className="font-pixel text-lg">생존 모듈 점검</h1>
      <p className="mt-1 text-xs text-muted-foreground">
        아이템·레시피·월드 생성 등 게임 규칙 데이터가 서로 올바르게 연결됐는지 검사합니다.
      </p>

      <div
        className={`mt-4 rounded border px-3 py-2 text-sm font-medium ${
          summary.failed === 0
            ? 'border-green-600/40 bg-green-600/10 text-green-700 dark:text-green-400'
            : 'border-destructive/40 bg-destructive/10 text-destructive'
        }`}
      >
        {summary.failed === 0
          ? `모든 검사 통과 (${summary.passed}/${summary.total})`
          : `실패 ${summary.failed}건 / 전체 ${summary.total}건`}
      </div>

      <div className="mt-4 space-y-2">
        {results.map((r) => (
          <ResultRow key={r.id} r={r} />
        ))}
      </div>

      <h2 className="font-pixel mt-8 flex items-center gap-2 text-base">
        <Hammer className="h-4 w-4" /> 스프라이트 ({Object.keys(SPRITE_META).length}종)
      </h2>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        깨진 그림이나 배경이 남은 그림이 있는지 눈으로 확인하는 목록입니다.
      </p>
      <SpriteGallery />
    </div>
  );
}
