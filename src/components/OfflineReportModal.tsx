import React, { useMemo } from 'react';
import { ITEMS, type ItemId } from '@/lib/survival/items';
import type { SpriteKey } from '@/lib/survival/types';
import type { ShamanClassId } from '@/lib/survival/shamanEvolution';
import { BASE_SHAMAN_CLASSES, normalizeShamanClassId } from '@/lib/survival/shamanEvolution';
import type { VillageState } from '@/lib/survival/village';
import TribeSprite from './survival/TribeSprite';

export interface OfflineRewardItem {
  itemId: ItemId;
  name: string;
  count: number;
  sprite: SpriteKey;
}

export interface OfflineRewardResult {
  elapsedMinutes: number; // 정산에 반영된 분 (최대 720분)
  totalElapsedMinutes: number; // 실제 경과된 총 분
  blocks: number; // 30분 단위 수 (1~24)
  items: OfflineRewardItem[];
  classResourceGained?: {
    name: string;
    icon: string;
    amount: number;
    unit: string;
  };
  eventLog: string;
}

const EVENT_LOGS = [
  '새벽에 굶주린 늑대 무리가 기웃거렸으나, 수호 펫과 암바초의 짱돌 투척으로 멋지게 쫓아냈슴다!',
  '새벽 비바람이 몰아쳤지만 성벽 밑바닥을 나뭇가지로 든든히 괴어 창고 식량을 사수했슴다!',
  '순찰 돌던 중 덤불 깊숙한 곳에 숨겨진 달콤한 야생 산딸기 군락을 발견해 싹 털어왔슴다!',
  '거점 모닥불이 꺼지지 않도록 30분마다 마른 장작을 채워 넣어 따뜻한 온기를 지켰슴다!',
  '지나가던 호기심 많은 아기 랩터가 흙장난을 치다 암바초와 눈이 마주쳐 후다닥 도망쳤슴다!',
  '밤하늘의 별빛을 관측하며 가장 안전하고 숨겨진 비밀 채집 경로를 새로 개척해 두었슴다!',
  '족장님이 주무시는 동안 부족민들이 모닥불에 모여 족장님의 위대한 영웅담을 속삭였슴다.',
  '새벽 이슬이 맺힌 강가 바위틈에서 반짝이는 유용한 원석들을 한 움큼 챙겨왔슴다!',
];

