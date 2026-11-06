export type NoticeTag = 'feature' | 'fix' | 'balance';

export interface Notice {
  id: string;
  date: string;
  title: string;
  items: { tag: NoticeTag; text: string }[];
}

// Newest first. Add a new entry at the top on every update.
export const NOTICES: Notice[] = [
  {
    id: '2026-11-06',
    date: '2026.11.06',
    title: '공지 기능 · 걷기 미션 개선',
    items: [
      { tag: 'feature', text: '메뉴에 공지사항이 추가되었어요.' },
      { tag: 'feature', text: '초대 링크를 카카오톡·문자로 바로 공유할 수 있어요.' },
      { tag: 'balance', text: '걷기 미션은 시속 13km 이하 이동만 인정돼요. (킥보드·차량 제외)' },
    ],
  },
  {
    id: '2026-11-05',
    date: '2026.11.05',
    title: 'AI 제단 발명 · 거점 모습',
    items: [
      { tag: 'feature', text: '돌모루(2칸)·고대 제단(4칸)에서 재료로 새 도구를 발명할 수 있어요.' },
      { tag: 'feature', text: '목책·움막·제단이 거점에 실제 모습으로 보여요.' },
      { tag: 'feature', text: '기술 연구 레벨(최대 5)에 따라 공격·방어·체력이 올라가요.' },
      { tag: 'fix', text: '도구 없이 나무·바위를 누르면 자동 채집이 멈추지 않던 문제를 고쳤어요.' },
      { tag: 'fix', text: '동작 중 캐릭터가 깜빡이거나 사라지던 문제를 고쳤어요.' },
    ],
  },
];

export const LATEST_NOTICE_ID = NOTICES[0]?.id ?? '';
const SEEN_KEY = 'colonion.noticeSeen';

export function hasUnreadNotice(): boolean {
  try { return localStorage.getItem(SEEN_KEY) !== LATEST_NOTICE_ID; } catch { return false; }
}

export function markNoticeRead(): void {
  try { localStorage.setItem(SEEN_KEY, LATEST_NOTICE_ID); } catch { /* storage unavailable */ }
}
