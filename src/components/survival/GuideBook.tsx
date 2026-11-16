import { useState } from 'react';
import { BookOpen, ChevronLeft, Play } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { STORY_TUTORIAL_SLIDES, StoryTutorialModal } from './StoryTutorial';
import { SURVIVAL_CONFIG as C } from '@/lib/survival/config';
import { AGGRO_RADIUS_M, LEASH_RADIUS_M } from '@/lib/survival/combat';
import { GPS_MAX_ACCURACY_M } from '@/lib/survival/gps';
import { VISION_BONUS_M, REACH_WITH_SKILL_M, AUTO_PICKUP_RADIUS_M, POCKET_BONUS_KG } from '@/lib/survival/utilitySkills';
import { MAX_TECH_LEVEL } from '@/lib/survival/techLevels';
import { SHRINE_AURA_M, FIRST_AWAKEN_SACRED, NETWORK_LINK_SACRED, SHRINES } from '@/lib/survival/sanctuaries';
import { LANDMARK_INFO, LANDMARK_COOLDOWN_MS, LANDMARK_DAILY_MAX } from '@/lib/survival/landmarks';

interface Section { id: string; title: string; body: string[] }

const landmarkHint: Record<string, string> = {
  shaman: '지하철역 근처',
  spring: '카페 근처',
  smokehouse: '패스트푸드점 근처',
  trader: '잡화점·마트 근처',
};

