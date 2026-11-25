import { useState, useMemo } from 'react';
import {
  X,
  Wrench,
  Sparkles,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  Check,
  ChevronRight,
  Shield,
  Pickaxe,
  Flame,
  Layers,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ITEMS, type ItemId, type ItemCategory } from '@/lib/survival/items';
import { bundledSpriteUrl } from '@/hooks/useItemCatalog';
import type { Quality, Stack } from '@/lib/survival/types';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  level: number;
  xp: number;
  storageCount: number;
  backpackCount: number;
  onSetLevel: (level: number) => void;
  onGrantPreset: (pkg: 'starter' | 'civilization' | 'ancient' | 'food') => void;
  onAddItems: (items: Stack[], target?: 'storage' | 'backpack') => void;
  onAddGear: (itemIds: ItemId[], quality?: Quality) => void;
  onClearStorage: () => void;
  onRestoreBestSave?: () => Promise<unknown>;
}

type TabKey = 'level' | 'preset' | 'custom' | 'backup';

const PRESETS = [
  {
    id: 'starter' as const,
    name: '기초 생존 패키지',
    badge: '추천 (초반 복구)',
    desc: '통나무/돌/나뭇가지/부싯돌 50~100개, 고기 30개, 돌곡괭이, 주먹도끼, 부싯돌 창, 가죽 조끼',
    icon: '🌱',
    items: ['통나무 100', '돌 100', '나뭇가지 100', '부싯돌 50', '돌곡괭이', '주먹도끼', '부싯돌 창', '가죽 조끼'],
  },
  {
    id: 'civilization' as const,
    name: '청동/철기 문명 패키지',
    badge: '중급 모험가',
    desc: '구리/철/청동 주괴 각 50개, 석탄 60개, 흑요석 30개, 흑요석 도끼/곡괭이, 철제 검, 청동 갑옷',
    icon: '⚔️',
    items: ['청동 주괴 50', '철 주괴 50', '흑요석 30', '석탄 60', '흑요석 곡괭이', '흑요석 도끼', '철제 검', '청동 갑옷'],
  },
  {
    id: 'ancient' as const,
    name: '강철/고대 보석 패키지',
    badge: '엔드게임 종결',
    desc: '강철 주괴 50개, 옥/루비/사파이어/호박 각 20~30개, 용의 비늘 10개, 강철 곡괭이/도끼/검, 강철 갑옷, 옥 목걸이',
    icon: '💎',
    items: ['강철 주괴 50', '옥 30', '루비 20', '사파이어 20', '용의 비늘 10', '강철 곡괭이', '강철 도끼', '강철 검'],
  },
  {
    id: 'food' as const,
    name: '풍족한 식량 패키지',
    badge: '생존 필수',
    desc: '구운 고기 50개, 말린 육포 50개, 훈제 베이컨 50개, 가죽 물주머니 10개',
    icon: '🍖',
    items: ['구운 고기 50', '말린 육포 50', '훈제 베이컨 50', '물주머니 10'],
  },
];

const POPULAR_ITEMS: { id: ItemId; label: string; count: number; isGear?: boolean }[] = [
  { id: 'stone_pickaxe', label: '돌곡괭이', count: 1, isGear: true },
  { id: 'obsidian_pickaxe', label: '흑요석 곡괭이', count: 1, isGear: true },
  { id: 'steel_pickaxe', label: '강철 곡괭이', count: 1, isGear: true },
  { id: 'hand_axe', label: '주먹도끼', count: 1, isGear: true },
  { id: 'obsidian_axe', label: '흑요석 도끼', count: 1, isGear: true },
  { id: 'iron_sword', label: '철제 검', count: 1, isGear: true },
  { id: 'log', label: '통나무', count: 50 },
  { id: 'flint', label: '돌', count: 50 },
  { id: 'flint', label: '부싯돌', count: 30 },
  { id: 'steel_ingot', label: '강철 주괴', count: 30 },
  { id: 'cooked_meat', label: '구운 고기', count: 30 },
  { id: 'arrow', label: '화살', count: 50 },
];

