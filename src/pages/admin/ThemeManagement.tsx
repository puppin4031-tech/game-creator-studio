import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Landmark, Sword, Leaf, ChevronRight, Sparkles } from 'lucide-react';

const categoryConfig = {
  biblical: { label: '성경 스토리', icon: BookOpen, gradient: 'from-red-500/20 to-amber-500/20' },
  historical: { label: '역사/문화', icon: Landmark, gradient: 'from-amber-600/20 to-yellow-500/20' },
  fantasy: { label: '판타지/모험', icon: Sword, gradient: 'from-violet-600/20 to-purple-500/20' },
  nature: { label: '자연/과학', icon: Leaf, gradient: 'from-emerald-600/20 to-cyan-500/20' },
};

type ThemeCategory = keyof typeof categoryConfig;

export default function ThemeManagement() {
  const [activeTab, setActiveTab] = useState<string>('all');

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const filteredThemes = activeTab === 'all'
    ? themes
    : themes.filter(t => t.category === activeTab);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">테마 관리</h1>
          <p className="text-muted-foreground text-[15px] mt-1">
            스팟에 적용할 테마를 선택하고 요소를 구성하세요
          </p>
        </div>
        <Badge variant="secondary" className="text-[13px]">
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {themes.length}개 테마
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-11">
          <TabsTrigger value="all" className="text-[13px]">전체</TabsTrigger>
          {(Object.entries(categoryConfig) as [ThemeCategory, typeof categoryConfig[ThemeCategory]][]).map(([key, cfg]) => (
            <TabsTrigger key={key} value={key} className="text-[13px] gap-1">
              <cfg.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{cfg.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <div className="h-40 bg-muted rounded-t-lg" />
                  <CardHeader><div className="h-5 bg-muted rounded w-2/3" /></CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredThemes.map(theme => {
                const cat = theme.category as ThemeCategory;
                const cfg = categoryConfig[cat];
                const Icon = cfg?.icon || BookOpen;

                return (
                  <Card
                    key={theme.id}
                    className="group overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50"
                  >
                    {/* Gradient thumbnail area */}
                    <div
                      className={`h-40 bg-gradient-to-br ${cfg?.gradient || 'from-muted to-muted'} flex items-center justify-center relative overflow-hidden`}
                    >
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{
                          background: `linear-gradient(135deg, ${theme.color_primary}, ${theme.color_secondary})`,
                        }}
                      />
                      <Icon
                        className="h-16 w-16 opacity-20 group-hover:opacity-30 transition-opacity"
                        style={{ color: theme.color_primary }}
                      />
                      <Badge
                        className="absolute top-3 left-3 text-[11px]"
                        style={{
                          backgroundColor: theme.color_primary,
                          color: '#fff',
                        }}
                      >
                        {cfg?.label}
                      </Badge>
                      {!theme.is_active && (
                        <Badge variant="secondary" className="absolute top-3 right-3 text-[11px]">
                          비활성
                        </Badge>
                      )}
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between">
                        {theme.name}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </CardTitle>
                      <CardDescription className="text-[13px] line-clamp-2">
                        {theme.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pt-0">
                      <div className="flex gap-1.5">
                        {(['item', 'quiz', 'puzzle', 'story'] as const).map(type => (
                          <Badge key={type} variant="outline" className="text-[11px] px-1.5">
                            {type === 'item' && '아이템'}
                            {type === 'quiz' && '퀴즈'}
                            {type === 'puzzle' && '퍼즐'}
                            {type === 'story' && '스토리'}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
