import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { MapPin, Image, HelpCircle, Eye, Save, Trash2, Smartphone } from 'lucide-react';

export default function PuzzleQuizMaker() {
  const queryClient = useQueryClient();
  const [quizType, setQuizType] = useState<'multiple' | 'short' | 'dial'>('multiple');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [shortAnswer, setShortAnswer] = useState('');
  const [dialCode, setDialCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [title, setTitle] = useState('');

  const { data: exodusTheme } = useQuery({
    queryKey: ['exodus-theme'],
    queryFn: async () => {
      const { data } = await supabase.from('themes').select('id,name').eq('category', 'biblical').ilike('name', '%엑소더스%').limit(1);
      if (data && data.length > 0) return data[0];
      const { data: d2 } = await supabase.from('themes').select('id,name').eq('category', 'biblical').ilike('name', '%출애굽%').limit(1);
      return d2?.[0] || null;
    },
  });

  const { data: savedElements = [] } = useQuery({
    queryKey: ['theme-elements-quiz-puzzle', exodusTheme?.id],
    queryFn: async () => {
      if (!exodusTheme) return [];
      const { data } = await supabase.from('theme_elements').select('*').eq('theme_id', exodusTheme.id).in('element_type', ['quiz', 'puzzle']);
      return data || [];
    },
    enabled: !!exodusTheme,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!exodusTheme) throw new Error('테마를 찾을 수 없습니다');
      if (!title.trim()) throw new Error('제목을 입력해주세요');
      if (!question.trim()) throw new Error('질문을 입력해주세요');

      const elementType = quizType === 'dial' ? 'puzzle' : 'quiz';
      const content: any = { quizType, question };
      if (quizType === 'multiple') { content.options = options; content.correctIndex = correctIndex; }
      if (quizType === 'short') { content.answer = shortAnswer; }
      if (quizType === 'dial') { content.code = dialCode; }

      const { error } = await supabase.from('theme_elements').insert({
        theme_id: exodusTheme.id,
        element_type: elementType as 'quiz' | 'puzzle',
        title: title.trim(),
        description: question.trim().slice(0, 100),
        icon: elementType === 'puzzle' ? 'lock' : 'help-circle',
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-elements-quiz-puzzle'] });
      toast({ title: '퀴즈/퍼즐이 테마 요소로 저장되었습니다' });
      setTitle(''); setQuestion(''); setOptions(['', '', '', '']); setCorrectIndex(0); setShortAnswer(''); setDialCode('');
    },
    onError: (e: any) => toast({ title: '저장 실패', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('theme_elements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['theme-elements-quiz-puzzle'] });
      toast({ title: '삭제되었습니다' });
    },
    onError: (e: any) => toast({ title: '삭제 실패', description: e.message, variant: 'destructive' }),
  });

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">퍼즐/퀴즈 메이커</h1>
          <p className="text-muted-foreground text-[15px] mt-1">퀴즈를 만들고 테마 요소로 저장하면 스팟에 배치할 수 있습니다</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 rounded-lg bg-secondary text-foreground border border-border px-4 py-2 text-[14px] font-medium hover:bg-muted transition-colors">
            <Eye className="h-4 w-4" /> 미리보기
          </button>
          <Button onClick={() => saveMutation.mutate()} disabled={!exodusTheme || !title.trim() || !question.trim()}
            className="bg-accent text-accent-foreground hover:bg-accent/90 gap-2">
            <Save className="h-4 w-4" /> 테마에 저장
          </Button>
        </div>
      </div>

      {!exodusTheme && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 mb-4 text-sm text-destructive">
          엑소더스 테마를 찾을 수 없습니다.
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1">
          {/* Title input */}
          <div className="mb-4">
            <label className="text-[12px] text-muted-foreground block mb-1">요소 제목</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              className="w-full rounded-lg bg-card border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none"
              placeholder="예: 나일강 퀴즈, 다이얼 자물쇠 #1" />
          </div>

          <Tabs defaultValue="quiz">
            <TabsList className="bg-card border border-border w-full grid grid-cols-3 h-11">
              <TabsTrigger value="gps" className="text-[13px] data-[state=active]:bg-accent/15 data-[state=active]:text-accent">
                <MapPin className="h-4 w-4 mr-1" /> GPS 위치
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-[13px] data-[state=active]:bg-accent/15 data-[state=active]:text-accent">
                <Image className="h-4 w-4 mr-1" /> QR/AR 마커
              </TabsTrigger>
              <TabsTrigger value="quiz" className="text-[13px] data-[state=active]:bg-accent/15 data-[state=active]:text-accent">
                <HelpCircle className="h-4 w-4 mr-1" /> 퀴즈 출제
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gps" className="mt-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-foreground">GPS 위치 지정</h3>
                <div className="h-64 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-accent/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">지도에서 마커를 찍어 위치를 지정하세요</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="qr" className="mt-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-foreground">QR/AR 마커 등록</h3>
                <Badge variant="outline" className="text-[11px] border-muted-foreground/30 text-muted-foreground">보류 — 차후 추가 예정</Badge>
                <div className="h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                  <div className="text-center">
                    <Image className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">이미지를 드래그하거나 클릭하여 업로드</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="quiz" className="mt-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-foreground">퀴즈 출제</h3>
                <div className="flex gap-2">
                  {([{ key: 'multiple' as const, label: '객관식' }, { key: 'short' as const, label: '주관식' }, { key: 'dial' as const, label: '다이얼 자물쇠' }]).map(t => (
                    <button key={t.key} onClick={() => setQuizType(t.key)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        quizType === t.key ? 'bg-accent/15 text-accent border border-accent/40' : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/50'
                      }`}>{t.label}</button>
                  ))}
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">질문</label>
                  <textarea value={question} onChange={e => setQuestion(e.target.value)}
                    className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none resize-none h-20"
                    placeholder="퀴즈 질문을 입력하세요..." />
                </div>
                {quizType === 'multiple' && (
                  <div className="space-y-2">
                    <label className="text-[12px] text-muted-foreground block">선택지 (정답 클릭)</label>
                    {options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <button onClick={() => setCorrectIndex(i)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${
                            correctIndex === i ? 'bg-primary/15 text-primary border border-primary/40' : 'bg-muted text-muted-foreground border border-border'
                          }`}>{i + 1}</button>
                        <input value={opt} onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
                          className="flex-1 rounded-lg bg-muted border border-border text-foreground px-3 py-1.5 text-sm focus:border-accent outline-none"
                          placeholder={`선택지 ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
                {quizType === 'short' && (
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1">정답</label>
                    <input value={shortAnswer} onChange={e => setShortAnswer(e.target.value)}
                      className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none" placeholder="정답을 입력하세요" />
                  </div>
                )}
                {quizType === 'dial' && (
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1">자물쇠 코드 (숫자)</label>
                    <input value={dialCode} onChange={e => setDialCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none tracking-[0.5em] text-center text-lg font-mono"
                      placeholder="1234" maxLength={6} />
                    <div className="flex justify-center gap-3 mt-4">
                      {(dialCode || '____').split('').slice(0, 6).map((d, i) => (
                        <div key={i} className="w-12 h-16 rounded-lg bg-muted border-2 border-accent/40 flex items-center justify-center text-2xl font-bold text-accent">
                          {d === '_' ? '·' : d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Saved elements list */}
          {savedElements.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold text-foreground mb-3">저장된 퀴즈/퍼즐 ({savedElements.length})</h2>
              <div className="space-y-2">
                {savedElements.map(el => {
                  const content = el.content as any;
                  return (
                    <div key={el.id} className="flex items-center justify-between gap-3 bg-card border border-border rounded-lg px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground">{el.title}</p>
                          <Badge variant="outline" className="text-[10px]">
                            {el.element_type === 'quiz' ? '퀴즈' : '퍼즐'}
                          </Badge>
                          {content?.quizType && (
                            <Badge className="text-[10px] border-0 bg-accent/10 text-accent">
                              {content.quizType === 'multiple' ? '객관식' : content.quizType === 'short' ? '주관식' : '다이얼'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{content?.question || el.description}</p>
                      </div>
                      <button onClick={() => deleteMutation.mutate(el.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {showPreview && (
          <div className="w-[280px] shrink-0 animate-slide-in-right">
            <div className="rounded-[2rem] bg-card border-2 border-border p-2 shadow-xl">
              <div className="flex justify-center mb-1"><div className="w-20 h-1 rounded-full bg-border" /></div>
              <div className="rounded-[1.5rem] bg-muted h-[500px] overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-accent" />
                  <span className="text-[12px] text-accent font-medium">모바일 미리보기</span>
                </div>
                {question ? (
                  <div className="rounded-xl bg-secondary border border-border p-3">
                    <p className="text-[13px] text-foreground font-medium mb-3">{question}</p>
                    {quizType === 'multiple' && options.filter(Boolean).map((opt, i) => (
                      <button key={i} className={`w-full text-left mb-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${
                        correctIndex === i ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-muted text-muted-foreground border border-border'
                      }`}>{i + 1}. {opt}</button>
                    ))}
                    {quizType === 'short' && <div className="rounded-lg bg-muted border border-border px-3 py-2 text-[12px] text-muted-foreground">답을 입력하세요...</div>}
                    {quizType === 'dial' && (
                      <div className="flex justify-center gap-2">
                        {(dialCode || '____').split('').slice(0, 6).map((d, i) => (
                          <div key={i} className="w-8 h-10 rounded bg-muted border border-accent/40 flex items-center justify-center text-lg font-bold text-accent">·</div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-[12px]">퀴즈를 작성하면 여기에 표시됩니다</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
