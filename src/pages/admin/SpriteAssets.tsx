import { useEffect, useState, useId } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Upload, Loader2, Trash2, Wand2, Check, RefreshCw, SlidersHorizontal, Image as ImageIcon, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import SpriteAnimator from '@/components/survival/SpriteAnimator';
import {
  CHARACTER_ACTIONS,
  SPRITE_ACTION_LABELS,
  SPRITE_BUCKET,
  useSpriteAnimations,
  updateLocalAnimationCache,
  clearAnimationCache,
  type SpriteAction,
  type SpriteAnimation,
} from '@/hooks/useSpriteAnimations';
import {
  normalizeSpriteSheet,
  type NormalizerOptions,
  type NormalizerResult,
} from '@/utils/spriteNormalizer';
import {
  saveSpriteToLocalDb,
  deleteSpriteFromLocalDb,
} from '@/utils/spriteStorage';

import { CREATURES } from '@/lib/survival/entities';
import { TRIBE_CLASS_LIST } from '@/data/tribeClasses';
import { useCustomCatalog } from '@/hooks/useCustomCatalog';
import TribeSprite from '@/components/survival/TribeSprite';
import { getBuiltinMobSprite, PREHISTORIC_MOBS } from '@/utils/mobSpriteFactory';
import { SPRITE_META, type SpriteKey } from '@/lib/survival/spriteMeta';

// Bundled image assets under src/assets/survival/
const bundledSprites = import.meta.glob('/src/assets/survival/*.png', { eager: true, import: 'default' }) as Record<string, string>;
export const ALL_PRESET_SPRITES = Object.keys(bundledSprites)
  .map(p => p.replace('/src/assets/survival/', '').replace('.png', ''))
  .sort();

export const getBundledSpriteUrl = (key: string): string | undefined => {
  let mappedKey = key;
  if (key === 'hunter' || key.startsWith('hunter')) mappedKey = 'char-hunter';
  else if (key === 'tribe' || key === 'tribe:gatherer') mappedKey = 'char-gatherer';
  else if (key === 'tribe:scout') mappedKey = 'char-scout';
  else if (key === 'tribe:tank') mappedKey = 'char-hunter';
  else if (key === 'tribe:shaman') mappedKey = 'char-shaman';
  else if (key.startsWith('pet:')) mappedKey = 'item-dino-egg';

  return bundledSprites[`/src/assets/survival/${mappedKey}.png`] ?? bundledSprites[`/src/assets/survival/${key}.png`];
};

const TRIBE_TARGETS = [
  { key: 'tribe', label: '부족민 (공통 기본)' },
  ...TRIBE_CLASS_LIST.map(c => ({
    key: `tribe:${c.id}`,
    label: `부족 용병 · ${c.icon} ${c.name} (${c.role})`,
  })),
];

const DINO_PET_TARGETS = [
  { key: 'pet:baby_raptor', label: '공룡 펫 · 🦖 아기 랩터' },
  { key: 'pet:baby_stego', label: '공룡 펫 · 🦕 아기 스테고' },
  { key: 'pet:baby_ptera', label: '공룡 펫 · 🦅 아기 프테라' },
  { key: 'pet:mini_triceratops', label: '공룡 펫 · 🦏 아기 트리케라톱스' },
];

const BUILDING_TARGETS = [
  { key: 'base-campfire', label: '🏕️ 거점 · 캠프파이어 (모닥불)' },
  { key: 'base-hut', label: '🏕️ 거점 · 원시 움막 (숙소)' },
  { key: 'base-cave', label: '🏕️ 거점 · 동굴 거처' },
  { key: 'base-outpost', label: '🏕️ 거점 · 개척 전초기지' },
  { key: 'base-tribal-hall', label: '🏕️ 거점 · 부족 대회당' },
  { key: 'base-village-bg', label: '🏕️ 거점 · 원시 마을 전경 배경' },
  { key: 'dolmen-shrine', label: '⛩️ 제단 · 고인돌 성소' },
  { key: 'wall-branch-fence', label: '🪵 방벽 · 나뭇가지 울타리' },
  { key: 'wall-stone-fence', label: '🪨 방벽 · 돌 울타리' },
  { key: 'wall-wood-pillar', label: '🪵 방벽 · 목재 기둥' },
  { key: 'wall-marble-wall', label: '🏛️ 방벽 · 대리석 성벽' },
];

const NODE_TARGETS = [
  { key: 'node-oak', label: '🌳 자연물 · 참나무 (단단한 목재)' },
  { key: 'node-pine', label: '🌲 자연물 · 소나무 (송진 채취)' },
  { key: 'node-bush', label: '🌿 자연물 · 야생 덤불 (섬유·나뭇가지)' },
  { key: 'node-apple', label: '🍎 자연물 · 사과나무' },
  { key: 'node-pear', label: '🍐 자연물 · 돌배나무' },
  { key: 'node-flint', label: '🪨 채집 노드 · 부싯돌 바위' },
  { key: 'node-quartz', label: '💎 채집 노드 · 석영 광맥' },
  { key: 'node-obsidian', label: '🌋 채집 노드 · 흑요석 바위' },
  { key: 'node-hematite', label: '🔴 채집 노드 · 적철석 광맥' },
  { key: 'node-jade', label: '🟢 채집 노드 · 옥 광맥' },
  { key: 'node-herb', label: '🌿 채집 노드 · 약초 군락' },
  { key: 'node-clay', label: '🏺 채집 노드 · 점토 채취장' },
  { key: 'node-soil', label: '🌱 채집 노드 · 비옥한 흙더미' },
  { key: 'node-bones', label: '🦴 채집 노드 · 고대 뼈 무덤' },
  { key: 'node-branch', label: '🪵 채집 노드 · 나뭇가지 더미' },
];