export default function AccountSaveEditorModal({
  open,
  onClose,
  level,
  xp,
  storageCount,
  backpackCount,
  onSetLevel,
  onGrantPreset,
  onAddItems,
  onAddGear,
  onClearStorage,
  onRestoreBestSave,
}: Props) {
  const [tab, setTab] = useState<TabKey>('level');
  const [inputLevel, setInputLevel] = useState<string>(String(level));
  const [selectedItemCategory, setSelectedItemCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedItemId, setSelectedItemId] = useState<ItemId>('stone_pickaxe');
  const [itemQuantity, setItemQuantity] = useState<number>(30);
  const [itemTarget, setItemTarget] = useState<'storage' | 'backpack'>('storage');
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Filter items for selection
  const catalogList = useMemo(() => {
    return Object.entries(ITEMS)
      .filter(([_, it]) => selectedItemCategory === 'all' || it.category === selectedItemCategory)
      .map(([id, it]) => ({ id: id as ItemId, it }))
      .sort((a, b) => a.it.name.localeCompare(b.it.name));
  }, [selectedItemCategory]);

  const handleApplyLevel = () => {
    const parsed = parseInt(inputLevel, 10);
    if (isNaN(parsed) || parsed < 1) {
      toast.error('올바른 레벨(1~100)을 입력해주세요.');
      return;
    }
    onSetLevel(parsed);
  };

  const handleQuickLevel = (targetLvl: number) => {
    setInputLevel(String(targetLvl));
    onSetLevel(targetLvl);
  };

  const handleAddCustomItem = () => {
    const it = ITEMS[selectedItemId];
    if (!it) return;

    if (it.durability !== undefined) {
      // Gear item
      onAddGear([selectedItemId], 'NORMAL');
    } else {
      // Stackable item
      onAddItems([{ itemId: selectedItemId, count: Math.max(1, itemQuantity) }], itemTarget);
    }
  };

  const handleAddPopularItem = (p: typeof POPULAR_ITEMS[number]) => {
    if (p.isGear) {
      onAddGear([p.id], 'NORMAL');
    } else {
      onAddItems([{ itemId: p.id, count: p.count }], 'storage');
    }
  };

  const handleRestore = async () => {
    if (!onRestoreBestSave) return;
    setIsRestoring(true);
    try {
      await onRestoreBestSave();
    } catch (e) {
      toast.error('세이브 복원에 실패했습니다.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="max-w-lg w-[95vw] bg-[#1a120c] border-2 border-[#8b5a2b] text-amber-100 p-0 overflow-hidden font-pixel shadow-2xl rounded-lg">
        {/* Header */}
        <div className="bg-[#2b1d14] border-b border-[#5c3a1e] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <div>
              <DialogTitle className="text-base font-bold text-amber-200">
                계정 레벨 및 창고/재료 관리자
              </DialogTitle>
              <p className="text-[11px] text-amber-400/70">
                업데이트로 초기화된 레벨 복구 및 창고 아이템 즉시 지급
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded border border-[#5c3a1e] bg-[#3a271c] hover:bg-[#4d3425] flex items-center justify-center text-amber-200 active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current status summary strip */}
        <div className="bg-[#241a15] px-4 py-2 border-b border-[#3d2719] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span>
              현재 레벨: <strong className="text-amber-300">Lv.{level}</strong>
            </span>
            <span className="text-amber-500/50">|</span>
            <span>
              창고: <strong className="text-amber-300">{storageCount}종</strong>
            </span>
            <span className="text-amber-500/50">|</span>
            <span>
              배낭: <strong className="text-amber-300">{backpackCount}종</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isRestoring || !onRestoreBestSave}
            className="text-[11px] px-2 py-0.5 bg-[#422a1d] hover:bg-[#5a3a28] border border-amber-600/40 rounded text-amber-200 flex items-center gap-1 active:scale-95 disabled:opacity-50"
            title="클라우드/로컬 최고 기록 탐색 복원"
          >
            <RefreshCw className={`w-3 h-3 ${isRestoring ? 'animate-spin' : ''}`} />
            기존 기록 복원
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 bg-[#231710] border-b border-[#3d2719] text-xs">
          <button
            type="button"
            onClick={() => setTab('level')}
            className={`py-2 px-1 text-center font-bold border-b-2 transition-colors ${
              tab === 'level'
                ? 'border-amber-400 text-amber-200 bg-[#311f15]'
                : 'border-transparent text-amber-400/60 hover:text-amber-200'
            }`}
          >
            ⭐ 레벨 설정
          </button>
          <button
            type="button"
            onClick={() => setTab('preset')}
            className={`py-2 px-1 text-center font-bold border-b-2 transition-colors ${
              tab === 'preset'
                ? 'border-amber-400 text-amber-200 bg-[#311f15]'
                : 'border-transparent text-amber-400/60 hover:text-amber-200'
            }`}
          >
            📦 패키지 지급
          </button>
          <button
            type="button"
            onClick={() => setTab('custom')}
            className={`py-2 px-1 text-center font-bold border-b-2 transition-colors ${
              tab === 'custom'
                ? 'border-amber-400 text-amber-200 bg-[#311f15]'
                : 'border-transparent text-amber-400/60 hover:text-amber-200'
            }`}
          >
            🔍 재료/도구 추가
          </button>
          <button
            type="button"
            onClick={() => setTab('backup')}
            className={`py-2 px-1 text-center font-bold border-b-2 transition-colors ${
              tab === 'backup'
                ? 'border-amber-400 text-amber-200 bg-[#311f15]'
                : 'border-transparent text-amber-400/60 hover:text-amber-200'
            }`}
          >
            💾 데이터 정리
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-4">
          {/* TAB 1: Level Adjustment */}
          {tab === 'level' && (
            <div className="space-y-4">
              <div className="bg-[#241a15] p-3 rounded border border-[#422c1e] space-y-2">
                <span className="text-xs font-bold text-amber-300 block">
                  원하는 레벨을 직접 입력하거나 빠른 버튼을 누르세요:
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-2 text-xs text-amber-400 font-bold">
                      Lv.
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={inputLevel}
                      onChange={e => setInputLevel(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-[#150d09] border border-[#5c3a1e] rounded text-amber-100 text-sm focus:outline-none focus:border-amber-400"
                      placeholder="레벨 (1~100)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyLevel}
                    className="px-4 py-1.5 bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold rounded border border-amber-500 shadow active:scale-95"
                  >
                    레벨 변경 적용
                  </button>
                </div>
              </div>

              {/* Quick Level presets */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-amber-400/80 font-bold">빠른 레벨 선택:</span>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 15, 20, 25, 35, 50].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => handleQuickLevel(lvl)}
                      className={`py-2 px-2 rounded border text-xs font-bold transition-all active:scale-95 flex flex-col items-center justify-center ${
                        level === lvl
                          ? 'bg-amber-600/40 border-amber-400 text-amber-100 shadow'
                          : 'bg-[#2a1d15] border-[#4a3224] text-amber-300/80 hover:bg-[#3d2a1e] hover:text-amber-100'
                      }`}
                    >
                      <span>Lv.{lvl}</span>
                      <span className="text-[9px] opacity-70">
                        {lvl === 1 ? '초기화' : lvl <= 10 ? '초급' : lvl <= 25 ? '중급' : '고급'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-950/30 border border-amber-600/30 text-[11px] text-amber-300/90 leading-relaxed space-y-1">
                <p>💡 <strong>레벨 상승 시 자동 효과:</strong></p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-200/80">
                  <li>최대 체력(HP) 자동 증가 및 전체 회복</li>
                  <li>배낭 소지 중량 한도(kg) 증가</li>
                  <li>Lv.2 채집 도구 슬롯 2개 해금 (벌목/채굴 동시 장착 가능)</li>
                  <li>Lv.5 주술사 언어 퀘스트 즉시 전수</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: Resource Packages */}
          {tab === 'preset' && (
            <div className="space-y-3">
              <span className="text-xs text-amber-400/80 font-bold block">
                자주 필요한 도구와 재료들을 한 번에 창고와 인벤토리에 보급합니다:
              </span>
              <div className="space-y-2.5">
                {PRESETS.map(pkg => (
                  <div
                    key={pkg.id}
                    className="p-3 bg-[#241a15] rounded border border-[#4a3224] hover:border-amber-600/60 transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-amber-200 flex items-center gap-1.5">
                          <span>{pkg.icon}</span>
                          <span>{pkg.name}</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-900/40 border border-amber-600/30 text-amber-300 font-bold">
                          {pkg.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-300/70 mt-1">{pkg.desc}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pkg.items.map((it, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] bg-[#1a120c] px-1.5 py-0.5 rounded border border-[#3d2719] text-amber-200/90"
                          >
                            {it}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onGrantPreset(pkg.id)}
                      className="w-full mt-1 py-1.5 bg-[#5e3820] hover:bg-[#7a4829] border border-amber-500/70 text-amber-100 rounded text-xs font-bold shadow active:scale-98 transition-all flex items-center justify-center gap-1"
                    >
                      <Package className="w-3.5 h-3.5 text-amber-300" />
                      <span>{pkg.name} 지급 받기</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Custom Item Adder */}
          {tab === 'custom' && (
            <div className="space-y-4">
              {/* Popular quick-add chips */}
              <div className="space-y-1.5">
                <span className="text-[11px] text-amber-400/80 font-bold">
                  자주 찾는 도구 & 재료 빠른 추가:
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {POPULAR_ITEMS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddPopularItem(p)}
                      className="p-1.5 bg-[#251b14] hover:bg-[#38281e] border border-[#422c1e] hover:border-amber-500/60 rounded text-[11px] text-left transition-all active:scale-95 flex items-center justify-between"
                    >
                      <span className="truncate text-amber-200">{p.label}</span>
                      <span className="text-[9px] px-1 bg-amber-900/50 rounded text-amber-300 shrink-0">
                        +{p.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Categorized catalog selector */}
              <div className="bg-[#241a15] p-3 rounded border border-[#422c1e] space-y-3">
                <span className="text-xs font-bold text-amber-300 block">
                  전체 도감 아이템 선택 지급:
                </span>

                {/* Category filters */}
                <div className="flex flex-wrap gap-1 text-[10px]">
                  {(['all', 'tool', 'weapon', 'material', 'ore', 'food', 'processed'] as const).map(
                    cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedItemCategory(cat)}
                        className={`px-2 py-0.5 rounded border transition-colors ${
                          selectedItemCategory === cat
                            ? 'bg-amber-700 border-amber-400 text-white font-bold'
                            : 'bg-[#1a120c] border-[#4a3224] text-amber-400/70 hover:text-amber-200'
                        }`}
                      >
                        {cat === 'all'
                          ? '전체'
                          : cat === 'tool'
                          ? '도구'
                          : cat === 'weapon'
                          ? '무기'
                          : cat === 'material'
                          ? '기초재료'
                          : cat === 'ore'
                          ? '광석/금속'
                          : cat === 'food'
                          ? '음식'
                          : '가공품'}
                      </button>
                    )
                  )}
                </div>

                {/* Dropdown item select */}
                <div className="space-y-1">
                  <label className="text-[10px] text-amber-400/80">아이템 선택:</label>
                  <select
                    value={selectedItemId}
                    onChange={e => setSelectedItemId(e.target.value as ItemId)}
                    className="w-full px-2 py-1.5 bg-[#150d09] border border-[#5c3a1e] rounded text-amber-100 text-xs focus:outline-none focus:border-amber-400"
                  >
                    {catalogList.map(({ id, it }) => (
                      <option key={id} value={id}>
                        {it.name} ({it.category})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity and Target */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-amber-400/80">지급 수량:</label>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={itemQuantity}
                      onChange={e => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-2 py-1 bg-[#150d09] border border-[#5c3a1e] rounded text-amber-100 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-amber-400/80">지급 대상:</label>
                    <select
                      value={itemTarget}
                      onChange={e => setItemTarget(e.target.value as 'storage' | 'backpack')}
                      className="w-full px-2 py-1 bg-[#150d09] border border-[#5c3a1e] rounded text-amber-100 text-xs focus:outline-none"
                    >
                      <option value="storage">거점 창고</option>
                      <option value="backpack">플레이어 배낭</option>
                    </select>
                  </div>
                </div>

                {/* Add button */}
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="w-full py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded text-xs font-bold border border-amber-500 shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{ITEMS[selectedItemId]?.name ?? '아이템'} 추가하기</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: Backup & Reset */}
          {tab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#241a15] rounded border border-[#4a3224] space-y-2">
                <span className="font-bold text-xs text-amber-200 block">
                  🔄 이전 최고 기록 세이브 자동 복원
                </span>
                <p className="text-[11px] text-amber-300/70 leading-relaxed">
                  로그인 전/후 세이브 키 전환 또는 업데이트로 진행도가 비워진 경우, 브라우저 로컬 저장소와 Supabase 클라우드에서 가장 높은 점수(레벨/펫/재료)의 세이브를 자동 탐색하여 복원합니다.
                </p>
                <button
                  type="button"
                  onClick={handleRestore}
                  disabled={isRestoring || !onRestoreBestSave}
                  className="w-full py-2 bg-[#3f2a1d] hover:bg-[#523827] border border-amber-500 text-amber-100 rounded text-xs font-bold shadow active:scale-95 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>최고 진행도 세이브 자동 검색 및 복원</span>
                </button>
              </div>

              <div className="p-3 bg-[#241a15] rounded border border-red-900/40 space-y-2">
                <span className="font-bold text-xs text-red-300 block">
                  ⚠️ 창고 비우기
                </span>
                <p className="text-[11px] text-amber-400/60 leading-relaxed">
                  창고에 보관된 재료 목록을 완전히 초기화합니다. (장비와 배낭은 유지됩니다)
                </p>
                {confirmClearOpen ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearStorage();
                        setConfirmClearOpen(false);
                      }}
                      className="flex-1 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded text-xs font-bold border border-red-500 shadow active:scale-95"
                    >
                      정말 비우기
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClearOpen(false)}
                      className="px-3 py-1.5 bg-[#3a271c] hover:bg-[#4d3425] text-amber-200 rounded text-xs font-bold border border-[#5c3a1e]"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmClearOpen(true)}
                    className="w-full py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/60 text-red-300 rounded text-xs font-bold shadow active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>창고 재료 비우기</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
