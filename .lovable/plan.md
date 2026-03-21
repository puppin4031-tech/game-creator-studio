

## 🎮 위치 기반 AR 방탈출 게임 MVP - 구현 계획

### Phase 1: 전체 구조 및 기본 UI

**메인 지도 화면**
- Leaflet.js 전체 화면 지도 + 사용자 위치 커스텀 마커
- 실시간 GPS 위치 추적 (Geolocation API)
- spots 데이터 기반 마커 표시

**하단 플로팅 바**
- 내 가방(인벤토리), 현재 퀘스트, 주변 탐색 버튼
- 각 버튼 클릭 시 Sheet/Drawer UI 오픈

**Supabase 데이터베이스**
- `spots` 테이블: 위도, 경도, 층수, 힌트, 아이템 정보
- `user_inventory` 테이블: 유저별 획득 아이템
- `game_logs` 테이블: 방문 기록, 타임스탬프

**테스트용 Mock 이동 버튼**
- 화면 구석에 북/남/동/서 가짜 위치 이동 버튼 배치

---

### Phase 2: AR 카메라 & 위치 인터랙션

**거리 계산 로직**
- GPS 좌표 ↔ spot 좌표 간 거리 계산 (Haversine)
- 10m 이내 시 "탐색 가능" 상태 활성화

**카메라 프리뷰 화면**
- 탐색 버튼 → 풀스크린 카메라 비디오 오픈
- 카메라 위에 투명 오버레이 레이어 (AR 객체 배치용)
- 아이템 획득 버튼 → Supabase 저장 + 애니메이션 피드백

**Hooks 분리 (Capacitor 대비)**
- `useGeolocation` - 위치 센서
- `useCamera` - 카메라 접근
- `useSpotDetection` - 근처 spot 감지

---

### Phase 3: 층수 시스템 & 퀴즈

**층수 UI**
- 우측 상단 현재 층수 표시 + 층수 선택 드롭다운
- 층수별 spot 필터링 (해당 층에서만 활성화)

**QR 스캔 시뮬레이션**
- 카메라 화면 내 "QR 인식" 버튼
- 클릭 시 해당 층 데이터 로드 → 힌트 팝업

**게임다운 애니메이션**
- 모든 팝업/모달에 슬라이드, 페이드, 바운스 효과
- 아이템 획득 시 파티클 느낌의 피드백

---

### 기술 스택
- **프론트엔드**: React + Tailwind + Lucide Icons + Leaflet.js
- **백엔드**: Supabase (DB, Auth, Realtime)
- **카메라**: Web Camera API (getUserMedia)
- **위치**: Geolocation API + Haversine 거리 계산

