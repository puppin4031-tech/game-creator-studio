import { Droplets, Bug, Wind, Heart, Flame, CloudHail, Wheat, Moon, Skull, Baby } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const stages = [
  {
    num: 1, name: '피 (나일강)', icon: Droplets, color: '#dc2626',
    condition: '지정된 위치에서 카메라 스캔 → 붉은 물결 효과 애니메이션',
    type: 'AR 스캔', deferred: true,
  },
  {
    num: 2, name: '개구리', icon: Bug, color: '#16a34a',
    condition: '제한시간 내 화면에 나타난 개구리를 탭해서 쫓아내기',
    type: '터치 미니게임',
  },
  {
    num: 3, name: '이', icon: Bug, color: '#854d0e',
    condition: '제한시간 내 화면에 나타난 이를 탭해서 쫓아내기',
    type: '터치 미니게임',
  },
  {
    num: 4, name: '파리', icon: Wind, color: '#4338ca',
    condition: '제한시간 내 화면에 나타난 파리를 탭해서 쫓아내기',
    type: '터치 미니게임',
  },
  {
    num: 5, name: '가축 돌림병', icon: Heart, color: '#b91c1c',
    condition: '아론이 내는 고대 약초 배합 퀴즈 정답 맞추기',
    type: '객관식 퀴즈',
  },
  {
    num: 6, name: '악성 종기', icon: Flame, color: '#ea580c',
    condition: '아론이 내는 고대 약초 배합 퀴즈 정답 맞추기',
    type: '객관식 퀴즈',
  },
  {
    num: 7, name: '우박', icon: CloudHail, color: '#0284c7',
    condition: 'GPS 반경 5m 이내 진입 후 60초 대기 타이머 작동',
    type: 'GPS 지오펜싱',
  },
  {
    num: 8, name: '메뚜기', icon: Wheat, color: '#65a30d',
    condition: '인벤토리에서 특정 아이템을 드래그 앤 드롭',
    type: '아이템 사용',
  },
  {
    num: 9, name: '흑암', icon: Moon, color: '#1e1b4b',
    condition: '화면이 까매지고 원형 뷰만 보임, 빛나는 광석 사용 시 해제',
    type: '시야 차단 UI',
  },
  {
    num: 10, name: '장자의 죽음', icon: Skull, color: '#7f1d1d',
    condition: '카메라 화면 속 문설주에 피를 드래그해서 바르는 인터랙션',
    type: 'AR 조합 미션', deferred: true,
  },
];

export default function StagesTimeline() {
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-1">10대 재앙 스테이지</h1>
      <p className="text-muted-foreground text-[15px] sm:text-[17px] mb-6">1재앙부터 10재앙까지의 플레이 타임라인</p>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-accent/60 via-accent/30 to-accent/10" />

        <div className="space-y-4">
          {stages.map((stage, i) => (
            <div key={stage.num} className="relative flex items-start gap-4 pl-2 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              {/* Circle marker */}
              <div
                className="relative z-10 w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 border-2 shadow-lg"
                style={{
                  backgroundColor: stage.color + '20',
                  borderColor: stage.color,
                  boxShadow: `0 0 12px ${stage.color}30`,
                }}
              >
                <span className="text-[13px] font-bold" style={{ color: stage.color }}>{stage.num}</span>
              </div>

              {/* Card */}
              <div className="flex-1 rounded-xl bg-card border border-border hover:border-accent/30 p-4 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <stage.icon className="h-5 w-5" style={{ color: stage.color }} />
                  <h3 className="text-[16px] font-semibold text-foreground">{stage.name}</h3>
                  <Badge
                    className="ml-auto text-[12px] border-0"
                    style={{ backgroundColor: stage.color + '15', color: stage.color }}
                  >
                    {stage.type}
                  </Badge>
                  {stage.deferred && (
                    <Badge variant="outline" className="text-[11px] border-muted-foreground/30 text-muted-foreground">
                      보류
                    </Badge>
                  )}
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{stage.condition}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
