

## 문제 분석

### 나침반 모드가 모바일에서 작동하지 않는 이유
Google Maps JavaScript API의 `map.setHeading()`은 **벡터 맵(mapId 필요)**에서만 작동합니다. 현재 코드에는 `mapId`가 설정되어 있지 않아 `setHeading` 호출이 **무시**됩니다. 벡터 맵 설정은 Google Cloud Console에서 Map ID를 생성해야 하므로 복잡합니다.

### 해결 방향
지도 전체를 회전시키는 대신, **내 마커 위에 방향 삼각형(cone)**을 표시하는 방식으로 변경합니다. 이 방식이 Google Maps 블루닷과 동일한 UX이며, mapId 없이도 작동합니다.

## 수정 계획

### 1. 방향 삼각형 오버레이 컴포넌트 생성
**새 파일: `src/components/tag-game/DirectionCone.tsx`**
- Google Maps `OverlayView`를 사용하여 내 위치에 SVG 삼각형(부채꼴 cone)을 렌더링
- `heading` 값에 따라 CSS `transform: rotate()`로 실시간 회전
- 반투명 팀 색상으로 표시 (예: 파란 부채꼴)

### 2. TagGameMap에 DirectionCone 추가
**수정: `src/components/tag-game/TagGameMap.tsx`**
- `map.setHeading()` 호출 제거 (벡터 맵 없이는 동작하지 않으므로)
- `isCompassActive && heading !== null`일 때 `DirectionCone` 컴포넌트를 내 위치에 렌더링
- 내 마커 아이콘도 나침반 모드일 때 방향에 맞게 회전하는 화살표로 변경

### 3. useDeviceHeading 개선
**수정: `src/hooks/useDeviceHeading.ts`**
- Android에서 `deviceorientationabsolute` 이벤트 우선 사용 (절대 방위각, 더 정확)
- `deviceorientation` fallback 유지
- 권한 요청 시 사용자에게 결과를 toast로 알림

## 수정 파일 요약

| 파일 | 변경 |
|---|---|
| `src/components/tag-game/DirectionCone.tsx` | 새로 생성 — heading 기반 방향 삼각형 오버레이 |
| `src/components/tag-game/TagGameMap.tsx` | setHeading 제거, DirectionCone 추가, 내 마커에 방향 표시 |
| `src/hooks/useDeviceHeading.ts` | `deviceorientationabsolute` 우선 사용으로 Android 호환성 개선 |

