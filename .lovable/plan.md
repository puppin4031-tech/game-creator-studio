## 변경 목표

Tag 모드 PLAYING 화면의 호출/나침반/채팅 버튼을 **우측 상단 → 아래 방향 세로 스택**으로 재배치하고, 모든 화면 크기에서 잘리지 않도록 **반응형 + safe-area** 적용. 버튼 크기는 기존 80px에서 **10% 증가한 88px**로.

## 레이아웃 구조

```text
┌──────────────────────────────────┐
│ [방코드][점수][타이머][점수]   ⓢ │  ← 호출(Signal)
│                                ⓒ │  ← 나침반(Compass)
│                                ⓜ │  ← 채팅(Chat) + unread badge
│                                  │
│           (지도 영역)            │
│                                  │
└──────────────────────────────────┘
```

- 우측에 세로 스택 컨테이너 1개로 통합 (`flex flex-col gap-3`).
- Top 네비(점수바) **아래쪽**에서 시작 → 위치는 `top-[calc(top-nav-height + safe-area)]`.
- 우측 정렬 + safe-area-right 반영.

## 반응형 사이즈 규칙

기존 단일 크기(80px) → 뷰포트별 단계적 스케일:

| 뷰포트 | 버튼 크기 | 아이콘 |
|--------|-----------|--------|
| 작은 폰 (`<375px`, default) | 64×64 | 24px |
| 기본 모바일 (`sm:` ≥640px 미만이지만 일반 폰) | 72×72 | 28px |
| sm 이상 (`sm:`) | 88×88 (기존 80 × 1.1) | 36px |
| md 이상 (`md:`) | 96×96 | 40px |

Tailwind 클래스 예: `h-16 w-16 sm:h-[5.5rem] sm:w-[5.5rem] md:h-24 md:w-24`. 아이콘은 `w-6 h-6 sm:w-9 sm:h-9 md:w-10 md:h-10` (`!w-* !h-*`로 강제 — Core 룰 준수).

## 수정 파일 및 내용

### 1. `src/pages/play/GameRoom.tsx` (Tag PLAYING 블록, 라인 472~540)

- 루트 div를 `h-screen` → `h-[100dvh]`로 변경 (iOS Safari 주소창 대응).
- 기존 하단 가로 바(`absolute bottom-6 left-3 right-3 ...`) 제거.
- 우측 세로 스택 컨테이너 신설:
  ```tsx
  <div
    className="absolute z-[1300] flex flex-col gap-3
               top-[calc(5.5rem+env(safe-area-inset-top))]
               right-[calc(0.75rem+env(safe-area-inset-right))]"
  >
    <SignalButton ... />
    <CompassButton ... />
    <ChatDrawer ... />
  </div>
  ```
- 호출/나침반 버튼에 위 반응형 사이즈 클래스 적용.
- `text-[1.3em]` 부모 영향 차단 위해 컨테이너에 `text-base` 명시.

### 2. `src/components/tag-game/ChatDrawer.tsx`

- `SheetTrigger`의 Button을 동일 반응형 사이즈로 변경:
  - `h-16 w-16 sm:h-[5.5rem] sm:w-[5.5rem] md:h-24 md:w-24 rounded-full shadow-lg relative`
  - 내부 아이콘 `MessageCircle`도 `!w-6 !h-6 sm:!w-9 sm:!h-9 md:!w-10 md:!h-10`.
- unread 배지 위치는 그대로 (`-top-1 -right-1`).

## 보장되는 동작

- 모든 폰 크기에서 3개 버튼이 우측 가장자리에 세로로 정렬되어 보임.
- 노치/홈바/주소창과 겹치지 않음 (safe-area + dvh).
- Top 네비와 겹치지 않게 `top-[5.5rem]` 부터 시작.
- Treasure 모드는 변경하지 않음 (요청 범위는 Tag 모드 버튼).

## 변경 파일 요약

- `src/pages/play/GameRoom.tsx`
- `src/components/tag-game/ChatDrawer.tsx`
