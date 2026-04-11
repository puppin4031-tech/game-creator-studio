

# 월드맵 나침반 모드 수정 — 빈 화면 + 화살표 방향

## 문제
1. 지도 회전 시 모서리에 흰 바탕 노출 (`scale: 1.42`로 부족)
2. 화살표 마커가 지도와 함께 회전되어 12시 방향 고정이 안 됨

## 수정 내용 (`src/pages/WorldMap.tsx`)

### 1. 지도 컨테이너 CSS 변경
현재 `width/height: 100%` + `scale: 1.42` 방식을 **150vmax 거대 정사각형 + translate 센터링** 방식으로 교체:
```tsx
<div style={{
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: '150vmax',
  height: '150vmax',
  transform: `translate(-50%, -50%) rotate(${mapRotation}deg)`,
  transition: 'transform 0.15s linear',
}}>
```
- `scale` 속성 제거
- 화면 대각선보다 큰 사이즈로 회전 시 빈 모서리 완전 방지

### 2. 화살표 마커를 Google Maps Symbol로 변경
기존 SVG 이미지 URL(`userArrowIcon`) 대신 **`google.maps.Symbol`** 객체 사용:
```tsx
<Marker
  icon={compassActive && heading !== null
    ? {
        path: 'M 0,-16 L 12,16 L 0,10 L -12,16 Z',
        fillColor: '#4ade80',
        fillOpacity: 1,
        strokeColor: 'white',
        strokeWeight: 2,
        scale: 1.2,
        rotation: heading,  // 지도 CSS 회전을 상쇄하여 항상 12시 방향
      }
    : { url: userDotIcon, ... }
  }
/>
```
- Symbol의 `rotation` 속성에 `heading` 값을 넣으면 지도의 `-heading` CSS 회전과 상쇄되어 화살표가 항상 화면 위쪽(12시)을 가리킴

### 수정 파일
- `src/pages/WorldMap.tsx` (1개 파일만 수정)

