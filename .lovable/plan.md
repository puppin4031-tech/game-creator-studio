

# Plan: 상단 네비게이션 바 + 정렬 정리 + 모바일 버튼 크기 확대

## 요약
1. 상단 타이머+스코어보드를 하나의 네비게이션 바로 통합
2. 하단 버튼 정렬 확실히 정리
3. 모바일에서 전체적으로 버튼/폰트 더 크게

---

## 1. 상단 네비게이션 바 통합

**파일: `src/pages/play/GameRoom.tsx`**
- 현재 `flex-col` 으로 타이머와 스코어보드가 따로 떠 있음
- → 하나의 풀너비 네비게이션 바로 통합: `absolute top-0 left-0 right-0` 배경 blur 바
- 내부: 왼쪽에 팀1 스코어, 중앙에 타이머, 오른쪽에 팀2 스코어 → `justify-between`

**파일: `src/components/tag-game/GameTimer.tsx`**
- 외부 컨테이너 래핑 제거, 순수 타이머 텍스트+종료 버튼만 반환
- 타이머 폰트: `text-2xl` → `text-3xl`
- 종료 버튼: `h-9` → `h-11`

**파일: `src/components/tag-game/TeamScoreboard.tsx`**
- flex 래퍼 제거, 팀1/팀2를 개별 export 또는 props로 분리 가능하게
- 폰트: `text-sm` → `text-base`, 패딩 증가

## 2. 하단 버튼 정렬 + 크기 확대

**파일: `src/pages/play/GameRoom.tsx`**
- 하단 바: `bottom-6 left-3 right-3` → safe area 확보
- 버튼 크기: `h-16 w-16` → `h-20 w-20` (모바일)
- 아이콘 크기: `w-7 h-7` → `w-9 h-9`
- 쿨다운 텍스트: `text-base` → `text-xl`

**파일: `src/components/tag-game/ChatDrawer.tsx`**
- 트리거 버튼: `h-16 w-16` → `h-20 w-20`
- 아이콘: `w-7 h-7` → `w-9 h-9`

## 3. 전체 레이아웃

```text
┌─────────────────────────────────┐
│ [팀1: 3/4]   ⏱ 14:32   [팀2: 2/3] │  ← 풀너비 네비 바 (blur bg)
│               [종료]              │
├─────────────────────────────────┤
│                                   │
│              (지도)                │
│                                   │
│                                   │
│                                   │
│  (신호)    (나침반)      (채팅)   │  ← 하단 h-20 원형 버튼
└─────────────────────────────────┘
```

---

## 수정 파일 목록
| 파일 | 변경 |
|------|------|
| `GameRoom.tsx` | 상단→네비바, 하단 버튼 h-20, 아이콘 w-9 |
| `GameTimer.tsx` | 래퍼 제거, 폰트 확대 |
| `TeamScoreboard.tsx` | 네비바 내 인라인 렌더용으로 리팩터 |
| `ChatDrawer.tsx` | 트리거 버튼 h-20 w-20 |