/** 30분 단위 오프라인 보상 계산기 (최대 12시간 = 720분) */
export function calculateOfflineReward(
  elapsedMinutes: number,
  playerLevel = 1,
  village?: VillageState,
  shamanClass?: ShamanClassId | null
): OfflineRewardResult {
  const totalElapsedMinutes = Math.max(0, Math.floor(elapsedMinutes));
  const cappedMinutes = Math.min(720, Math.max(30, totalElapsedMinutes));
  const blocks = Math.max(1, Math.min(24, Math.floor(cappedMinutes / 30)));

  const itemsMap: Partial<Record<ItemId, number>> = {};

  // 1. 암바초 기본 채집 (30분당 나뭇가지 3, 돌 2, 열매 2)
  itemsMap.branch = (itemsMap.branch ?? 0) + blocks * 3;
  itemsMap.flint = (itemsMap.flint ?? 0) + blocks * 2;
  itemsMap.berry = (itemsMap.berry ?? 0) + blocks * 2;

  // 2. 플레이어 레벨에 따른 고급 광석 소량 추가
  if (playerLevel >= 11) {
    const copperBonus = Math.floor(blocks * 0.5) + (blocks % 2 === 1 ? 1 : 0);
    const bitumenBonus = Math.floor(blocks * 0.35);
    if (copperBonus > 0) itemsMap.copper_ore = (itemsMap.copper_ore ?? 0) + copperBonus;
    if (bitumenBonus > 0) itemsMap.bitumen = (itemsMap.bitumen ?? 0) + bitumenBonus;
  }

  if (playerLevel >= 20) {
    const magnetiteBonus = Math.floor(blocks * 0.3);
    const coalBonus = Math.floor(blocks * 0.4);
    if (magnetiteBonus > 0) itemsMap.magnetite = (itemsMap.magnetite ?? 0) + magnetiteBonus;
    if (coalBonus > 0) itemsMap.coal = (itemsMap.coal ?? 0) + coalBonus;
  }

  // 3. 거점 건물 보너스 (용광로 -> 주괴, 벌목소 -> 통나무)
  const buildings = village?.buildings ?? [];
  const hasSmeltery = buildings.some(b => b.buildingId === 'stone_smeltery');
  const hasLumber = buildings.some(b => b.buildingId === 'lumber_hut');

  if (hasSmeltery) {
    const ingotCount = Math.floor(blocks * 0.35) + 1;
    itemsMap.copper_ingot = (itemsMap.copper_ingot ?? 0) + ingotCount;
  }

  if (hasLumber) {
    const logCount = Math.floor(blocks * 0.6) + 1;
    itemsMap.log = (itemsMap.log ?? 0) + logCount;
  }

  // 4. 전직별 전용 자원 보너스 (증기압/마나/영혼/화합도)
  const canonical = normalizeShamanClassId(shamanClass ?? village?.shamanClass);
  let classResourceGained: OfflineRewardResult['classResourceGained'] = undefined;
  if (canonical && BASE_SHAMAN_CLASSES[canonical]) {
    const cfg = BASE_SHAMAN_CLASSES[canonical];
    const amount = Math.min(100, blocks * 4);
    classResourceGained = {
      name: cfg.resourceName,
      icon: cfg.resourceIcon,
      amount,
      unit: cfg.resourceUnit,
    };
  }

  // 아이템 리스트 포맷팅
  const items: OfflineRewardItem[] = Object.entries(itemsMap).map(([id, count]) => {
    const itemDef = ITEMS[id as ItemId];
    return {
      itemId: id as ItemId,
      name: itemDef?.name ?? id,
      count: count ?? 0,
      sprite: itemDef?.sprite ?? 'item-branch',
    };
  });

  // 랜덤 사건 일지 선택
  const eventLog = EVENT_LOGS[Math.floor(Math.random() * EVENT_LOGS.length)];

  return {
    elapsedMinutes: cappedMinutes,
    totalElapsedMinutes,
    blocks,
    items,
    classResourceGained,
    eventLog,
  };
}

interface OfflineReportModalProps {
  open: boolean;
  onClose: () => void;
  elapsedMinutes: number;
  playerLevel?: number;
  village?: VillageState;
  shamanClass?: ShamanClassId | null;
  onClaim: (items: OfflineRewardItem[], classResourceAmount?: number) => void;
}

