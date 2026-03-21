import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Check, Upload, Trash2 } from 'lucide-react';
import mosesImg from '@/assets/npc-moses.png';
import aaronImg from '@/assets/npc-aaron.png';
import pharaohImg from '@/assets/npc-pharaoh.png';
import joshuaImg from '@/assets/npc-joshua.png';
import { useEffect } from 'react';

interface NPC {
  id: string; name: string; title: string; role: string;
  image: string; color: string; dialogues: string[];
}

const npcs: NPC[] = [
  { id: 'moses', name: '모세', title: '메인 가이드',
    role: '메인 퀘스트를 발동시키는 선지자. 유저에게 하나님의 명령을 전달하고 각 재앙 스테이지의 시작을 알린다.',
    image: mosesImg, color: '#d4a843',
    dialogues: ['"이스라엘 자손아, 두려워 말라. 하나님께서 너희와 함께 하시느니라."', '"파라오에게 가서 말하라. 내 백성을 보내라!"', '"지팡이를 들어 나일강을 치라. 물이 피로 변하리라."'] },
  { id: 'aaron', name: '아론', title: '조력자',
    role: '힌트를 제공하고 퍼즐 규칙을 설명하는 대제사장. 약초 배합 퀴즈를 출제한다.',
    image: aaronImg, color: '#0891b2',
    dialogues: ['"형, 이 약초를 올바르게 섞으면 돌림병을 막을 수 있을 것이오."', '"이 지팡이에는 하나님의 능력이 깃들어 있소. 잘 사용하시오."', '"퍼즐의 단서는 바로 이 두루마리 안에 있소."'] },
  { id: 'pharaoh', name: '파라오', title: '보스 / 타이머',
    role: '"내 백성을 보낼 수 없다!"며 제한 시간을 단축시키거나 페널티를 부여하는 적대 NPC.',
    image: pharaohImg, color: '#dc2626',
    dialogues: ['"내 백성을 보낼 수 없다! 이집트는 영원히 나의 것이다!"', '"감히 나의 권위에 도전하느냐? 시간을 줄여주마!"', '"이 재앙이 무엇이든, 나는 굴복하지 않겠다..."'] },
  { id: 'joshua', name: '여호수아', title: '행동 대장',
    role: '특정 GPS 대피소로 이동하라는 행동 지령을 내리는 전사. 플레이어의 이동을 유도한다.',
    image: joshuaImg, color: '#22c55e',
    dialogues: ['"전사여, 빨리 그 좌표로 이동하라! 시간이 없다!"', '"우박이 내리기 전에 대피소에 도착해야 한다!"', '"두려워 말라, 강하고 담대하라! 출발이다!"'] },
];

function TypingText({ text, speed = 40 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed(''); setDone(false); let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) { setDisplayed(text.slice(0, i + 1)); i++; } else { setDone(true); clearInterval(interval); }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);
  return <span>{displayed}{!done && <span className="inline-block w-0.5 h-4 bg-accent ml-0.5 animate-pulse" />}</span>;
}