const SECTIONS: Section[] = [
  {
    id: 'intro', title: '게임 소개',
    body: [
      '콜로니온은 실제 GPS 위치로 플레이하는 고대 생존 게임입니다. 진짜로 걸어다녀야 자원을 캐고, 짐승을 사냥하고, 성소를 발견할 수 있어요.',
      '낮에는 시야가 15% 넓어지고 자원이 더 잘 보입니다. 밤에는 조심하세요.',
      '모든 진행은 자동 저장되며, 로그인하면 다른 기기에서도 이어서 할 수 있습니다.',
    ],
  },
  {
    id: 'base', title: '거점',
    body: [
      '모닥불에서 시작해 재료를 모아 움집 → 목책 → 전진기지로 발전시키세요.',
      '거점 안에서는 체력이 회복되고, 물건을 보관하고, 기술을 연구할 수 있습니다.',
      '거점 공사와 발전에는 실제 시간이 걸립니다. 공사가 끝나면 알림이 와요.',
      '거점 위치는 다른 플레이어에게 정확히 공개되지 않습니다.',
    ],
  },
  {
    id: 'gps', title: 'GPS와 이동',
    body: [
      `위치 오차가 ${GPS_MAX_ACCURACY_M}m 이내여야 채집·사냥·거점 행동이 가능합니다. 실내에서는 신호가 약해질 수 있어요.`,
      `기본 상호작용 반경은 ${C.interactRadiusM}m입니다. '긴 손길' 기술을 배우면 ${REACH_WITH_SKILL_M}m까지 늘어납니다.`,
      '너무 빠르게 이동하면(차량 등) 위치가 다시 잡힐 때까지 잠시 행동이 잠깁니다.',
    ],
  },
  {
    id: 'gather', title: '채집과 자원',
    body: [
      '나무, 바위, 약초, 흙을 탭하면 채집합니다. 한 번 탭하면 자동으로 연속 채집되고, 움직이거나 다시 탭하면 멈춥니다.',
      '나무는 도끼, 바위는 곡괭이가 필요합니다. 도구가 없으면 채집이 시작되지 않아요.',
      '배낭에는 무게 제한이 있습니다. 무거우면 배낭 메뉴에서 물건을 버리거나 거점에 보관하세요.',
      `'이공간 주머니' 기술로 배낭 한도를 +${POCKET_BONUS_KG[1]}~+${POCKET_BONUS_KG[3]}kg까지 늘릴 수 있습니다.`,
    ],
  },
  {
    id: 'combat', title: '사냥과 전투',
    body: [
      `짐승에게 ${AGGRO_RADIUS_M}m 안으로 접근하면 짐승이 먼저 공격합니다. ${LEASH_RADIUS_M}m 이상 멀어지면 짐승은 원래 자리로 돌아갑니다.`,
      '무기를 장착하면 공격력이 오르고, 방어구는 받는 피해를 줄여줍니다.',
      '공격 스킬(돌팔매 연타·포효·불씨 뿌리기)은 화면 오른쪽 아래 퀵슬롯에서 사용합니다. 부싯돌과 뼈로 5레벨까지 강화할 수 있어요.',
      '다른 생존자를 탭하면 인사·호감·전투 신청·동맹을 건넬 수 있습니다. 전투는 100m 이상 멀어지면 끝납니다.',
    ],
  },
  {
    id: 'research', title: '기술 연구',
    body: [
      '거점에서 재료를 바쳐 기술을 연구합니다. 연구에는 실제 시간(30분~24시간)이 걸리고, 여러 기술을 동시에 연구할 수 있습니다.',
      '연구가 완료되면 기술 탭에 빨간 점이 표시됩니다. 눌러서 [습득]해야 효과가 적용됩니다.',
      `이미 배운 기술도 재연구하면 레벨이 오릅니다(최대 Lv.${MAX_TECH_LEVEL}). 레벨에 따라 공격력·방어력·최대 체력·회복량이 실제로 강해집니다.`,
      `'매서운 눈' 기술은 시야를 +${VISION_BONUS_M}m 넓혀 줍니다.`,
    ],
  },
  {
    id: 'level', title: '레벨과 성장',
    body: [
      '채집·사냥·제작으로 경험치를 얻어 캐릭터 레벨이 오릅니다.',
      '레벨이 오르면 더 어려운 기술과 제작이 열립니다.',
    ],
  },
  {
    id: 'gear', title: '무기와 장비',
    body: [
      '제작 탭에서 돌도끼, 창, 가죽 방어구 등을 만듭니다.',
      '돌모루는 2종 재료로 기초 도구와 무기를 발명합니다. 뼈 움막 완공 후 개인 제단을 세우면 4종 재료·고열 제련·신성 부여가 열립니다. AI는 이름과 조합 개연성을 판정하고 실제 능력은 재료의 물성으로 결정됩니다.',
    ],
  },
  {
    id: 'pet', title: '펫과 동료',
    body: [
      '늑대 같은 짐승을 길들여 펫으로 만들 수 있습니다.',
      '거점에서 동료와 펫을 원정대로 내면 자동으로 사냥하며, 지도에서 싸우는 모습을 관찰할 수 있어요.',
      '원정대가 돌아오면 정찰 보고서로 내일 갈 만한 사냥터와 광맥을 알려줍니다.',
    ],
  },
  {
    id: 'npc', title: 'NPC와 랜드마크',
    body: [
      ...Object.entries(LANDMARK_INFO).map(([k, v]) => `${v.name} — ${v.desc} (${landmarkHint[k] ?? '특정 장소 근처'})`),
      `같은 랜드마크는 ${Math.round(LANDMARK_COOLDOWN_MS / 60000)}분에 한 번, 하루 ${LANDMARK_DAILY_MAX}번까지 이용할 수 있습니다.`,
    ],
  },
  {
    id: 'altar', title: '제단',
    body: [
      '개인 제단: 거점에 짓는 제단입니다. 재료를 조합해 발명품을 만드는 곳이에요.',
      'KST 자정에 무료 발명권 5회가 채워집니다. 불가능한 조합은 사전 차단하고 AI 기각은 발명권을 쓰지 않으며 시행착오 파편을 줍니다. 파편 3개로 확정 레시피 힌트를 엽니다.',
      '발명권이 없으면 15초 개척 가이드(+1), 하루 한 번 초대 링크 복사(+3), 새 지역 200m GPS 탐험(+3)으로 충전할 수 있습니다.',
      `신성한 제단(고석 성소): 전국 ${SHRINES.length}곳에 흩어진 고인돌 신전입니다. 살렘의 사제 멜키체덱이 지키고 있어요.`,
      `성소를 처음 깨우면 신성력 +${FIRST_AWAKEN_SACRED}, 이어지는 성소마다 +${NETWORK_LINK_SACRED}를 얻습니다. 깨운 성소가 늘수록 네트워크가 넓어집니다.`,
      '희귀 재료를 바쳐 제사를 올리면 신성력이 쌓입니다. 신성력은 앞으로 특별한 힘에 쓰일 예정이에요.',
      `성소 주변 ${SHRINE_AURA_M}m에는 황금 결계가 쳐져 있어 짐승이 공격하지 않습니다. 12시간마다 제단의 축복(생명의 떡·정화의 이슬)을 받을 수 있어요.`,
    ],
  },
  {
    id: 'home', title: '집에서 할 일',
    body: [
      '원정대를 보내고 관찰하기, 정찰 보고서로 내일 목표 정하기, 연구·공사 타이머 확인하기 — 집에서도 할 일이 많습니다.',
      '설정에서 알림을 켜 두면 연구 완료, 원정대 귀환, 전투 신청을 알림으로 받을 수 있어요.',
      `자동 획득 기술을 배우면 거점 근처 ${AUTO_PICKUP_RADIUS_M}m 안의 자원이 저절로 주워집니다.`,
    ],
  },
];