export const OfflineReportModal: React.FC<OfflineReportModalProps> = ({
  open,
  onClose,
  elapsedMinutes,
  playerLevel = 1,
  village,
  shamanClass,
  onClaim,
}) => {
  const reward = useMemo(
    () => calculateOfflineReward(elapsedMinutes, playerLevel, village, shamanClass),
    [elapsedMinutes, playerLevel, village, shamanClass]
  );

  if (!open) return null;

  const hours = Math.floor(reward.totalElapsedMinutes / 60);
  const mins = reward.totalElapsedMinutes % 60;
  const timeText = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

  const handleClaim = () => {
    onClaim(reward.items, reward.classResourceGained?.amount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 font-pixel">
      <div className="w-full max-w-md bg-stone-950 border-4 border-amber-500 rounded p-4 text-white shadow-2xl space-y-3.5 max-h-[92dvh] overflow-y-auto">
        {/* 모달 상단 헤더 */}
        <div className="flex items-center justify-between border-b-2 border-stone-800 pb-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xl">📜</span>
            <h2 className="text-base font-bold text-amber-300">
              암바초의 밤사이 활동 보고서
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-stone-400 hover:text-white px-1.5 py-0.5 border border-stone-700 bg-stone-900 rounded"
          >
            [닫기]
          </button>
        </div>

        {/* 부재 시간 및 정산 상한 안내 배너 */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-950/40 border border-amber-600/50 rounded text-xs">
          <div className="flex items-center gap-1.5 text-amber-200">
            <span>🌙</span>
            <span>족장님 부재 시간: <b>{timeText}</b></span>
          </div>
          <span className="text-[10px] text-amber-400/80 font-mono">
            {reward.totalElapsedMinutes > 720 ? '(최대 12시간 정산)' : `(${reward.blocks * 30}분 누적 정산)`}
          </span>
        </div>

        {/* 암바초 대화 & 도트 스프라이트 연출 */}
        <div className="flex items-center gap-3 p-3 bg-stone-900/90 border border-stone-700 rounded">
          <div className="shrink-0 flex items-center justify-center w-14 h-14 bg-black/60 border border-stone-600 rounded">
            <TribeSprite action="gather" tribeClass="gatherer" height={48} showBadge={false} />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-emerald-400">🎒 충성된 암바초 (파밍 부족민)</span>
            </div>
            <p className="text-xs text-stone-200 leading-snug">
              "충성! 족장님! 주무시는 동안 제가 거점 주변을 열심히 훑으며 주워왔슴다! 배낭이 묵직함다!"
            </p>
          </div>
        </div>

        {/* 밤사이 거점 사건 일지 (랜덤 1줄) */}
        <div className="p-2.5 bg-black/60 border border-stone-800 rounded space-y-1">
          <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
            <span>🛡️</span> 밤사이 거점 순찰 일지
          </span>
          <p className="text-xs text-stone-300 leading-relaxed italic">
            "{reward.eventLog}"
          </p>
        </div>

        {/* 전직 전용 자원 보너스 (있을 경우) */}
        {reward.classResourceGained && (
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-900/40 to-stone-900 border border-amber-500/40 rounded text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base">{reward.classResourceGained.icon}</span>
              <span className="text-stone-300">
                거점 시설 축적: <b>{reward.classResourceGained.name}</b>
              </span>
            </div>
            <span className="text-amber-300 font-bold font-mono">
              +{reward.classResourceGained.amount}{reward.classResourceGained.unit}
            </span>
          </div>
        )}

        {/* 획득 자원 목록 그리드 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-stone-400 font-bold px-0.5">
            <span>📦 암바초 수확물 ({reward.items.length}종)</span>
            <span>수량</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {reward.items.map((it) => (
              <div
                key={it.itemId}
                className="flex items-center justify-between p-2 bg-black/50 border border-stone-700/80 rounded"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base shrink-0">
                    {it.itemId === 'branch' && '🪵'}
                    {it.itemId === 'flint' && '🪨'}
                    {it.itemId === 'berry' && '🍓'}
                    {it.itemId === 'copper_ore' && '🟤'}
                    {it.itemId === 'bitumen' && '🖤'}
                    {it.itemId === 'magnetite' && '🧲'}
                    {it.itemId === 'coal' && '⬛'}
                    {it.itemId === 'log' && '🪵'}
                    {it.itemId === 'copper_ingot' && '🧱'}
                  </span>
                  <span className="text-xs font-bold text-stone-200 truncate">
                    {it.name}
                  </span>
                </div>
                <span className="text-xs font-bold text-amber-300 shrink-0 font-mono">
                  +{it.count}개
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 전체 수령 버튼 */}
        <button
          type="button"
          onClick={handleClaim}
          className="w-full py-3 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] text-black font-bold text-sm rounded border-2 border-white shadow-lg cursor-pointer flex items-center justify-center gap-2 transition-transform"
        >
          <span>🎒</span>
          <span>한 번에 모두 수령하기 ▶</span>
        </button>
      </div>
    </div>
  );
};

export default OfflineReportModal;
