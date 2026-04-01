

# Plan: UI 개선 + 나침반 방향 지도 회전

## 요약
1. 버튼 크기 키우고 겹침 방지 레이아웃 정리
2. 폰트 크기 30% 증가
3. 스마트폰 방향(나침반)에 따라 지도 자동 회전

---

## 1. 폰트 크기 30% 증가 & 버튼 크기 확대

**파일: `src/index.css`**
- `body`에 `font-size: 130%` (또는 `html { font-size: 1.3rem }` base) 적용하면 전체 사이트에 영향이 크므로, **게임 플레이 화면(GameRoom)에만** 적용
- 게임 플레이 래퍼에 `text-base` → `text-lg` 수준으로 스케일링 클래스 추가

**파일: `src/pages/play/GameRoom.tsx`**
- 플레이 상태 래퍼에 `text-[1.3em]` 클래스 추가
- 신호 버튼: `h-12 w-12` → `h-16 w-16`, 아이콘 `w-5 h-5` → `w-7 h-7`
- 쿨다운 텍스트: `text-xs` → `text-base font-bold`

**파일: `src/components/tag-game/ChatDrawer.tsx`**
- 채팅 버튼: `size="icon"` 기본 → `h-16 w-16 rounded-full`, 아이콘 `w-7 h-7`

**파일: `src/components/tag-game/GameTimer.tsx`**
- 시계 아이콘: `w-4 h-4` → `w-6 h-6`
- 타이머 텍스트: `text-lg` → `text-2xl`
- 종료 버튼: `h-7` → `h-9`

**파일: `src/components/tag-game/TeamScoreboard.tsx`**
- `text-xs` → `text-sm`, 패딩 `px-3 py-1` → `px-4 py-1.5`

## 2. 버튼 겹침 방지

**파일: `src/pages/play/GameRoom.tsx`**
- 하단 버튼들(신호, 채팅)을 하나의 flex 컨테이너로 묶어 `bottom-8 left-4 right-4` 영역에 `justify-between`으로 배치
- 상단 타이머/스코어보드는 그대로 중앙 유지

## 3. 스마트폰 나침반 방향으로 지도 회전

**새 훅: `src/hooks/useDeviceHeading.ts`**
- `DeviceOrientationEvent`의 `alpha` (또는 `webkitCompassHeading`) 값을 구독
- iOS에서는 `DeviceOrientationEvent.requestPermission()` 호출 필요 → 권한 요청 처리
- heading 값(0~360도)을 state로 반환

**파일: `src/components/tag-game/TagGameMap.tsx`**
- `useDeviceHeading()` 훅 사용
- heading 변경 시 `map.setHeading(heading)` 호출로 지도를 사용자가 바라보는 방향으로 회전
- `mapRef`의 `heading` 옵션 활용 (Google Maps API `map.setHeading()`)
- 현재 사용자 마커에 방향 표시 (화살표 아이콘으로 변경, rotation 적용)

**파일: `src/pages/play/GameRoom.tsx`**
- 나침반 모드 토글 버튼 추가 (하단 버튼 바에 함께 배치)
- 활성화 시 heading 추적 시작, 비활성화 시 북쪽 고정(heading=0)

---

## 기술 상세

```text
하단 버튼 레이아웃:
┌──────────────────────────────┐
│          [Timer]             │  ← top center
│        [Scoreboard]          │
│                              │
│           (Map)              │
│                              │
│  [신호]  [나침반]    [채팅]  │  ← bottom bar, justify-between
└──────────────────────────────┘
```

- `useDeviceHeading` 은 `throttle` 처리 (100ms 간격)로 과도한 렌더링 방지
- iOS Safari에서 `DeviceOrientationEvent.requestPermission` 분기 처리
- Google Maps `map.setHeading(heading)` — heading은 북쪽 기준 시계방향 각도

