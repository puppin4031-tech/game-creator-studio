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
          <h1 className="text-2xl font-bold text-[#d4a843]">퍼즐/퀴즈 메이커</h1>
          <p className="text-[#7b8da6] text-[15px] mt-1">서브 관리자용 에디터 — 지역에 맞는 퍼즐을 세팅하세요</p>
        </div>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-2 rounded-lg bg-[#d4a843] text-[#0a1628] px-4 py-2 text-[14px] font-medium hover:bg-[#f0c75e] transition-colors"
        >
          <Eye className="h-4 w-4" />
          미리보기
        </button>
      </div>

      <div className="flex gap-6">
        {/* Editor */}
        <div className="flex-1">
          <Tabs defaultValue="gps">
            <TabsList className="bg-[#111f38] border border-[#1e2d4a] w-full grid grid-cols-3 h-11">
              <TabsTrigger value="gps" className="text-[13px] data-[state=active]:bg-[#d4a843]/20 data-[state=active]:text-[#d4a843]">
                <MapPin className="h-4 w-4 mr-1" /> GPS 위치
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-[13px] data-[state=active]:bg-[#d4a843]/20 data-[state=active]:text-[#d4a843]">
                <Image className="h-4 w-4 mr-1" /> QR/AR 마커
              </TabsTrigger>
              <TabsTrigger value="quiz" className="text-[13px] data-[state=active]:bg-[#d4a843]/20 data-[state=active]:text-[#d4a843]">
                <HelpCircle className="h-4 w-4 mr-1" /> 퀴즈 출제
              </TabsTrigger>
            </TabsList>

            {/* GPS Tab */}
            <TabsContent value="gps" className="mt-4">
              <div className="rounded-xl bg-[#111f38] border border-[#1e2d4a] p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#e8e0d0]">GPS 위치 지정</h3>
                <div className="h-64 rounded-lg bg-[#0a1628] border border-[#1e2d4a] flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-[#d4a843]/50 mx-auto mb-2" />
                    <p className="text-[#7b8da6] text-sm">지도에서 마커를 찍어 위치를 지정하세요</p>
                    <p className="text-[#7b8da6] text-[12px] mt-1">지도 검색 기능 연동 예정</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] text-[#7b8da6] block mb-1">위도</label>
                    <input className="w-full rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-2 text-sm focus:border-[#d4a843] outline-none" placeholder="37.5665" />
                  </div>
                  <div>
                    <label className="text-[12px] text-[#7b8da6] block mb-1">경도</label>
                    <input className="w-full rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-2 text-sm focus:border-[#d4a843] outline-none" placeholder="126.9780" />
                  </div>
                </div>
                <div>
                  <label className="text-[12px] text-[#7b8da6] block mb-1">반경 (m)</label>
                  <input className="w-full rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-2 text-sm focus:border-[#d4a843] outline-none" defaultValue="5" type="number" />
                </div>
              </div>
            </TabsContent>

            {/* QR/AR Tab */}
            <TabsContent value="qr" className="mt-4">
              <div className="rounded-xl bg-[#111f38] border border-[#1e2d4a] p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#e8e0d0]">QR/AR 마커 등록</h3>
                <Badge variant="outline" className="text-[11px] border-[#7b8da6]/30 text-[#7b8da6]">
                  보류 — 차후 추가 예정
                </Badge>
                <div className="h-48 rounded-lg border-2 border-dashed border-[#1e2d4a] flex items-center justify-center">
                  <div className="text-center">
                    <Image className="h-8 w-8 text-[#7b8da6]/50 mx-auto mb-2" />
                    <p className="text-[#7b8da6] text-sm">이미지를 드래그하거나 클릭하여 업로드</p>
                    <p className="text-[#7b8da6] text-[11px] mt-1">PNG, JPG (최대 5MB)</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Quiz Tab */}
            <TabsContent value="quiz" className="mt-4">
              <div className="rounded-xl bg-[#111f38] border border-[#1e2d4a] p-4 space-y-4">
                <h3 className="text-[15px] font-semibold text-[#e8e0d0]">퀴즈 출제</h3>

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
                          ? 'bg-[#d4a843]/20 text-[#d4a843] border border-[#d4a843]/40'
                          : 'bg-[#0a1628] text-[#7b8da6] border border-[#1e2d4a] hover:border-[#7b8da6]/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Question */}
                <div>
                  <label className="text-[12px] text-[#7b8da6] block mb-1">질문</label>
                  <textarea
                    className="w-full rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-2 text-sm focus:border-[#d4a843] outline-none resize-none h-20"
                    placeholder="퀴즈 질문을 입력하세요..."
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                  />
                </div>

                {/* Multiple choice */}
                {quizType === 'multiple' && (
                  <div className="space-y-2">
                    <label className="text-[12px] text-[#7b8da6] block">선택지 (정답 클릭)</label>
                    {options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <button
                          onClick={() => setCorrectIndex(i)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0 ${
                            correctIndex === i
                              ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40'
                              : 'bg-[#0a1628] text-[#7b8da6] border border-[#1e2d4a]'
                          }`}
                        >
                          {i + 1}
                        </button>
                        <input
                          className="flex-1 rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-1.5 text-sm focus:border-[#d4a843] outline-none"
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
                    <label className="text-[12px] text-[#7b8da6] block mb-1">정답</label>
                    <input
                      className="w-full rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-2 text-sm focus:border-[#d4a843] outline-none"
                      placeholder="정답을 입력하세요"
                      value={shortAnswer}
                      onChange={e => setShortAnswer(e.target.value)}
                    />
                  </div>
                )}

                {/* Dial lock */}
                {quizType === 'dial' && (
                  <div>
                    <label className="text-[12px] text-[#7b8da6] block mb-1">자물쇠 코드 (숫자)</label>
                    <input
                      className="w-full rounded-lg bg-[#0a1628] border border-[#1e2d4a] text-[#e8e0d0] px-3 py-2 text-sm focus:border-[#d4a843] outline-none tracking-[0.5em] text-center text-lg font-mono"
                      placeholder="1234"
                      maxLength={6}
                      value={dialCode}
                      onChange={e => setDialCode(e.target.value.replace(/\D/g, ''))}
                    />
                    {/* Visual dial */}
                    <div className="flex justify-center gap-3 mt-4">
                      {(dialCode || '____').split('').slice(0, 6).map((d, i) => (
                        <div key={i} className="w-12 h-16 rounded-lg bg-[#0a1628] border-2 border-[#d4a843]/40 flex items-center justify-center text-2xl font-bold text-[#d4a843]">
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
            <div className="rounded-[2rem] bg-[#111f38] border-2 border-[#1e2d4a] p-2 shadow-xl">
              {/* Phone notch */}
              <div className="flex justify-center mb-1">
                <div className="w-20 h-1 rounded-full bg-[#1e2d4a]" />
              </div>
              {/* Screen */}
              <div className="rounded-[1.5rem] bg-[#0a1628] h-[500px] overflow-y-auto p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="h-4 w-4 text-[#d4a843]" />
                  <span className="text-[12px] text-[#d4a843] font-medium">모바일 미리보기</span>
                </div>

                {question && (
                  <div className="rounded-xl bg-[#162340] border border-[#1e2d4a] p-3">
                    <p className="text-[13px] text-[#e8e0d0] font-medium mb-3">{question}</p>

                    {quizType === 'multiple' && options.filter(Boolean).map((opt, i) => (
                      <button key={i} className={`w-full text-left mb-2 px-3 py-2 rounded-lg text-[12px] transition-colors ${
                        correctIndex === i
                          ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                          : 'bg-[#0a1628] text-[#7b8da6] border border-[#1e2d4a] hover:border-[#7b8da6]/50'
                      }`}>
                        {i + 1}. {opt}
                      </button>
                    ))}

                    {quizType === 'short' && (
                      <div className="rounded-lg bg-[#0a1628] border border-[#1e2d4a] px-3 py-2 text-[12px] text-[#7b8da6]">
                        답을 입력하세요...
                      </div>
                    )}

                    {quizType === 'dial' && (
                      <div className="flex justify-center gap-2">
                        {(dialCode || '____').split('').slice(0, 6).map((d, i) => (
                          <div key={i} className="w-8 h-10 rounded bg-[#0a1628] border border-[#d4a843]/40 flex items-center justify-center text-lg font-bold text-[#d4a843]">
                            ·
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {!question && (
                  <div className="flex items-center justify-center h-40 text-[#7b8da6] text-[12px]">
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
