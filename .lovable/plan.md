

## Plan: GlobalMapView에 스팟 표시 + 클릭 시 스팟 관리로 이동

### 현재 상태
- `GlobalMapView`는 regions(행정구역)과 missions(미션 핀)만 표시
- `SpotManagement`와 `SpotDetail`에서는 스팟 사각형과 요소 마커가 잘 구현되어 있음

### 변경 사항

**1. GlobalMapView.tsx 수정**
- `spots` 테이블 데이터를 추가로 fetch (bounds + theme_id + name 포함)
- `themes` 테이블도 fetch하여 스팟의 테마 색상 매핑
- 각 스팟을 `L.rectangle`로 지도에 표시 (테마 색상 적용, 테마 없으면 기본 회색)
- 스팟 사각형에 이름 tooltip 표시
- 스팟 클릭 시:
  - 테마 미설정 → 테마 선택 팝업(popup) 표시 (select + 저장 버튼)
  - 테마 설정됨 → `/admin/exodus/spots` 페이지로 이동하면서 해당 스팟 ID를 query param으로 전달 (예: `?spotId=xxx`)

**2. SpotManagement.tsx 수정**
- URL query param `spotId`가 있으면 해당 스팟을 자동으로 `selectedSpot`으로 설정하여 `SpotDetail` 화면으로 바로 진입
- 이를 통해 GlobalMapView에서 클릭 → 스팟 관리 페이지의 상세 뷰로 직접 이동

**3. SpotDetail (변경 없음)**
- 이미 스팟 경계 사각형 + 요소 마커가 지도에 표시되어 있어 직관적으로 확인 가능

### 기술 요약
- `react-router-dom`의 `useNavigate`와 `useSearchParams` 활용
- GlobalMapView에서 `L.rectangle` 클릭 이벤트로 네비게이션 처리
- 테마 미설정 스팟은 popup 내 select로 테마 지정 후 이동

