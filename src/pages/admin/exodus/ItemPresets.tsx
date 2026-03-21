import { Wand, FlaskConical, Brush, Gem, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface GameItem {
  id: string;
  name: string;
  description: string;
  icon: typeof Wand;
  color: string;
  tags: string[];
  stageHint: string;
}

const items: GameItem[] = [
  {
    id: 'staff', name: '하나님의 지팡이', icon: Wand, color: '#d4a843',
    description: '모세가 들었던 전설의 지팡이. 나일강의 물을 피로 바꾸고, 홍해를 가르는 힘을 지녔다.',
    tags: ['핵심 아이템', 'AR사용'],
    stageHint: '1재앙 — 나일강 스테이지',
  },
  {
    id: 'antidote', name: '고대 해독제', icon: FlaskConical, color: '#22c55e',
    description: '고대 이집트의 약초를 조합하여 만든 해독제. 돌림병과 종기로부터 보호한다.',
    tags: ['조합용', '퀴즈 보상'],
    stageHint: '5, 6재앙 — 돌림병/종기 패스',
  },
  {
    id: 'comb', name: '황금 빗', icon: Brush, color: '#f59e0b',
    description: '이/파리 떼를 쫓아낼 수 있는 고대의 황금 빗. 미니게임에서 특수 능력을 부여한다.',
    tags: ['미니게임용', '소모품'],
    stageHint: '3, 4재앙 — 이/파리 미니게임',
  },
  {
    id: 'ore', name: '빛나는 광석', icon: Gem, color: '#22d3ee',
    description: '깊은 어둠 속에서도 빛을 발하는 신비한 광석. 흑암 스테이지에서 시야를 밝힌다.',
    tags: ['핵심 아이템', 'UI 상호작용'],
    stageHint: '9재앙 — 흑암 해제',
  },
  {
    id: 'blood', name: '어린 양의 피 & 우슬초', icon: Droplets, color: '#dc2626',
    description: '어린 양의 피와 우슬초 가지. 문설주에 발라 최종 재앙을 넘기는 핵심 조합 아이템.',
    tags: ['최종 아이템', '조합용', 'AR사용'],
    stageHint: '10재앙 — 장자의 죽음 최종 미션',
  },
];

export default function ItemPresets() {
  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-[#d4a843] mb-1">아이템 프리셋</h1>
      <p className="text-[#7b8da6] text-[15px] mb-6">트레이딩 카드 스타일의 수집품 목록</p>

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="group animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Trading Card (3:4 ratio) */}
            <div className="aspect-[3/4] rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-xl relative max-h-[200px] sm:max-h-[240px]"
              style={{
                borderColor: item.color + '40',
                background: `linear-gradient(180deg, ${item.color}15 0%, #111f38 40%, #0a1628 100%)`,
              }}
            >
              {/* Glow effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ boxShadow: `inset 0 0 40px ${item.color}15` }} />

              {/* Header */}
              <div className="px-3 pt-3 pb-1 relative z-10">
                <h3 className="text-[14px] font-bold text-[#e8e0d0] truncate">{item.name}</h3>
                <p className="text-[10px] text-[#7b8da6]">{item.stageHint}</p>
              </div>

              {/* Icon area */}
              <div className="flex-1 flex items-center justify-center relative z-10 py-2">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: item.color + '20', boxShadow: `0 0 20px ${item.color}20` }}
                >
                  <item.icon className="h-7 w-7" style={{ color: item.color }} />
                </div>
              </div>

              {/* Description */}
              <div className="px-3 pb-3 relative z-10">
                <p className="text-[11px] text-[#7b8da6] leading-relaxed line-clamp-3 mb-2">
                  {item.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {item.tags.map(tag => (
                    <Badge
                      key={tag}
                      className="text-[9px] px-1.5 py-0 border-0 font-normal"
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
