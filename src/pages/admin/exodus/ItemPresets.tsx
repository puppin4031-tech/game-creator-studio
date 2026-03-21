import { Badge } from '@/components/ui/badge';
import staffImg from '@/assets/item-staff.png';
import antidoteImg from '@/assets/item-antidote.png';
import combImg from '@/assets/item-comb.png';
import oreImg from '@/assets/item-ore.png';
import bloodImg from '@/assets/item-blood.png';

interface GameItem {
  id: string;
  name: string;
  description: string;
  image: string;
  color: string;
  tags: string[];
  stageHint: string;
}

const items: GameItem[] = [
  {
    id: 'staff', name: '하나님의 지팡이', image: staffImg, color: '#d4a843',
    description: '모세가 들었던 전설의 지팡이. 나일강의 물을 피로 바꾸고, 홍해를 가르는 힘을 지녔다.',
    tags: ['핵심 아이템', 'AR사용'],
    stageHint: '1재앙 — 나일강',
  },
  {
    id: 'antidote', name: '고대 해독제', image: antidoteImg, color: '#22c55e',
    description: '고대 이집트의 약초를 조합하여 만든 해독제. 돌림병과 종기로부터 보호한다.',
    tags: ['조합용', '퀴즈 보상'],
    stageHint: '5,6재앙 — 돌림병/종기',
  },
  {
    id: 'comb', name: '황금 빗', image: combImg, color: '#f59e0b',
    description: '이/파리 떼를 쫓아낼 수 있는 고대의 황금 빗. 미니게임에서 특수 능력을 부여한다.',
    tags: ['미니게임용', '소모품'],
    stageHint: '3,4재앙 — 이/파리',
  },
  {
    id: 'ore', name: '빛나는 광석', image: oreImg, color: '#22d3ee',
    description: '깊은 어둠 속에서도 빛을 발하는 신비한 광석. 흑암 스테이지에서 시야를 밝힌다.',
    tags: ['핵심 아이템', 'UI 상호작용'],
    stageHint: '9재앙 — 흑암 해제',
  },
  {
    id: 'blood', name: '어린 양의 피 & 우슬초', image: bloodImg, color: '#dc2626',
    description: '어린 양의 피와 우슬초 가지. 문설주에 발라 최종 재앙을 넘기는 핵심 조합 아이템.',
    tags: ['최종 아이템', '조합용'],
    stageHint: '10재앙 — 최종 미션',
  },
];

export default function ItemPresets() {
  return (
    <div className="p-3 sm:p-4 md:p-6 h-full overflow-y-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-[#d4a843] mb-1">아이템 프리셋</h1>
      <p className="text-[#7b8da6] text-[15px] sm:text-[17px] mb-4">트레이딩 카드 스타일의 수집품 목록</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="group animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="aspect-[3/4] rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-xl relative"
              style={{
                borderColor: item.color + '40',
                background: `linear-gradient(180deg, ${item.color}15 0%, #111f38 40%, #0a1628 100%)`,
              }}
            >
              {/* Image area */}
              <div className="flex-1 flex items-center justify-center relative z-10 p-2">
                <img
                  src={item.image}
                  alt={item.name}
                  className="max-h-[60px] sm:max-h-[80px] object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-lg"
                />
              </div>

              {/* Info */}
              <div className="px-2 pb-2 relative z-10">
                <h3 className="text-[12px] sm:text-[14px] font-bold text-[#e8e0d0] truncate">{item.name}</h3>
                <p className="text-[10px] sm:text-[11px] text-[#7b8da6] truncate">{item.stageHint}</p>
                <p className="text-[10px] sm:text-[11px] text-[#7b8da6] leading-tight line-clamp-2 mt-0.5 hidden sm:block">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-0.5 mt-1">
                  {item.tags.map(tag => (
                    <Badge
                      key={tag}
                      className="text-[8px] sm:text-[10px] px-1 py-0 border-0 font-normal"
                      style={{ backgroundColor: item.color + '20', color: item.color }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
