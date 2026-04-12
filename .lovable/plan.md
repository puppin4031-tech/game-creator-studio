

# Google Maps → 카카오맵 전체 마이그레이션 계획

## 개요
`@react-google-maps/api`를 제거하고 `react-kakao-maps-sdk`로 전환합니다. 카카오 JavaScript API 키: `19011b5025994c098412aad00af53134`

## 사전 작업
1. `react-kakao-maps-sdk` 패키지 설치, `@react-google-maps/api` 제거
2. `index.html`에 카카오맵 SDK 스크립트 추가

## 수정 대상 파일 (총 12개)

### Provider & 진입점
| 파일 | 변경 내용 |
|---|---|
| `index.html` | 카카오 SDK `<script>` 태그 추가 |
| `src/components/GoogleMapsProvider.tsx` | `KakaoMapProvider`로 교체 (`useKakaoLoader` 사용) |
| `src/App.tsx` | import 경로만 변경 |

### 플레이어 지도 (핵심)
| 파일 | 변경 내용 |
|---|---|
| `src/pages/WorldMap.tsx` | `Map` + `MapMarker` + `Circle` 전환. 나침반 모드(150vmax 회전) 유지. `google.maps.Symbol` → `CustomOverlayMap`으로 화살표 마커 구현 |
| `src/components/game/GameMap.tsx` | `Map` + `MapMarker` + `Circle` 전환 |
| `src/components/tag-game/TagGameMap.tsx` | `Map` + `Circle` + `CustomOverlayMap` 전환 |
| `src/components/tag-game/DirectionCone.tsx` | `OverlayView` → `CustomOverlayMap` 전환 |
| `src/components/tag-game/PingOverlay.tsx` | `google.maps.Circle/Marker` 직접 생성 → `kakao.maps.Circle` + `CustomOverlay` 전환 |
| `src/components/treasure/TreasureGameMap.tsx` | `Map` + `MapMarker` 전환 |
| `src/components/treasure/TreasureSetup.tsx` | `Map` + `MapMarker` 전환, 클릭 이벤트 핸들러 시그니처 변경 |

### 관리자 지도
| 파일 | 변경 내용 |
|---|---|
| `src/pages/admin/GlobalMapView.tsx` | `Map` + `Rectangle` + `MapMarker` + 카카오 `InfoWindow` 전환 |
| `src/pages/admin/SubRegionMap.tsx` | `Map` + `Rectangle` + `MapMarker` 전환 |
| `src/pages/admin/exodus/SpotManagement.tsx` | `Map` + `Rectangle` 전환. 드래그 드로잉은 `kakao.maps` 이벤트로 재구현 |
| `src/components/admin/exodus/SpotDetail.tsx` | `Map` + `Rectangle` + `MapMarker`(드래그) 전환 |

## 주요 API 매핑

```text
Google Maps                    →  카카오맵
─────────────────────────────────────────────
<GoogleMap>                    →  <Map>
<Marker>                       →  <MapMarker> 또는 <CustomOverlayMap>
<Circle>                       →  <Circle>
<Rectangle>                    →  <Rectangle>
<InfoWindow>                   →  <CustomOverlayMap>
<OverlayView>                  →  <CustomOverlayMap>
google.maps.Size               →  제거 (카카오는 image 속성 사용)
google.maps.Point              →  offset 객체 사용
google.maps.SymbolPath          →  CustomOverlayMap + SVG div
google.maps.event.addListener  →  kakao.maps.event.addListener
e.latLng.lat()                 →  latlng.getLat()
e.latLng.lng()                 →  latlng.getLng()
map.panTo()                    →  map.panTo(new kakao.maps.LatLng())
map.fitBounds()                →  map.setBounds(new kakao.maps.LatLngBounds())
map.setCenter()                →  map.setCenter(new kakao.maps.LatLng())
```

## 나침반 모드 (WorldMap.tsx)
기존 CSS 회전 로직(`150vmax`, LERP, accumulated angle) 그대로 유지. 변경점:
- `<Map>` 컴포넌트를 회전 컨테이너 안에 배치
- 화살표 마커를 `<CustomOverlayMap>`의 회전 SVG div로 구현 (rotation = heading)

## PingOverlay 전환
`google.maps.Circle` / `google.maps.Marker` 직접 생성 → `kakao.maps.Circle` / `kakao.maps.CustomOverlay` 직접 생성으로 전환. 애니메이션 로직(requestAnimationFrame)은 동일하게 유지.

## SpotManagement 드로잉
`google.maps` 이벤트 리스너 → `kakao.maps.event.addListener(map, 'mousedown/mousemove/mouseup')` + `kakao.maps.Rectangle` 직접 생성으로 전환.

## 타입 안전
`google.maps` 네임스페이스 참조를 모두 `kakao.maps`로 변경. `react-kakao-maps-sdk`가 제공하는 타입 사용.