export default function GuideBook({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [active, setActive] = useState<string | null>(null);
  const [replayOpen, setReplayOpen] = useState(false);
  const section = SECTIONS.find((s) => s.id === active);
  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setActive(null); }}>
        <DialogContent className="flex max-h-[82dvh] flex-col font-pixel">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {section ? (
                <button type="button" aria-label="목차로" onClick={() => setActive(null)} className="pixel-btn flex h-8 w-8 items-center justify-center bg-card"><ChevronLeft className="!h-5 !w-5" /></button>
              ) : (
                <BookOpen className="!h-5 !w-5" />
              )}
              {section ? section.title : '생존 가이드'}
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!section ? (
              <div className="grid gap-1.5">
                {SECTIONS.map((s) => (
                  <button key={s.id} type="button" onClick={() => setActive(s.id)}
                    className="pixel-btn min-h-11 bg-card px-3 text-left text-sm">{s.title}</button>
                ))}
              </div>
            ) : (
              <div className="space-y-4 pr-1">
                <ul className="space-y-3 text-sm leading-relaxed">
                  {section.body.map((line, i) => (
                    <li key={i} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span>{line}</span></li>
                  ))}
                </ul>

                {section.id === 'intro' && (
                  <div className="space-y-3 border-t-2 border-border pt-3">
                    <div className="flex items-center justify-between gap-2">
                      <b className="text-sm text-primary">🎬 오프닝 스토리 튜토리얼 (가우가와 쿵쿵카 부족)</b>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setReplayOpen(true)}
                        className="pixel-btn h-auto min-h-0 gap-1 py-1.5 px-2.5 text-xs font-bold"
                      >
                        <Play className="!h-3.5 !w-3.5 fill-current" />
                        전체화면 스토리 다시 보기
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {STORY_TUTORIAL_SLIDES.map((sl) => (
                        <div key={sl.step} className="pixel-frame overflow-hidden bg-card">
                          <img
                            src={sl.image}
                            alt={sl.title}
                            className="w-full object-cover"
                          />
                          <div className="space-y-1 p-2.5 text-xs leading-relaxed">
                            <b className="block text-primary">{sl.title}</b>
                            {sl.lines.map((ln, idx) => (
                              <p key={idx} className="text-muted-foreground">{ln}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <StoryTutorialModal
        open={replayOpen}
        onComplete={() => setReplayOpen(false)}
        onSkip={() => setReplayOpen(false)}
        finishLabel="가이드로 돌아가기"
      />
    </>
  );
}