const GEAR_TARGETS = [
  { key: 'item-hand-axe', label: '🪓 도구 · 주먹도끼' },
  { key: 'item-stone-pickaxe', label: '⛏️ 도구 · 돌곡괭이' },
  { key: 'item-obsidian-pickaxe', label: '⛏️ 도구 · 흑요석 곡괭이' },
  { key: 'item-flint-hatchet', label: '🪓 도구 · 부싯돌 손도끼' },
  { key: 'item-obsidian-axe', label: '🪓 도구 · 흑요석 도끼' },
  { key: 'item-wood-mallet', label: '🔨 도구 · 나무 메' },
  { key: 'item-bone-pick', label: '⛏️ 도구 · 뼈 곡괭이' },
  { key: 'item-digging-stick', label: '⛏️ 도구 · 토기 삽' },
  { key: 'item-bone-dagger', label: '🗡️ 무기 · 뼈 단검' },
  { key: 'item-flint-spear', label: '🗡️ 무기 · 부싯돌 창 (투창)' },
  { key: 'item-obsidian-spear', label: '🗡️ 무기 · 흑요석 창' },
  { key: 'item-stone-maul', label: '🔨 무기 · 돌 망치' },
  { key: 'item-wooden-club', label: '🪵 무기 · 나무 몽둥이' },
  { key: 'item-sling', label: '🎯 무기 · 새총 · 물매' },
  { key: 'item-bone-bow', label: '🏹 무기 · 원거리 뼈 활' },
  { key: 'item-arrow', label: '🏹 탄환 · 뼈 화살' },
  { key: 'item-sling-stone', label: '🎯 탄환 · 물매용 둥근 돌멩이' },
  { key: 'item-bark-vest', label: '🛡️ 방어구 · 나무껍질 조끼' },
  { key: 'item-bone-plate', label: '🛡️ 방어구 · 뼈 흉갑' },
  { key: 'item-hide-armor', label: '🛡️ 방어구 · 가죽 갑옷' },
  { key: 'item-fur-cloak', label: '🛡️ 방어구 · 늑대 털망토' },
  { key: 'item-bone-charm', label: '✨ 장신구 · 뼈 부적' },
  { key: 'item-quartz-charm', label: '✨ 장신구 · 석영 부적' },
  { key: 'item-jade-amulet', label: '✨ 장신구 · 옥 목걸이' },
  { key: 'item-bronze-sword', label: '⚔️ 문명 무기 · 청동 검' },
  { key: 'item-iron-sword', label: '⚔️ 문명 무기 · 철제 검' },
  { key: 'item-steel-sword', label: '⚔️ 문명 무기 · 강철 검' },
  { key: 'item-bronze-axe', label: '🪓 문명 도구 · 청동 도끼' },
  { key: 'item-iron-axe', label: '🪓 문명 도구 · 철제 도끼' },
  { key: 'item-steel-axe', label: '🪓 문명 도구 · 강철 도끼' },
  { key: 'item-bronze-pickaxe', label: '⛏️ 문명 도구 · 청동 곡괭이' },
  { key: 'item-iron-pickaxe', label: '⛏️ 문명 도구 · 철제 곡괭이' },
  { key: 'item-steel-pickaxe', label: '⛏️ 문명 도구 · 강철 곡괭이' },
  { key: 'item-torch', label: '🔥 보조 무기 · 원시 횃불' },
  { key: 'item-stone-shield', label: '🛡️ 방어구 · 돌 방패' },
  { key: 'item-leather-shield', label: '🛡️ 방어구 · 가죽 방패' },
  { key: 'item-bronze-shield', label: '🛡️ 방어구 · 청동 방패' },
  { key: 'item-iron-shield', label: '🛡️ 방어구 · 철제 방패' },
  { key: 'item-bronze-spear', label: '🗡️ 무기 · 청동 창' },
  { key: 'item-iron-spear', label: '🗡️ 무기 · 철제 창' },
  { key: 'item-steel-spear', label: '🗡️ 무기 · 강철 창' },
  { key: 'item-obsidian-dagger', label: '🗡️ 무기 · 흑요석 단검' },
  { key: 'item-bone-harpoon', label: '🗡️ 무기 · 뼈 작살' },
  { key: 'item-composite-bow', label: '🏹 무기 · 명품 합성궁' },
  { key: 'item-heavy-club', label: '🪵 무기 · 돌가시 몽둥이' },
  { key: 'item-stone-chisel', label: '⛏️ 도구 · 돌 끌' },
  { key: 'item-bronze-knife', label: '🔪 도구 · 청동 손칼' },
  { key: 'item-iron-knife', label: '🔪 도구 · 철제 손칼' },
  { key: 'item-bone-needle', label: '🧵 도구 · 뼈 바늘' },
  { key: 'item-fishing-rod', label: '🎣 생존 도구 · 원시 낚싯대' },
];

