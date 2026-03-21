import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MapPin, Image, HelpCircle, Eye, Plus, Trash2, Smartphone } from 'lucide-react';

export default function PuzzleQuizMaker() {
  const [quizType, setQuizType] = useState<'multiple' | 'short' | 'dial'>('multiple');
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [shortAnswer, setShortAnswer] = useState('');
  const [dialCode, setDialCode] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-accent">퍼즐/퀴즈 메이커</h1>
          <p className="text-muted-foreground text-[15px] mt-1">서브 관리자용 에디터 — 지역에 맞는 퍼즐을 세팅하세요</p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 rounded-lg bg-accent text-accent-foreground px-4 py-2 text-[14px] font-medium hover:bg-accent/90 transition-colors"
        >
          <Eye className="h-4 w-4" />
          미리보기
        </button>
      </div>

      <div className="flex gap-6">
        {/* Editor */}
        <div className="flex-1">
          <Tabs defaultValue="gps">
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

            {/* GPS Tab */}
            <TabsContent value="gps" className="mt-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-foreground">GPS 위치 지정</h3>
                <div className="h-64 rounded-lg bg-muted border border-border flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-accent/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">지도에서 마커를 찍어 위치를 지정하세요</p>
                    <p className="text-muted-foreground text-[12px] mt-1">지도 검색 기능 연동 예정</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1">위도</label>
                    <input className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none" placeholder="37.5665" />
                  </div>
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1">경도</label>
                    <input className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none" placeholder="126.9780" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">반경 (m)</label>
                  <input className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none" defaultValue="5" type="number" />
                </div>
              </div>
            </TabsContent>

            {/* QR/AR Tab */}
            <TabsContent value="qr" className="mt-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-foreground">QR/AR 마커 등록</h3>
                <Badge variant="outline" className="text-[11px] border-muted-foreground/30 text-muted-foreground">
                  보류 — 차후 추가 예정
                </Badge>
                <div className="h-48 rounded-lg border-2 border-dashed border-border flex items-center justify-center">
                  <div className="text-center">
                    <Image className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">이미지를 드래그하거나 클릭하여 업로드</p>
                    <p className="text-muted-foreground text-[11px] mt-1">PNG, JPG (최대 5MB)</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz" className="mt-4">
              <div className="rounded-xl bg-card border border-border p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-foreground">퀴즈 출제</h3>

                {/* Quiz type selector */}
                <div className="flex gap-2">
                  {[
                    { key: 'multiple' as const, label: '객관식' },
                    { key: 'short' as const, label: '주관식' },
                    { key: 'dial' as const, label: '다이얼 자물쇠' },
                  ].map(t => (
                    <button
                      key={t.key}
                      onClick={() => setQuizType(t.key)}
                      className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                        quizType === t.key
                          ? 'bg-accent/15 text-accent border border-accent/40'
                          : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Question */}
                <div>
                  <label className="text-[12px] text-muted-foreground block mb-1">질문</label>
                  <textarea
                    className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none resize-none h-20"
                    placeholder="퀴즈 질문을 입력하세요..."
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                  />
                </div>

                {/* Multiple choice */}
                {quizType === 'multiple' && (
                  <div className="space-y-2">
                    <label className="text-[12px] text-muted-foreground block">선택지 (정답 클릭)</label>
                    {options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <button
                          onClick={() => setCorrectIndex(i)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${
                            correctIndex === i
                              ? 'bg-primary/15 text-primary border border-primary/40'
                              : 'bg-muted text-muted-foreground border border-border'
                          }`}
                        >
                          {i + 1}
                        </button>
                        <input
                          className="flex-1 rounded-lg bg-muted border border-border text-foreground px-3 py-1.5 text-sm focus:border-accent outline-none"
                          placeholder={`선택지 ${i + 1}`}
                          value={opt}
                          onChange={e => {
                            const newOpts = [...options];
                            newOpts[i] = e.target.value;
                            setOptions(newOpts);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Short answer */}
                {quizType === 'short' && (
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1">정답</label>
                    <input
                      className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none"
                      placeholder="정답을 입력하세요"
                      value={shortAnswer}
                      onChange={e => setShortAnswer(e.target.value)}
                    />
                  </div>
                )}

                {/* Dial lock */}
                {quizType === 'dial' && (
                  <div>
                    <label className="text-[12px] text-muted-foreground block mb-1">자물쇠 코드 (숫자)</label>
                    <input
                      className="w-full rounded-lg bg-muted border border-border text-foreground px-3 py-2 text-sm focus:border-accent outline-none tracking-[0.5em] text-center text-lg font-mono"
                      placeholder="1234"
                      maxLength={6}
                      value={dialCode}
                      onChange={e => setDialCode(e.target.value.replace(/\D/g, ''))}
                    />
                    {/* Visual dial */}
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
        </div>

        {/* Mobile preview */}
        {showPreview && (
          <div className="w-[280px] shrink-0 animate-slide-in-right">
            <div className="rounded-[2rem] bg-card border-2 border-border p-2 shadow-xl">
              {/* Phone notch */}
              <div className="flex justify-center mb-1">
                <div className="w-20 h-1 rounded-full bg-border" />
              </div>
              {/* Screen */}
              <div className="rounded-[1.5rem] bg-muted h-[500px] overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-accent" />
                  <span className="text-[12px] text-accent font-medium">모바일 미리보기</span>
                </div>

                {question && (
                  <div className="rounded-xl bg-secondary border border-border p-3">
                    <p className="text-[13px] text-foreground font-medium mb-3">{question}</p>

                    {quizType === 'multiple' && options.filter(Boolean).map((opt, i) => (
                      <button key={i} className={`w-full text-left mb-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${
                        correctIndex === i
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-muted text-muted-foreground border border-border hover:border-muted-foreground/50'
                      }`}>
                        {i + 1}. {opt}
                      </button>
                    ))}

                    {quizType === 'short' && (
                      <div className="rounded-lg bg-muted border border-border px-3 py-2 text-[12px] text-muted-foreground">
                        답을 입력하세요...
                      </div>
                    )}

                    {quizType === 'dial' && (
                      <div className="flex justify-center gap-2">
                        {(dialCode || '____').split('').slice(0, 6).map((d, i) => (
                          <div key={i} className="w-8 h-10 rounded bg-muted border border-accent/40 flex items-center justify-center text-lg font-bold text-accent">
                            ·
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!question && (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-[12px]">
                    퀴즈를 작성하면 여기에 표시됩니다
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
