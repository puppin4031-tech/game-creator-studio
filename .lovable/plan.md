

## 경찰도둑 & 보물찾기 시뮬레이터 페이지 추가

기존 퍼즐 시뮬레이터(`/play/puzzle-sim`)와 동일한 패턴으로, DB 연결 없이 목(mock) 데이터로 게임 UI를 테스트할 수 있는 독립 시뮬레이터 2개를 만듭니다.

### 1. 경찰도둑(술래잡기) 시뮬레이터 — `/play/tag-sim`

**파일:** `src/pages/play/TagSimulator.tsx`

- 목 데이터: 가짜 방(room), 가짜 플레이어 6명(팀1 3명, 팀2 3명)을 메모리에 생성
- 내 캐릭터를 MockControls로 이동 가능
- 상대팀 플레이어는 랜덤하게 소폭 이동하는 간단한 AI
- TagGameMap 컴포넌트를 직접 렌더 (mock props 전달)
- 상단 바: 팀 점수, 타이머(설정 가능), 방 코드 표시
- 10m 이내 접근 시 "잡기" 버튼 활성화 → 클릭하면 toast로 결과 표시
- 핑 신호 버튼도 로컬에서 작동

### 2. 보물찾기 시뮬레이터 — `/play/treasure-sim`

**파일:** `src/pages/play/TreasureSimulator.tsx`

- 목 데이터: 가짜 방, 가짜 플레이어 4명, 가짜 보물 8~10개(다이아몬드, 금, 루비, 퀴즈, 퍼즐, 열쇠, 상자 등)를 현재 위치 주변에 랜덤 배치
- MockControls로 이동하며 근접 글로우 효과 확인 가능
- 삽 버튼으로 보물 발굴 → 퀴즈/퍼즐 챌린지 팝업 작동
- TreasureHUD, ShovelButton, ProximityGlow, TreasureQuizPopup 등 기존 컴포넌트를 직접 조합
- useTreasureHunt 훅 대신 로컬 상태로 보물/점수 관리하는 자체 로직

### 3. 라우팅 및 진입점

- `src/App.tsx`에 `/play/tag-sim`, `/play/treasure-sim` 라우트 추가
- `src/pages/play/Lobby.tsx` 하단에 "시뮬레이터" 섹션 추가 (퍼즐 시뮬 옆에 술래잡기 시뮬, 보물찾기 시뮬 버튼)

### 변경 파일 목록

| 파일 | 작업 |
|---|---|
| `src/pages/play/TagSimulator.tsx` | 신규 생성 |
| `src/pages/play/TreasureSimulator.tsx` | 신규 생성 |
| `src/App.tsx` | 라우트 2개 추가 |
| `src/pages/play/Lobby.tsx` | 시뮬레이터 진입 버튼 추가 |

### 기술 세부사항

- DB 호출 없음 — 모든 데이터는 `useState`/`useRef`로 로컬 관리
- 카카오맵 렌더링은 기존 `react-kakao-maps-sdk` 사용
- 기본 위치는 서울 시청(37.5665, 126.978) 기준, MockControls로 이동
- 보물찾기 시뮬의 챌린지(퀴즈/퍼즐)는 `quizPresets.ts`의 기존 프리셋 활용
- framer-motion 애니메이션은 기존 컴포넌트(ProximityGlow, ChestVictoryOverlay 등) 재활용

