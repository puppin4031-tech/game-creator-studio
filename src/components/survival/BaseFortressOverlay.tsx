import { memo } from 'react';
import campfire from '@/assets/survival/base-campfire.png';
import hut from '@/assets/survival/base-hut.png';
import altar from '@/assets/survival/dolmen-shrine.png';

export const BaseFortressOverlay = memo(function BaseFortressOverlay({ baseLevel, hasPalisade, hasAltar }: { baseLevel: number; hasPalisade: boolean; hasAltar: boolean }) {
  return <div className="base-fortress" role="img" aria-label={`${baseLevel >= 2 ? '뼈 움막' : '모닥불'}${hasPalisade ? ' · 목책' : ''} · ${hasAltar ? '개인 제단' : '기초 돌모루'}`}>
    <div className="fortress-shadow" />
    {hasPalisade && <svg className="fortress-wall" viewBox="0 0 96 96" aria-hidden shapeRendering="crispEdges">
      <ellipse cx="48" cy="59" rx="43" ry="26" fill="none" stroke="var(--fortress-wood)" strokeWidth="5" />
      {Array.from({length:24},(_,i) => { const a=i/24*Math.PI*2; const x=Math.round(48+42*Math.cos(a)), y=Math.round(59+25*Math.sin(a)); return <path key={i} d={`M${x-2} ${y}v-13l2-4 2 4v13z`} fill="var(--fortress-wood-light)" stroke="var(--fortress-wood)" />; })}
      <path d="M9 55h15M72 55h15M27 80h42" stroke="var(--fortress-wood)" strokeWidth="4" />
    </svg>}
    <img className="fortress-main pixelated" src={baseLevel >= 2 ? hut : campfire} alt="" />
    {hasAltar ? <><img className="fortress-facility pixelated" src={altar} alt="" /><span className="fortress-fire text-accent"><span /></span></> : <svg className="fortress-facility" viewBox="0 0 32 32" aria-hidden shapeRendering="crispEdges"><path d="M8 28h19v-5H8zM11 23h12v-8H11zM4 9h24v7H8L4 12z" fill="var(--fortress-stone)" stroke="var(--fortress-stone-edge)" strokeWidth="2" /></svg>}
  </div>;
});