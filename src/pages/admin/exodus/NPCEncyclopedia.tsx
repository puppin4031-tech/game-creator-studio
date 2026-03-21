import { useState, useEffect, useCallback } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import mosesImg from '@/assets/npc-moses.png';
import aaronImg from '@/assets/npc-aaron.png';
import pharaohImg from '@/assets/npc-pharaoh.png';
import joshuaImg from '@/assets/npc-joshua.png';

interface NPC {
  id: string;
  name: string;
  title: string;
  role: string;
  image: string;
  color: string;
  dialogues: string[];
}

const npcs: NPC[] = [
  {
    id: 'moses', name: '모세', title: '메인 가이드',
    role: '메인 퀘스트를 발동시키는 선지자. 유저에게 하나님의 명령을 전달하고 각 재앙 스테이지의 시작을 알린다.',
    image: mosesImg, color: '#d4a843',
    dialogues: [
      '"이스라엘 자손아, 두려워 말라. 하나님께서 너희와 함께 하시느니라."',
      '"파라오에게 가서 말하라. 내 백성을 보내라!"',
      '"지팡이를 들어 나일강을 치라. 물이 피로 변하리라."',
    ],
  },
  {
    id: 'aaron', name: '아론', title: '조력자',
    role: '힌트를 제공하고 퍼즐 규칙을 설명하는 대제사장. 약초 배합 퀴즈를 출제한다.',
    image: aaronImg, color: '#22d3ee',
    dialogues: [
      '"형, 이 약초를 올바르게 섞으면 돌림병을 막을 수 있을 것이오."',
      '"이 지팡이에는 하나님의 능력이 깃들어 있소. 잘 사용하시오."',
      '"퍼즐의 단서는 바로 이 두루마리 안에 있소."',
    ],
  },
  {
    id: 'pharaoh', name: '파라오', title: '보스 / 타이머',
    role: '"내 백성을 보낼 수 없다!"며 제한 시간을 단축시키거나 페널티를 부여하는 적대 NPC.',
    image: pharaohImg, color: '#dc2626',
    dialogues: [
      '"내 백성을 보낼 수 없다! 이집트는 영원히 나의 것이다!"',
      '"감히 나의 권위에 도전하느냐? 시간을 줄여주마!"',
      '"이 재앙이 무엇이든, 나는 굴복하지 않겠다..."',
    ],
  },
  {
    id: 'joshua', name: '여호수아', title: '행동 대장',
    role: '특정 GPS 대피소로 이동하라는 행동 지령을 내리는 전사. 플레이어의 이동을 유도한다.',
    image: joshuaImg, color: '#22c55e',
    dialogues: [
      '"전사여, 빨리 그 좌표로 이동하라! 시간이 없다!"',
      '"우박이 내리기 전에 대피소에 도착해야 한다!"',
      '"두려워 말라, 강하고 담대하라! 출발이다!"',
    ],
  },
];

function TypingText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span>
      {displayed}
      {!done && <span className="inline-block w-0.5 h-4 bg-[#d4a843] ml-0.5 animate-pulse" />}
    </span>
  );
}

export default function NPCEncyclopedia() {
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const handleSelect = useCallback((npc: NPC) => {
    setSelectedNPC(npc);
    setDialogueIndex(0);
  }, []);

  const nextDialogue = useCallback(() => {
    if (selectedNPC) {
      setDialogueIndex(prev => (prev + 1) % selectedNPC.dialogues.length);
    }
  }, [selectedNPC]);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-[#d4a843] mb-1">NPC 도감</h1>
      <p className="text-[#7b8da6] text-[15px] mb-6">캐릭터 카드를 클릭하면 대화 미리보기를 확인할 수 있습니다</p>

      {/* NPC Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        {npcs.map(npc => (
          <button
            key={npc.id}
            onClick={() => handleSelect(npc)}
            className="group rounded-lg bg-[#111f38] border border-[#1e2d4a] hover:border-[#d4a843]/40 overflow-hidden transition-all hover:shadow-lg hover:shadow-[#d4a843]/10 text-left"
          >
            <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-b from-[#162340] to-[#0a1628] max-h-[120px] sm:max-h-[150px]">
              <img
                src={npc.image}
                alt={npc.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#0a1628] to-transparent h-1/3" />
            </div>
            <div className="p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-[13px] font-bold text-[#e8e0d0]">{npc.name}</span>
                <Badge className="text-[9px] border-0 px-1" style={{ backgroundColor: npc.color + '20', color: npc.color }}>
                  {npc.title}
                </Badge>
              </div>
              <p className="text-[11px] text-[#7b8da6] line-clamp-1">{npc.role}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Slide Panel */}
      <Sheet open={!!selectedNPC} onOpenChange={(open) => !open && setSelectedNPC(null)}>
        <SheetContent className="bg-[#0f1d32] border-l border-[#1e2d4a] text-[#e8e0d0] w-[400px] sm:w-[450px]">
          {selectedNPC && (
            <div className="h-full flex flex-col">
              <SheetHeader>
                <SheetTitle className="text-[#d4a843] text-xl flex items-center gap-2">
                  {selectedNPC.name}
                  <Badge className="text-[11px] border-0" style={{ backgroundColor: selectedNPC.color + '20', color: selectedNPC.color }}>
                    {selectedNPC.title}
                  </Badge>
                </SheetTitle>
              </SheetHeader>

              {/* Character image */}
              <div className="my-4 rounded-xl overflow-hidden bg-gradient-to-b from-[#162340] to-[#0a1628] aspect-[4/3]">
                <img src={selectedNPC.image} alt={selectedNPC.name} className="w-full h-full object-cover" />
              </div>

              {/* Role description */}
              <p className="text-[14px] text-[#7b8da6] mb-4">{selectedNPC.role}</p>

              {/* Dialogue preview */}
              <div className="flex-1">
                <h3 className="text-[13px] font-semibold text-[#d4a843] mb-2 tracking-wider uppercase">대화 미리보기</h3>
                <div className="rounded-xl bg-[#111f38] border border-[#1e2d4a] p-4 min-h-[100px]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#d4a843]/30">
                      <img src={selectedNPC.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[12px] font-medium" style={{ color: selectedNPC.color }}>{selectedNPC.name}</span>
                      <p className="text-[14px] text-[#e8e0d0] mt-1 leading-relaxed">
                        <TypingText
                          key={`${selectedNPC.id}-${dialogueIndex}`}
                          text={selectedNPC.dialogues[dialogueIndex]}
                        />
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={nextDialogue}
                  className="mt-3 w-full rounded-lg bg-[#162340] hover:bg-[#1e2d4a] border border-[#1e2d4a] py-2 text-[13px] text-[#d4a843] transition-colors"
                >
                  다음 대사 ▶
                </button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
