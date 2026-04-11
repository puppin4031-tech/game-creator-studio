

# 월드맵 나침반 모드 추가

## 개요
하단 HUD에 나침반 버튼을 추가하고, 활성화 시 스마트폰 방향에 맞게 지도가 회전하며 유저 마커 위에 방향 삼각형(DirectionCone)을 표시합니다.

## 구현 내용

### 1. `src/pages/WorldMap.tsx` 수정
- `useDeviceHeading` 훅과 `DirectionCone` 컴포넌트 import
- 나침반 활성 상태(`compassActive`) state 추가
- 나침반 버튼 클릭 시 `requestPermission()` 호출 후 활성화 토글
- **지도 회전**: `compassActive && heading !== null`일 때 GoogleMap `options.heading`을 heading 값으로 설정하고, `mapRef.current.setOptions({ heading })` 호출하여 지도를 실시간 회전
- **방향 삼각형**: 활성 시 `DirectionCone` 컴포넌트를 유저 위치에 은은한 초록색(`#22c55e`)으로 렌더링
- 하단 HUD 세공 버튼 옆에 나침반 아이콘 버튼 배치 (활성 시 색상 변경)

### 2. 수정 파일
- `src/pages/WorldMap.tsx` — 나침반 버튼 + 지도 회전 + DirectionCone 통합

### 기술 상세
- `useDeviceHeading(compassActive)`로 heading 값 수신
- heading 변경 시 `mapRef.current.setOptions({ heading: compassHeading })` 호출 (Google Maps API heading 속성으로 지도 자체를 회전)
- 비활성화 시 heading을 0으로 리셋하여 북쪽 정렬 복구
- DirectionCone은 기존 태그 게임에서 사용 중인 컴포넌트를 그대로 재사용