export default function NPCEncyclopedia() {
  const queryClient = useQueryClient();
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [dialogueIndex, setDialogueIndex] = useState(0);

  const { data: exodusTheme } = useQuery({
    queryKey: ['exodus-theme'],
    queryFn: async () => {
      const { data } = await supabase.from('themes').select('id,name').eq('category', 'biblical').ilike('name', '%엑소더스%').limit(1);
      if (data && data.length > 0) return data[0];
      const { data: d2 } = await supabase.from('themes').select('id,name').eq('category', 'biblical').ilike('name', '%출애굽%').limit(1);
      return d2?.[0] || null;
    },
  });

  const { data: themeElements = [] } = useQuery({
    queryKey: ['theme-elements-story', exodusTheme?.id],
    queryFn: async () => {
      if (!exodusTheme) return [];
      const { data } = await supabase.from('theme_elements').select('*').eq('theme_id', exodusTheme.id).eq('element_type', 'story');
      return data || [];
    },
    enabled: !!exodusTheme,
  });

  const registeredTitles = new Set(themeElements.map(e => e.title));

  const registerMutation = useMutation({
    mutationFn: async (npc: NPC) => {
      if (!exodusTheme) throw new Error('테마를 찾을 수 없습니다');
      const { error } = await supabase.from('theme_elements').insert({
        theme_id: exodusTheme.id,
        element_type: 'story' as const,
        title: npc.name,
        description: npc.role,
        icon: 'user',
        image_url: npc.image,
        content: { npcId: npc.id, title: npc.title, dialogues: npc.dialogues, color: npc.color },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-elements-story'] });
      toast({ title: 'NPC가 테마 요소로 등록되었습니다' });
    },
    onError: (e: any) => toast({ title: '등록 실패', description: e.message, variant: 'destructive' }),
  });

  const unregisterMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!exodusTheme) throw new Error('테마를 찾을 수 없습니다');
      const { error } = await supabase.from('theme_elements').delete().eq('theme_id', exodusTheme.id).eq('title', title).eq('element_type', 'story');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-elements-story'] });
      toast({ title: '등록 해제되었습니다' });
    },
    onError: (e: any) => toast({ title: '삭제 실패', description: e.message, variant: 'destructive' }),
  });

  const registerAll = () => {
    const unregistered = npcs.filter(n => !registeredTitles.has(n.name));
    if (unregistered.length === 0) { toast({ title: '이미 모두 등록되어 있습니다' }); return; }
    unregistered.forEach(npc => registerMutation.mutate(npc));
  };

  const handleSelect = useCallback((npc: NPC) => { setSelectedNPC(npc); setDialogueIndex(0); }, []);
  const nextDialogue = useCallback(() => {
    if (selectedNPC) setDialogueIndex(prev => (prev + 1) % selectedNPC.dialogues.length);
  }, [selectedNPC]);

  return (
    <div className="p-4 md:p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-1">NPC 도감</h1>
          <p className="text-muted-foreground text-[15px] sm:text-[17px]">NPC를 테마 요소로 등록하면 스팟에 배치할 수 있습니다</p>
        </div>
        <Button onClick={registerAll} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Upload className="w-4 h-4" /> 전체 등록
        </Button>
      </div>

      {!exodusTheme && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4 text-sm text-destructive">
          엑소더스 테마를 찾을 수 없습니다. 테마 관리에서 먼저 생성해주세요.
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3">
        {npcs.map(npc => {
          const isRegistered = registeredTitles.has(npc.name);
          return (
            <div key={npc.id} className="relative">
              {isRegistered && (
                <div className="absolute top-1.5 right-1.5 z-20">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              )}
              <button onClick={() => handleSelect(npc)}
                className="group rounded-lg bg-card border border-border hover:border-accent/40 overflow-hidden transition-all hover:shadow-lg hover:shadow-accent/10 text-left w-full">
                <div className="aspect-[3/4] relative overflow-hidden bg-gradient-to-b from-muted to-card max-h-[120px] sm:max-h-[150px]">
                  <img src={npc.image} alt={npc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-card to-transparent h-1/3" />
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="text-[15px] font-bold text-foreground">{npc.name}</span>
                    <Badge className="text-[10px] border-0 px-1" style={{ backgroundColor: npc.color + '15', color: npc.color }}>{npc.title}</Badge>
                  </div>
                  <p className="text-[12px] text-muted-foreground line-clamp-1">{npc.role}</p>
                </div>
              </button>
              <button
                onClick={() => isRegistered ? unregisterMutation.mutate(npc.name) : registerMutation.mutate(npc)}
                disabled={!exodusTheme}
                className={`w-full mt-1 py-1 rounded text-[11px] font-medium transition-colors ${
                  isRegistered ? 'bg-destructive/10 text-destructive hover:bg-destructive/20' : 'bg-primary/10 text-primary hover:bg-primary/20'
                } disabled:opacity-50`}
              >
                {isRegistered ? '등록 해제' : '테마에 등록'}
              </button>
            </div>
          );
        })}
      </div>

      <Sheet open={!!selectedNPC} onOpenChange={(open) => !open && setSelectedNPC(null)}>
        <SheetContent className="bg-card border-l border-border text-foreground w-[400px] sm:w-[450px]">
          {selectedNPC && (
            <div className="h-full flex flex-col">
              <SheetHeader>
                <SheetTitle className="text-accent text-xl flex items-center gap-2">
                  {selectedNPC.name}
                  <Badge className="text-[11px] border-0" style={{ backgroundColor: selectedNPC.color + '15', color: selectedNPC.color }}>{selectedNPC.title}</Badge>
                </SheetTitle>
              </SheetHeader>
              <div className="my-4 rounded-xl overflow-hidden bg-gradient-to-b from-muted to-card aspect-[4/3]">
                <img src={selectedNPC.image} alt={selectedNPC.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[14px] text-muted-foreground mb-4">{selectedNPC.role}</p>
              <div className="flex-1">
                <h3 className="text-[13px] font-semibold text-accent mb-2 tracking-wider uppercase">대화 미리보기</h3>
                <div className="rounded-xl bg-muted border border-border p-4 min-h-[100px]">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-accent/30">
                      <img src={selectedNPC.image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[12px] font-medium" style={{ color: selectedNPC.color }}>{selectedNPC.name}</span>
                      <p className="text-[14px] text-foreground mt-1 leading-relaxed">
                        <TypingText key={`${selectedNPC.id}-${dialogueIndex}`} text={selectedNPC.dialogues[dialogueIndex]} />
                      </p>
                    </div>
                  </div>
                </div>
                <button onClick={nextDialogue}
                  className="mt-3 w-full rounded-lg bg-secondary hover:bg-muted border border-border py-2 text-[13px] text-accent transition-colors">
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