const ITEM_TARGETS = [
  { key: 'item-sinew', label: '🧵 재료 · 동물 힘줄' },
  { key: 'item-fossil', label: '🐚 보물 · 암모나이트 화석' },
  { key: 'item-amber', label: '🍯 보물 · 호박 보석' },
  { key: 'item-ruby', label: '💎 보석 · 타오르는 루비' },
  { key: 'item-sapphire', label: '💎 보석 · 차가운 사파이어' },
  { key: 'item-emerald', label: '💎 보석 · 생명의 에메랄드' },
  { key: 'item-poison-gland', label: '☠️ 재료 · 맹독샘' },
  { key: 'item-dragon-scale', label: '🐉 보물 · 용의 비늘' },
  { key: 'item-jerky', label: '🥩 식량 · 말린 고기 (육포)' },
  { key: 'item-spring-water', label: '💧 식수 · 맑은 샘물' },
  { key: 'item-grindstone', label: '🪨 도구 재료 · 원시 숫돌' },
  { key: 'item-mortar-pestle', label: '🥣 가공 도구 · 약초 절구' },
  { key: 'item-healing-ointment', label: '🌿 의약품 · 상처 치료 연고' },
  { key: 'item-antidote', label: '🧪 의약품 · 해독 물약' },
  { key: 'item-flint', label: '🪨 재료 · 부싯돌' },
  { key: 'item-branch', label: '🪵 재료 · 나뭇가지' },
  { key: 'item-log', label: '🪵 재료 · 통나무' },
  { key: 'item-fiber', label: '🧶 재료 · 식물 섬유' },
  { key: 'item-bone', label: '🦴 재료 · 뼈' },
  { key: 'item-hide', label: '🧥 재료 · 날가죽' },
  { key: 'item-tusk', label: '🦣 재료 · 엄니 (상아)' },
  { key: 'item-clay', label: '🏺 재료 · 점토' },
  { key: 'item-soil', label: '🌱 재료 · 흙' },
  { key: 'item-herb', label: '🌿 재료 · 약초' },
  { key: 'item-resin', label: '🍯 재료 · 송진' },
  { key: 'item-bitumen', label: '🖤 재료 · 천연 역청 (아스팔트)' },
  { key: 'item-coal', label: '⬛ 재료 · 석탄' },
  { key: 'item-limestone', label: '⬜ 재료 · 석회석' },
  { key: 'item-sulfur', label: '💛 재료 · 유황' },
  { key: 'item-obsidian', label: '🖤 광물 · 흑요석' },
  { key: 'item-quartz', label: '💎 광물 · 석영' },
  { key: 'item-ochre', label: '🎨 광물 · 황토 안료' },
  { key: 'item-jade', label: '🟢 광물 · 옥' },
  { key: 'item-copper-ore', label: '🟤 광물 · 구리 원석' },
  { key: 'item-tin-ore', label: '⚪ 광물 · 주석 원석' },
  { key: 'item-silver-ore', label: '🥈 광물 · 은광석' },
  { key: 'item-gold-ore', label: '🥇 광물 · 사금·금광석' },
  { key: 'item-magnetite', label: '🧲 광물 · 자철석' },
  { key: 'item-mercury', label: '💧 광물 · 진사·수은' },
  { key: 'item-meteor-shard', label: '🌠 광물 · 운석 파편' },
  { key: 'item-mana-stone', label: '🔮 광물 · 고대 마력석' },
  { key: 'item-cordage', label: '🧵 가공 · 노끈' },
  { key: 'item-fur', label: '🧥 가공 · 털가죽' },
  { key: 'item-leather', label: '🥋 가공 · 가죽' },
  { key: 'item-clay-pot', label: '🏺 가공 · 토기' },
  { key: 'item-copper-ingot', label: '🧱 가공 · 구리 주괴' },
  { key: 'item-bronze-ingot', label: '🧱 가공 · 청동 주괴' },
  { key: 'item-steel-ingot', label: '🧱 가공 · 강철 주괴' },
  { key: 'item-charcoal', label: '🪵 가공 · 목탄 (가공 숯)' },
  { key: 'item-salve', label: '🧪 가공 · 약초 연고' },
  { key: 'item-ancient-fang', label: '🦷 보물 · 고대의 송곳니' },
  { key: 'item-dino-egg', label: '🥚 보물 · 신비한 픽셀 공룡 알' },
  { key: 'item-frost-shard', label: '❄️ 보물 · 빙결석 조각' },
  { key: 'item-frost-pelt', label: '❄️ 보물 · 혹한의 모피' },
  { key: 'item-prime-pelt', label: '👑 보물 · 우두머리 털가죽' },
  { key: 'item-alpha-heart', label: '💖 보물 · 야수의 심장' },
  { key: 'item-taming-snare', label: '🪤 도구 · 가죽 올가미' },
  { key: 'item-beast-bait', label: '🥩 도구 · 특제 미끼' },
  { key: 'item-tome-primal-strike', label: '📜 비전서 · 원시 일격' },
  { key: 'item-tome-iron-skin', label: '📜 비전서 · 바위 피부' },
  { key: 'item-tome-beast-mastery', label: '📜 비전서 · 야수 교감' },
  { key: 'item-berry', label: '🍓 식량 · 산딸기' },
  { key: 'item-apple', label: '🍎 식량 · 사과' },
  { key: 'item-pear', label: '🍐 식량 · 돌배' },
  { key: 'item-coconut', label: '🥥 식량 · 야자 열매' },
  { key: 'item-raw-meat', label: '🥩 식량 · 날고기' },
  { key: 'item-cooked-meat', label: '🍖 식량 · 구운 고기' },
  { key: 'item-dried-fruit', label: '🍎 식량 · 말린 과일' },
  { key: 'item-dino-tail-steak', label: '🥩 식량 · 우두머리 스테이크 정식' },
  { key: 'item-sweet-fruit-skewers', label: '🍡 식량 · 달콤 과일 구이 꼬치' },
  { key: 'item-bone-stew', label: '🍲 식량 · 진한 뼈 고기 스튜' },
  { key: 'item-spice-roast', label: '🍗 식량 · 향신료 통고기 구이' },
  { key: 'item-sacred-bread', label: '🍞 식량 · 생명의 떡' },
  { key: 'item-purify-dew', label: '💧 식량 · 정화의 이슬' },
  { key: 'item-sacred-essence', label: '✨ 비약 · 성스러운 정수' },
  { key: 'item-wild-spice', label: '🌿 조미료 · 야생 향신초' },
  { key: 'item-rock-salt', label: '🧂 조미료 · 암염 결정' },
  { key: 'item-pepper-berry', label: '🌶️ 조미료 · 매운 후추열매' },
  { key: 'item-shell', label: '🐚 화폐 · 조개 화폐' },
  { key: 'bundle-drop', label: '📦 드롭 · 전리품 보따리' },
];

