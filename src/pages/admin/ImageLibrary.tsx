import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Palette } from 'lucide-react';
import { toast } from 'sonner';

type ImageEntry = { name: string; path: string; url: string; category: string };

// Bundled image files and CDN asset pointers under src/assets
const bundled = import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,webp,gif,svg}', { eager: true, import: 'default' }) as Record<string, string>;
const pointers = import.meta.glob('/src/assets/**/*.{png,jpg,jpeg,webp,gif}.asset.json', { eager: true, import: 'default' }) as Record<string, { url: string }>;

function categoryOf(path: string, name: string): string {
  const dir = path.replace('/src/assets/', '').split('/').slice(0, -1).join('/');
  const prefix = name.split(/[-_.]/)[0];
  const group: Record<string, string> = {
    hunter: '주인공',
    tribe: '부족민',
    item: '아이템',
    node: '자연물·노드',
    base: '거점·건물',
    wall: '방벽·울타리',
    npc: 'NPC',
    beast: '맹수',
    mob: '맹수·공룡',
    pet: '펫',
    dino: '공룡',
  };
  const label = group[prefix] ?? prefix;
  return dir ? `${dir} / ${label}` : `공통 / ${label}`;
}

const ENTRIES: ImageEntry[] = [
  ...Object.entries(bundled).map(([path, url]) => ({ path, url, name: path.split('/').pop() ?? path })),
  ...Object.entries(pointers).map(([path, p]) => ({ path, url: p.url, name: (path.split('/').pop() ?? path).replace('.asset.json', '') })),
]
  .map((e) => ({ ...e, category: categoryOf(e.path, e.name) }))
  .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

async function downloadImage(e: ImageEntry) {
  try {
    const res = await fetch(e.url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href; a.download = e.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 30_000);
    toast.success(`${e.name} 다운로드를 시작했습니다.`);
  } catch {
    toast.error(`${e.name} 다운로드에 실패했어요.`);
  }
}

function getStudioTargetKey(name: string): string {
  const clean = name.replace(/\.[^.]+$/, '');
  if (clean.startsWith('char-hunter') || clean.startsWith('hunter')) return 'hunter';
  if (clean.startsWith('tribe')) return 'tribe';
  if (clean.startsWith('mob-')) return `mob:${clean.replace('mob-', '')}`;
  if (clean.startsWith('pet-') || clean.startsWith('dino-')) return `pet:${clean.replace(/^(pet-|dino-)/, '')}`;
  return clean;
}

export default function ImageLibrary() {
  const navigate = useNavigate();
  const [cat, setCat] = useState('전체');
  const [q, setQ] = useState('');
  const cats = useMemo(() => ['전체', ...Array.from(new Set(ENTRIES.map((e) => e.category)))], []);
  const list = ENTRIES.filter((e) => (cat === '전체' || e.category === cat) && e.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">게임 이미지 보관함</h1>
        <p className="text-sm text-muted-foreground">
          총 {ENTRIES.length}개. [스튜디오 편집] 버튼을 누르면 스프라이트 스튜디오에서 바로 불러와 배경 투명화·크롭·수정 후 게임에 즉시 적용할 수 있습니다.
        </p>
      </div>
      <input
        className="min-h-11 w-full rounded-md border bg-background px-3"
        placeholder="파일 이름 검색 (예: flint, hunter, mob, campfire)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`min-h-9 rounded-full border px-3 text-xs ${c === cat ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
          >
            {c} ({c === '전체' ? ENTRIES.length : ENTRIES.filter((e) => e.category === c).length})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {list.map((e) => (
          <div key={e.path} className="flex flex-col gap-2 rounded-lg border bg-card p-2.5">
            <a
              href={e.url}
              target="_blank"
              rel="noreferrer"
              className="flex aspect-square items-center justify-center overflow-hidden rounded bg-muted/60 p-1"
            >
              <img
                src={e.url}
                alt={e.name}
                loading="lazy"
                className="max-h-full max-w-full object-contain [image-rendering:pixelated]"
              />
            </a>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold" title={e.path}>{e.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">{e.category}</p>
            </div>
            <div className="flex gap-1.5 mt-auto pt-1">
              <button
                onClick={() =>
                  navigate(
                    `/admin/sprites?target=${encodeURIComponent(getStudioTargetKey(e.name))}&editUrl=${encodeURIComponent(e.url)}`
                  )
                }
                className="flex-1 flex min-h-9 items-center justify-center gap-1 rounded bg-primary text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                title="스프라이트 스튜디오에서 불러와 수정"
              >
                <Palette className="!h-3.5 !w-3.5" /> 스튜디오 편집
              </button>
              <button
                onClick={() => downloadImage(e)}
                className="flex min-h-9 w-9 items-center justify-center rounded border bg-card text-xs text-foreground hover:bg-muted transition-colors"
                title="PNG 다운로드"
              >
                <Download className="!h-3.5 !w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
