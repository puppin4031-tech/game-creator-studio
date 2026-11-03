import hello from '@/assets/survival/emote-hello.png';
import love from '@/assets/survival/emote-love.png';
import duel from '@/assets/survival/emote-duel.png';
import ally from '@/assets/survival/emote-ally.png';

export const EMOTE_ICON = { hello, love, duel, ally } as const;
export type EmoteIconKey = keyof typeof EMOTE_ICON;