const MOB_ACTIONS: SpriteAction[] = ['idle', 'attack'];
const PET_ACTIONS: SpriteAction[] = ['idle', 'attack', 'walk'];
const TRIBE_ACTIONS: SpriteAction[] = ['walk', 'attack', 'chop', 'gather'];
const OBJECT_ACTIONS: SpriteAction[] = ['idle'];

const TRIBE_ACTION_TITLE: Partial<Record<SpriteAction, string>> = {
  walk: '걷기 모션 (이동·대기 겸용)',
  attack: '공격 액션 모션 (전투·무기 휘두르기)',
  chop: '벌목 액션 모션 (장작패기·도끼질)',
  gather: '채집 액션 모션 (채광·열매 수집)',
};

function formatErrorMessage(e: unknown): string {
  if (!e) return '알 수 없는 오류';
  if (typeof e === 'string') return e;
  const anyE = e as Record<string, unknown>;
  const msg = String(anyE.message || anyE.error_description || anyE.details || anyE.hint || e);
  if (msg.includes('survival_sprite_animations_action_check') || (msg.includes('check constraint') && msg.includes('action'))) {
    return 'DB 액션 제약조건 오류: 데이터베이스에 해당 액션이 허용 목록에 없습니다. (최신 SQL 마이그레이션이 적용되었습니다)';
  }
  if (msg.includes('survival_sprite_animations_fps_check') || (msg.includes('check constraint') && msg.includes('fps'))) {
    return 'DB FPS 제약조건 오류: fps 값이 허용 범위를 초과했습니다.';
  }
  if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('has_role') || msg.includes('Forbidden') || msg.includes('42501')) {
    return '권한 안내: Supabase 계정에 main_admin 권한이 없더라도, 로컬 브라우저(IndexedDB)에 안전하게 저장되어 새로고침 후에도 유지됩니다.';
  }
  return msg;
}

