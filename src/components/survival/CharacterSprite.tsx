import idleSheet from '@/assets/survival/hunter-idle.png.asset.json';
import lv5Walk from '@/assets/survival/hunter-lv5-walk.png.asset.json';
import lv5Attack from '@/assets/survival/hunter-lv5-attack.png.asset.json';
import lv5Chop from '@/assets/survival/hunter-lv5-chop.png.asset.json';
import lv5Talk from '@/assets/survival/hunter-lv5-talk.png.asset.json';
import lv8Idle from '@/assets/survival/hunter-lv8-idle.png.asset.json';
import lv8Walk from '@/assets/survival/hunter-lv8-walk.png.asset.json';
import lv8Attack from '@/assets/survival/hunter-lv8-attack.png.asset.json';
import lv8Chop from '@/assets/survival/hunter-lv8-chop.png.asset.json';
import lv8Talk from '@/assets/survival/hunter-lv8-talk.png.asset.json';
import { useSpriteAnimations, type SpriteAction } from '@/hooks/useSpriteAnimations';
import { heroSpriteKey } from '@/lib/survival/heroTier';
import SpriteAnimator from './SpriteAnimator';

type Sheet = { url: string; frame_count: number; fps: number };
const s = (url: string, fps = 8): Sheet => ({ url, frame_count: 4, fps });
/** Bundled defaults per tier; admin uploads for the same key override these. */
const BUNDLED: Record<string, Partial<Record<SpriteAction, Sheet>>> = {
  'hunter:lv5': { idle: s(lv5Talk.url, 3), walk: s(lv5Walk.url), attack: s(lv5Attack.url), chop: s(lv5Chop.url), gather: s(lv5Chop.url), talk: s(lv5Talk.url, 5) },
  'hunter:lv8': { idle: s(lv8Idle.url, 4), walk: s(lv8Walk.url), attack: s(lv8Attack.url), chop: s(lv8Chop.url), gather: s(lv8Chop.url), talk: s(lv8Talk.url, 5) },
};

/** All character surfaces share this sprite; level picks the appearance tier. */
export default function CharacterSprite({ height = 64, action = 'idle', level = 1, className = '' }: {
  height?: number;
  action?: SpriteAction;
  level?: number;
  className?: string;
}) {
  const key = heroSpriteKey(level);
  const { data: remote } = useSpriteAnimations(key);
  const local = BUNDLED[key] ?? {};
  const pick = (a: SpriteAction): Sheet | undefined => remote?.[a] ?? local[a];
  const idle = <SpriteAnimator url={idleSheet.url} frames={4} fps={5} height={height} />;
  const animation = pick(action) ?? (action === 'chop' ? pick('attack') : undefined) ?? pick('idle');
  return (
    <div className={`flex shrink-0 items-end justify-center ${className}`} data-character-sprite={action}>
      {animation ? (
        <SpriteAnimator
          url={animation.url}
          frames={animation.frame_count}
          fps={animation.fps}
          height={height}
          once={action === 'gather' || action === 'attack' || action === 'chop'}
          fallback={idle}
        />
      ) : idle}
    </div>
  );
}
