import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Check, Upload } from 'lucide-react';
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
  icon: string;
}

const presetItems: GameItem[] = [
  { id: 'staff', name: '하나님의 지팡이', image: staffImg, color: '#d4a843', icon: 'wand',
    description: '모세가 들었던 전설의 지팡이. 나일강의 물을 피로 바꾸고, 홍해를 가르는 힘을 지녔다.',
    tags: ['핵심 아이템', 'AR사용'], stageHint: '1재앙 — 나일강' },
  { id: 'antidote', name: '고대 해독제', image: antidoteImg, color: '#22c55e', icon: 'flask-round',
    description: '고대 이집트의 약초를 조합하여 만든 해독제. 돌림병과 종기로부터 보호한다.',
    tags: ['조합용', '퀴즈 보상'], stageHint: '5,6재앙 — 돌림병/종기' },
  { id: 'comb', name: '황금 빗', image: combImg, color: '#f59e0b', icon: 'crown',
    description: '이/파리 떼를 쫓아낼 수 있는 고대의 황금 빗. 미니게임에서 특수 능력을 부여한다.',
    tags: ['미니게임용', '소모품'], stageHint: '3,4재앙 — 이/파리' },
  { id: 'ore', name: '빛나는 광석', image: oreImg, color: '#0891b2', icon: 'gem',
    description: '깊은 어둠 속에서도 빛을 발하는 신비한 광석. 흑암 스테이지에서 시야를 밝힌다.',
    tags: ['핵심 아이템', 'UI 상호작용'], stageHint: '9재앙 — 흑암 해제' },
  { id: 'blood', name: '어린 양의 피 & 우슬초', image: bloodImg, color: '#dc2626', icon: 'droplets',
    description: '어린 양의 피와 우슬초 가지. 문설주에 발라 최종 재앙을 넘기는 핵심 조합 아이템.',
    tags: ['최종 아이템', '조합용'], stageHint: '10재앙 — 최종 미션' },
];

export default function ItemPresets() {
  const queryClient = useQueryClient();

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
    queryKey: ['theme-elements-items', exodusTheme?.id],
    queryFn: async () => {
      if (!exodusTheme) return [];
      const { data } = await supabase.from('theme_elements').select('*').eq('theme_id', exodusTheme.id).eq('element_type', 'item');
      return data || [];
    },
    enabled: !!exodusTheme,
  });

  const registeredTitles = new Set(themeElements.map(e => e.title));

  const registerMutation = useMutation({
    mutationFn: async (item: GameItem) => {
      if (!exodusTheme) throw new Error('테마를 찾을 수 없습니다');
      const { error } = await supabase.from('theme_elements').insert({
        theme_id: exodusTheme.id,
        element_type: 'item' as const,
        title: item.name,
        description: item.description,
        icon: item.icon,
        image_url: item.image,
        content: { tags: item.tags, stageHint: item.stageHint, color: item.color, presetId: item.id },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-elements-items'] });
      toast({ title: '테마 요소로 등록되었습니다' });
    },
    onError: (e: any) => toast({ title: '등록 실패', description: e.message, variant: 'destructive' }),
  });

  const unregisterMutation = useMutation({
    mutationFn: async (title: string) => {
      if (!exodusTheme) throw new Error('테마를 찾을 수 없습니다');
      const { error } = await supabase.from('theme_elements').delete().eq('theme_id', exodusTheme.id).eq('title', title).eq('element_type', 'item');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-elements-items'] });
      toast({ title: '등록 해제되었습니다' });
    },
    onError: (e: any) => toast({ title: '삭제 실패', description: e.message, variant: 'destructive' }),
  });

  const registerAll = () => {
    const unregistered = presetItems.filter(i => !registeredTitles.has(i.name));
    if (unregistered.length === 0) { toast({ title: '이미 모두 등록되어 있습니다' }); return; }
    unregistered.forEach(item => registerMutation.mutate(item));
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-1">아이템 프리셋</h1>
          <p className="text-muted-foreground text-[15px] sm:text-[17px]">
            아이템을 테마 요소로 등록하면 스팟에 배치할 수 있습니다
          </p>
        </div>
        <Button onClick={registerAll} className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
          <Upload className="w-4 h-4" />
          전체 등록
        </Button>
      </div>

      {!exodusTheme && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4 text-sm text-destructive">
          엑소더스 테마를 찾을 수 없습니다. 테마 관리에서 먼저 생성해주세요.
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
        {presetItems.map((item, i) => {
          const isRegistered = registeredTitles.has(item.name);
          return (
            <div key={item.id} className="group animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div
                className="aspect-[3/4] rounded-xl border overflow-hidden flex flex-col transition-all hover:shadow-xl relative"
                style={{
                  borderColor: isRegistered ? item.color + '60' : item.color + '30',
                  background: `linear-gradient(180deg, ${item.color}10 0%, hsl(var(--card)) 40%, hsl(var(--background)) 100%)`,
                }}
              >
                {/* Registration badge */}
                {isRegistered && (
                  <div className="absolute top-1.5 right-1.5 z-20">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  </div>
                )}

                <div className="flex-1 flex items-center justify-center relative z-10 p-2">
                  <img src={item.image} alt={item.name}
                    className="pixelated max-h-[60px] sm:max-h-[80px] object-contain group-hover:scale-110 transition-transform duration-300 drop-shadow-lg" />
                </div>

                <div className="px-2 pb-2 relative z-10">
                  <h3 className="text-[12px] sm:text-[14px] font-bold text-foreground truncate">{item.name}</h3>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{item.stageHint}</p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight line-clamp-2 mt-0.5 hidden sm:block">{item.description}</p>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {item.tags.map(tag => (
                      <Badge key={tag} className="text-[8px] sm:text-[10px] px-1 py-0 border-0 font-normal"
                        style={{ backgroundColor: item.color + '15', color: item.color }}>
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <button
                    onClick={() => isRegistered ? unregisterMutation.mutate(item.name) : registerMutation.mutate(item)}
                    disabled={!exodusTheme}
                    className={`w-full mt-1.5 py-1 rounded text-[10px] sm:text-[11px] font-medium transition-colors ${
                      isRegistered
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    } disabled:opacity-50`}
                  >
                    {isRegistered ? '등록 해제' : '테마에 등록'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Registered elements from DB */}
      {themeElements.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">등록된 아이템 요소 ({themeElements.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {themeElements.map(el => (
              <div key={el.id} className="flex items-center justify-between gap-2 bg-card border border-border rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{el.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{el.description}</p>
                </div>
                <button
                  onClick={() => unregisterMutation.mutate(el.title)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