export function ScaleControl({ target }: { target: string }) {
  const qc = useQueryClient();
  const { data } = useSpriteAnimations(target);
  const [scale, setScale] = useState(1.0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.scale) setScale(data.scale);
  }, [data?.scale]);

  const saveScale = async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from('survival_sprite_animations').upsert(
        {
          character_key: target,
          action: 'scale',
          image_path: 'scale',
          frame_count: 1,
          fps: Math.round(scale * 100),
          updated_by: u.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'character_key,action' },
      );
      if (error) throw error;
      try {
        localStorage.setItem(`survival_scale_${target}`, String(scale));
      } catch {}
      clearAnimationCache(target);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`크기 비율을 ${scale.toFixed(1)}배로 저장했어요.`);
    } catch (e) {
      try {
        localStorage.setItem(`survival_scale_${target}`, String(scale));
        toast.info(`로컬 브라우저에 크기 비율(${scale.toFixed(1)}배)이 저장되었습니다.`);
      } catch {
        toast.error(`저장 실패: ${formatErrorMessage(e)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card/70 p-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <b className="text-sm font-semibold">스프라이트 크기 비율 (스케일)</b>
          <span className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
            {scale.toFixed(1)}배 ({Math.round(scale * 100)}%)
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          기본 크기 대비 인게임 렌더링 배율입니다. 거대 몬스터나 보스는 1.5~2.5배, 소형 몹/펫/소품은 0.6~0.9배로 설정하세요.
        </p>
      </div>
      <div className="flex w-full items-center gap-3 sm:w-80">
        <span className="text-xs text-muted-foreground">0.5x</span>
        <Slider
          min={0.5}
          max={3.0}
          step={0.1}
          value={[scale]}
          onValueChange={([v]) => setScale(v)}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground">3.0x</span>
        <Button size="sm" onClick={saveScale} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : '비율 저장'}
        </Button>
      </div>
    </div>
  );
}

export function ActionCard({
  action,
  CHARACTER,
  autoLoadUrl,
}: {
  action: SpriteAction;
  CHARACTER: string;
  autoLoadUrl?: string;
}) {
  const qc = useQueryClient();
  const fileInputId = useId();
  const { data } = useSpriteAnimations(CHARACTER);
  const current = data?.[action] ?? (action === 'pick_nose' ? data?.nose_pick : action === 'nose_pick' ? data?.pick_nose : undefined);

  const [rawFile, setRawFile] = useState<File | null>(null);
  const [normalizedResult, setNormalizedResult] = useState<NormalizerResult | null>(null);
  const [normalizing, setNormalizing] = useState(false);

  // Normalizer configuration options
  const isMob = CHARACTER.startsWith('mob:');
  const mobSpecies = isMob ? CHARACTER.replace('mob:', '') : '';
  let builtinMob: ReturnType<typeof getBuiltinMobSprite> | null = null;
  if (isMob) {
    try {
      builtinMob = getBuiltinMobSprite(mobSpecies, action === 'attack' ? 'attack' : 'idle');
    } catch {
      builtinMob = null;
    }
  }

  const isObject = !CHARACTER.startsWith('hunter') && !CHARACTER.startsWith('tribe') && !CHARACTER.startsWith('pet:') && !isMob;
  const objectMeta = isObject ? (SPRITE_META as Record<string, { w: number; h: number }>)[CHARACTER] : undefined;
  const targetCellSize = isMob ? (builtinMob?.cellWidth || 64) : (objectMeta ? Math.max(objectMeta.w, objectMeta.h) : 48);

  const [autoChroma, setAutoChroma] = useState(true);
  const [bgMode, setBgMode] = useState<'auto' | 'hot_pink' | 'white'>('auto');
  const [tolerance, setTolerance] = useState(25);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [frames, setFrames] = useState(isObject ? 1 : 4);
  const [fps, setFps] = useState(isObject ? 1 : 8);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (current) {
      setFrames(current.frame_count);
      setFps(current.fps);
    } else if (builtinMob) {
      setFrames(builtinMob.frames);
      setFps(builtinMob.fps);
    } else if (isObject) {
      setFrames(1);
      setFps(1);
    }
  }, [current, builtinMob?.frames, builtinMob?.fps, isObject]);

  // Run auto-normalizer when rawFile or options change
  useEffect(() => {
    if (!rawFile) {
      setNormalizedResult(null);
      return;
    }
    let canceled = false;
    setNormalizing(true);

    const normalizerOpts: Partial<NormalizerOptions> = {
      frameCount: frames,
      cellWidth: targetCellSize,
      cellHeight: targetCellSize,
      removeBackground: autoChroma,
      bgMode,
      tolerance,
      baselinePadding: isObject ? 0 : 2,
    };

    normalizeSpriteSheet(rawFile, normalizerOpts)
      .then(res => {
        if (!canceled) {
          setNormalizedResult(res);
          setFrames(res.frameCount);
        }
      })
      .catch(err => {
        if (!canceled) {
          console.warn('[ActionCard] Normalization error:', err);
          toast.error(`이미지 규격화 처리 오류: ${err instanceof Error ? err.message : err}`);
        }
      })
      .finally(() => {
        if (!canceled) setNormalizing(false);
      });

    return () => {
      canceled = true;
    };
  }, [rawFile, frames, autoChroma, bgMode, tolerance, targetCellSize, isObject]);

  // Bundled static asset fallback for objects or built-ins
  const bundledUrl = getBundledSpriteUrl(CHARACTER);
  const displaySrc = normalizedResult?.previewUrl ?? current?.url ?? (isMob ? builtinMob?.url : bundledUrl);
  const isUsingBuiltin = !normalizedResult && !current && (!!builtinMob || !!bundledUrl);

  // Auto-load if autoLoadUrl query param is present and no file is loaded yet
  useEffect(() => {
    if (autoLoadUrl && !rawFile && !normalizedResult) {
      loadExistingIntoEditor(autoLoadUrl);
    }
  }, [autoLoadUrl]);

  // Load existing or built-in sprite directly into editor!
  const loadExistingIntoEditor = async (overrideUrl?: string) => {
    const src = overrideUrl || displaySrc;
    if (!src) {
      toast.error('불러올 기본/내장 이미지가 없습니다.');
      return;
    }
    try {
      setNormalizing(true);
      const res = await fetch(src);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('gif') ? 'gif' : 'png';
      const safeName = `${CHARACTER.replace(/[:/]/g, '-')}-${action}.${ext}`;
      const file = new File([blob], safeName, { type: blob.type || 'image/png' });
      setRawFile(file);
      toast.success('기존 이미지를 편집기에 불러왔습니다. 프레임·배경투명화·크기를 조절하고 저장하세요.');
    } catch (e) {
      console.warn('loadExisting error:', e);
      toast.error(`이미지 불러오기 실패: ${e instanceof Error ? e.message : e}`);
    } finally {
      setNormalizing(false);
    }
  };

  // Download current sprite image
  const downloadCurrentSprite = async () => {
    const src = displaySrc;
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${CHARACTER.replace(/[:/]/g, '-')}-${action}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 20000);
      toast.success('스프라이트 이미지를 다운로드했습니다.');
    } catch {
      toast.error('다운로드에 실패했습니다.');
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const uploadBlob = normalizedResult?.blob ?? rawFile;
      let path = current?.image_path;
      // DB constraint allows 'pick_nose'
      const dbAction = (action === 'nose_pick' ? 'pick_nose' : action);

      if (uploadBlob) {
        path = `${CHARACTER.replace(/[:/]/g, '-')}/${dbAction}-${Date.now()}.png`;
        const { error: storageError } = await supabase.storage
          .from(SPRITE_BUCKET)
          .upload(path, uploadBlob, { contentType: 'image/png', upsert: true });

        if (storageError) {
          console.warn('[ActionCard] Cloud storage upload failed:', storageError);
          // If cloud fails, still save to IndexedDB as guaranteed resilient local fallback
          await saveSpriteToLocalDb(CHARACTER, action, uploadBlob, { frameCount: frames, fps });
          if (action === 'pick_nose' || action === 'nose_pick') {
            await saveSpriteToLocalDb(CHARACTER, 'pick_nose', uploadBlob, { frameCount: frames, fps });
            await saveSpriteToLocalDb(CHARACTER, 'nose_pick', uploadBlob, { frameCount: frames, fps });
          }
          throw storageError;
        }
      }

      if (!path) {
        toast.error('스프라이트 이미지를 업로드해 주세요.');
        return;
      }

      const { data: u } = await supabase.auth.getUser();
      const { error: dbError } = await supabase.from('survival_sprite_animations').upsert(
        {
          character_key: CHARACTER,
          action: dbAction,
          image_path: path,
          frame_count: frames,
          fps,
          updated_by: u.user?.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'character_key,action' },
      );

      if (dbError) throw dbError;

      // Also persist normalized blob to IndexedDB for offline / instant fast boot cache
      if (uploadBlob) {
        await saveSpriteToLocalDb(CHARACTER, action, uploadBlob, { frameCount: frames, fps });
        if (action === 'pick_nose' || action === 'nose_pick') {
          await saveSpriteToLocalDb(CHARACTER, 'pick_nose', uploadBlob, { frameCount: frames, fps });
          await saveSpriteToLocalDb(CHARACTER, 'nose_pick', uploadBlob, { frameCount: frames, fps });
        }
      }

      // Cleanup old file from cloud storage if path changed
      if (uploadBlob && current?.image_path && current.image_path !== path && !current.image_path.startsWith('local://')) {
        await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      }

      // Invalidate memory and react query cache with cache-busting
      clearAnimationCache(CHARACTER);
      const publicUrl = supabase.storage.from(SPRITE_BUCKET).getPublicUrl(path).data?.publicUrl;
      const cacheBustUrl = publicUrl ? `${publicUrl}?v=${Date.now()}` : (normalizedResult?.previewUrl ?? '');
      
      const newAnim: SpriteAnimation = {
        id: `updated-${CHARACTER}-${action}`,
        character_key: CHARACTER,
        action,
        image_path: path,
        frame_count: frames,
        fps,
        url: cacheBustUrl,
      };
      updateLocalAnimationCache(CHARACTER, action, newAnim);

      setRawFile(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success(`✅ ${SPRITE_ACTION_LABELS[action] || action} 스프라이트가 성공적으로 저장되었습니다.`);
    } catch (e) {
      if (normalizedResult?.blob || rawFile) {
        const localBlob = normalizedResult?.blob ?? rawFile!;
        await saveSpriteToLocalDb(CHARACTER, action, localBlob, { frameCount: frames, fps });
        clearAnimationCache(CHARACTER);
        await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
        toast.warning(`⚠️ 클라우드 저장 실패 (${formatErrorMessage(e)}). 로컬 브라우저(IndexedDB)에 저장되어 새로고침 후에도 유지됩니다.`);
      } else {
        toast.error(`저장 실패: ${formatErrorMessage(e)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      const dbAction = (action === 'nose_pick' ? 'pick_nose' : action);
      if (current?.id && !current.id.startsWith('local-')) {
        await supabase.from('survival_sprite_animations').delete().eq('id', current.id);
      } else {
        await supabase.from('survival_sprite_animations').delete().eq('character_key', CHARACTER).eq('action', dbAction);
      }
      if (current?.image_path && !current.image_path.startsWith('local://')) {
        await supabase.storage.from(SPRITE_BUCKET).remove([current.image_path]);
      }
      await deleteSpriteFromLocalDb(CHARACTER, action);
      if (action === 'pick_nose' || action === 'nose_pick') {
        await deleteSpriteFromLocalDb(CHARACTER, 'pick_nose');
        await deleteSpriteFromLocalDb(CHARACTER, 'nose_pick');
      }
      clearAnimationCache(CHARACTER);
      setRawFile(null);
      setNormalizedResult(null);
      await qc.invalidateQueries({ queryKey: ['sprite-animations'] });
      toast.success('스프라이트를 삭제했어요.');
    } catch (e) {
      toast.error(`삭제 실패: ${formatErrorMessage(e)}`);
    }
  };

  const isTribeTarget = CHARACTER === 'tribe' || CHARACTER.startsWith('tribe:');
  const actionTitle = isTribeTarget
    ? TRIBE_ACTION_TITLE[action] ?? SPRITE_ACTION_LABELS[action]
    : isObject
    ? '기본 외형 / 애니메이션'
    : SPRITE_ACTION_LABELS[action] || action;

  const targetScale = data?.scale ?? 1.0;
  const previewHeight = Math.min(110, Math.round((isObject ? (objectMeta?.h || 48) : 72) * targetScale));

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4 transition-all hover:border-primary/40">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">
          {actionTitle} <span className="text-xs text-muted-foreground">({action})</span>
        </h3>
        {current && (
          <Button size="icon" variant="ghost" onClick={remove} aria-label="삭제">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Live Animated Preview */}
      <div className="relative flex h-32 flex-col items-center justify-center rounded bg-muted/60 p-2 overflow-hidden border">
        {normalizing ? (
          <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>스프라이트 자동 규격화 중...</span>
          </div>
        ) : displaySrc ? (
          <div className="flex flex-col items-center justify-center gap-1">
            <SpriteAnimator url={displaySrc} frames={frames} fps={fps} height={previewHeight} />
            {normalizedResult ? (
              <span className="rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold">
                ✓ {normalizedResult.cellWidth}×{normalizedResult.cellHeight}px 발 기준선 정렬 완료
              </span>
            ) : isUsingBuiltin ? (
              <span className="rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-bold">
                16비트 내장 도트 (수정·업로드 시 대체)
              </span>
            ) : null}
          </div>
        ) : isTribeTarget ? (
          <div className="flex flex-col items-center gap-1">
            <TribeSprite
              action={action}
              tribeClass={CHARACTER.startsWith('tribe:') ? (CHARACTER.slice(6) as never) : undefined}
              height={Math.round(52 * targetScale)}
            />
            <span className="text-[11px] text-muted-foreground">기본 스프라이트 사용 중</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground text-xs">
            <span className="text-2xl">
              {action === 'poop'
                ? '💩'
                : action === 'pick_nose' || action === 'nose_pick'
                ? '👃'
                : action === 'celebrate'
                ? '🎉'
                : action === 'attack'
                ? '⚔️'
                : action === 'chop'
                ? '🪓'
                : action === 'gather'
                ? '⛏️'
                : action === 'walk'
                ? '🚶'
                : action === 'hurt'
                ? '💥'
                : '📦'}
            </span>
            <span>미등록 (아래에서 파일 업로드 또는 불러오기)</span>
          </div>
        )}
      </div>

      {/* Existing Sprite Quick Load & Download Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => loadExistingIntoEditor()}
          disabled={normalizing || (!displaySrc && !current)}
          className="flex-1 min-h-9 gap-1.5 text-xs font-bold border-primary/40 text-primary hover:bg-primary/10"
          title="현재 등록된 스프라이트 또는 내장 도트를 편집기에 즉시 불러와 수정합니다."
        >
          <RefreshCw className={`h-3.5 w-3.5 ${normalizing ? 'animate-spin' : ''}`} />
          기존/내장 이미지 불러와서 수정
        </Button>
        {displaySrc && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={downloadCurrentSprite}
            className="min-h-9 px-2 text-xs font-bold"
            title="현재 스프라이트 이미지 다운로드"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Preset Asset Copy Loader */}
      <div className="flex items-center gap-1.5 pt-0.5">
        <label className="text-[11px] font-semibold text-muted-foreground shrink-0">
          다른 에셋 복사:
        </label>
        <select
          className="h-8 flex-1 rounded border border-border bg-background px-2 text-[11px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          defaultValue=""
          onChange={e => {
            const val = e.target.value;
            if (!val) return;
            const targetUrl = bundledSprites[`/src/assets/survival/${val}.png`];
            if (targetUrl) {
              loadExistingIntoEditor(targetUrl);
              toast.info(`[${val}] 에셋을 불러왔습니다. 수정 후 저장하세요.`);
            }
            e.target.value = '';
          }}
        >
          <option value="">다른 기존 도트 파일에서 불러와 편집하기...</option>
          {ALL_PRESET_SPRITES.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      {/* File Upload Input */}
      <div>
        <label htmlFor={fileInputId} className="sr-only">새 스프라이트 시트 파일 선택</label>
        <Input
          id={fileInputId}
          type="file"
          accept="image/png,image/webp,image/gif"
          onChange={e => setRawFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Auto-Normalizer Controls */}
      <div className="rounded-md border bg-muted/30 p-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-bold text-foreground">
            <Wand2 className="h-3.5 w-3.5 text-primary" /> 자동 규격화 (Auto-Normalize)
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(v => !v)}
            className="h-6 px-1.5 text-[11px] text-muted-foreground"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            {showAdvanced ? '접기' : '설정'}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground cursor-pointer">
            배경 자동 투명화 (크로마키)
          </Label>
          <Switch checked={autoChroma} onCheckedChange={setAutoChroma} />
        </div>

        {showAdvanced && (
          <div className="space-y-2 pt-1 border-t border-muted">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <span className="text-muted-foreground">배경 감지:</span>
              <div className="flex gap-1">
                {(['auto', 'hot_pink', 'white'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setBgMode(mode)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-medium transition-all ${
                      bgMode === mode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'
                    }`}
                  >
                    {mode === 'auto' ? '모서리 자동' : mode === 'hot_pink' ? '마젠타(#FF00FF)' : '순백색'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>감지 허용오차 (Tolerance)</span>
                <span>{tolerance}%</span>
              </div>
              <Slider min={5} max={60} step={1} value={[tolerance]} onValueChange={([v]) => setTolerance(v)} />
            </div>
          </div>
        )}
      </div>

      {/* Frame & FPS Controls */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <Label className="text-xs">프레임 수</Label>
          <span className="font-bold text-primary">{frames} 프레임</span>
        </div>
        <Slider min={1} max={16} step={1} value={[frames]} onValueChange={([v]) => setFrames(v)} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <Label className="text-xs">재생 속도</Label>
          <span className="font-bold text-primary">{fps} FPS</span>
        </div>
        <Slider min={1} max={24} step={1} value={[fps]} onValueChange={([v]) => setFps(v)} />
      </div>

      {/* Save Button */}
      <Button
        className="min-h-11 w-full gap-2 font-bold"
        onClick={save}
        disabled={saving || (!rawFile && !current)}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> 저장 중...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> 규격화 스프라이트 저장
          </>
        )}
      </Button>
    </div>
  );
}

export default function SpriteAssets() {
  const { data: catalog } = useCustomCatalog();
  const [searchParams] = useSearchParams();
  const initialTarget = searchParams.get('target') || 'hunter';
  const editUrl = searchParams.get('editUrl') || undefined;

  const [target, setTarget] = useState(initialTarget);

  useEffect(() => {
    const t = searchParams.get('target');
    if (t) setTarget(t);
  }, [searchParams]);

  const targets = [
    { key: 'hunter', label: '👤 유저 캐릭터 (공통 기본 · 10가지 액션)' },
    { key: 'hunter:lv5', label: '👤 유저 캐릭터 (Lv.5~7 전용 외형)' },
    { key: 'hunter:lv8', label: '👤 유저 캐릭터 (Lv.8+ 전용 외형)' },
    ...TRIBE_TARGETS,
    ...DINO_PET_TARGETS,
    ...(catalog?.pets ?? []).map(p => ({
      key: `pet:${p.pet_id}`,
      label: `커스텀 펫 · 🐾 ${p.name}`,
    })),
    ...PREHISTORIC_MOBS.map(m => ({
      key: `mob:${m.id}`,
      label: `🦖 선사시대 몹 · [${m.tier}] ${m.name}`,
    })),
    ...Object.entries(CREATURES)
      .filter(([k]) => !PREHISTORIC_MOBS.some(m => m.id === k))
      .map(([k, c]) => ({
        key: `mob:${k}`,
        label: `${k.startsWith('custom_') ? '커스텀 몹' : '야생 몹'} · ${c.name}`,
      })),
    ...BUILDING_TARGETS,
    ...NODE_TARGETS,
    ...GEAR_TARGETS,
    ...ITEM_TARGETS,
  ];

  const isTribe = target === 'tribe' || target.startsWith('tribe:');
  const isPet = target.startsWith('pet:');
  const isMob = target.startsWith('mob:');
  const isBuilding = BUILDING_TARGETS.some(b => b.key === target);
  const isNode = NODE_TARGETS.some(n => n.key === target);
  const isGear = GEAR_TARGETS.some(g => g.key === target);
  const isItem = ITEM_TARGETS.some(i => i.key === target);
  const isObject = isBuilding || isNode || isGear || isItem;

  const actions: SpriteAction[] =
    target === 'hunter' || target.startsWith('hunter:')
      ? (CHARACTER_ACTIONS as unknown as SpriteAction[])
      : isTribe
      ? TRIBE_ACTIONS
      : isPet
      ? PET_ACTIONS
      : isMob
      ? MOB_ACTIONS
      : OBJECT_ACTIONS;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">인게임 스프라이트 스튜디오</h1>
        <p className="text-sm text-muted-foreground">
          유저 캐릭터의 10가지 액션 모션, 부족민, 공룡 펫, 13종 선사 몹·공룡은 물론 건물, 채집 노드, 무기/도구/아이템까지 모든 오브젝트를 불러와서 직접 수정하고 애니메이션을 적용할 수 있습니다.
        </p>
      </div>

      {/* Target Quick Category Select */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="카테고리 빠른 선택">
        <Button
          type="button"
          size="sm"
          variant={target.startsWith('hunter') ? 'default' : 'outline'}
          onClick={() => setTarget('hunter')}
          className="text-xs font-bold"
        >
          👤 캐릭터
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isTribe ? 'default' : 'outline'}
          onClick={() => setTarget('tribe')}
          className="text-xs font-bold"
        >
          👥 부족 용병
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isPet ? 'default' : 'outline'}
          onClick={() => setTarget('pet:baby_raptor')}
          className="text-xs font-bold"
        >
          🦕 공룡 펫
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isMob ? 'default' : 'outline'}
          onClick={() => setTarget('mob:boar')}
          className="text-xs font-bold"
        >
          🦖 선사 몹·공룡
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isBuilding ? 'default' : 'outline'}
          onClick={() => setTarget('base-campfire')}
          className="text-xs font-bold"
        >
          🏕️ 건물·거점
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isNode ? 'default' : 'outline'}
          onClick={() => setTarget('node-oak')}
          className="text-xs font-bold"
        >
          🌲 자연물·노드
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isGear ? 'default' : 'outline'}
          onClick={() => setTarget('item-hand-axe')}
          className="text-xs font-bold"
        >
          🗡️ 무기·도구·방어구
        </Button>
        <Button
          type="button"
          size="sm"
          variant={isItem ? 'default' : 'outline'}
          onClick={() => setTarget('item-flint')}
          className="text-xs font-bold"
        >
          💎 광석·재료·식량
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label="대상 선택"
          className="min-h-11 w-full max-w-md rounded-md border bg-background px-3 text-sm font-medium"
          value={target}
          onChange={e => setTarget(e.target.value)}
        >
          {targets.map(t => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Scale Control for All Targets (especially Mobs, Pets, and Buildings) */}
      <ScaleControl target={target} />

      {/* Action Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map(a => (
          <ActionCard
            key={`${target}-${a}`}
            action={a}
            CHARACTER={target}
            autoLoadUrl={editUrl}
          />
        ))}
      </div>
    </div>
  );
}
