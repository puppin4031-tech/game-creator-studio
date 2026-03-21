

## Plan: Leaflet → Google Maps API 전환

### 개요
현재 6개 파일에서 Leaflet + OpenStreetMap을 사용 중입니다. 모두 Google Maps JavaScript API로 전환합니다.

### 사전 설정

**1. Google Maps API 키 저장**
- `index.html`에 Google Maps JavaScript API 스크립트 태그 추가
- API 키: `AIzaSyAmcQFVJEnMMWyDHfKjGuDxEvxn9o6kpt4` (공개 키이므로 코드에 직접 포함)

**2. 라이브러리 설치**
- `@react-google-maps/api` 패키지 추가 (React용 Google Maps 래퍼)
- `leaflet` 패키지 제거

### 파일별 변경

**3. 공통 Google Maps Provider 생성**
- `src/components/GoogleMapsProvider.tsx` 생성
- `LoadScript` 또는 `useJsApiLoader`로 API 로드 관리
- 앱 전체에서 한 번만 로드되도록 래핑

**4. GlobalMapView.tsx 전환**
- `L.map` → `GoogleMap` 컴포넌트
- `L.rectangle` (regions, spots) → `Rectangle` 컴포넌트
- `L.marker` (missions) → `Marker` 컴포넌트
- 스팟 클릭 시 테마 선택 팝업 → `InfoWindow` 컴포넌트
- 기존 로직(테마 설정, 네비게이션) 유지

**5. SpotManagement.tsx 전환**
- 지도 초기화 → `GoogleMap` 컴포넌트
- 스팟 사각형 → `Rectangle` 컴포넌트
- 드래그 드로잉 → `DrawingManager` 또는 커스텀 마우스 이벤트로 사각형 그리기
- URL param 자동 선택 로직 유지

**6. SpotDetail.tsx 전환**
- 스팟 경계 → `Rectangle` 컴포넌트
- 요소 마커 → `Marker` (draggable) 컴포넌트
- 마커 드래그/우클릭 이벤트 유지
- 배치 모드 클릭 → `GoogleMap`의 `onClick` 이벤트

**7. GameMap.tsx 전환**
- 유저 위치 마커 + 반경 원 → `Marker` + `Circle`
- 스팟 마커 → `Marker` with custom icon
- 실시간 위치 업데이트 유지

**8. SubRegionMap.tsx 전환**
- 지역 경계 사각형 → `Rectangle`
- 미션 마커 → `Marker`
- `maxBounds` → `restriction` 옵션

**9. CreateMission.tsx 전환**
- 클릭 위치 마커 → `Marker`
- 지도 클릭 이벤트 → `GoogleMap` `onClick`

### 기술 세부사항

- Google Maps 스타일: 기본 로드맵 사용
- 커스텀 마커: SVG 기반 아이콘 유지 (Google Maps의 `icon` 속성 활용)
- 사각형 드로잉: `google.maps.drawing.DrawingManager` 라이브러리 사용
- Leaflet CSS import 모두 제거

