

## 보물찾기 모드 구현 계획

이전에 승인된 보물찾기 기본 구조 위에, 사용자가 요청한 **근접 거리별 시각 효과**와 **보물 발견 UI**를 구현합니다.

### 핵심 UX 흐름

```text
30m 이내 → 화면 테두리 초록색 글로우 반짝임
10m 이내 → 화면 테두리 노란색 글로우 반짝임
 5m 이내 → 화면 중앙에 보물 오브제(글로우+그림자) 등장
           + "보물찾기 시도" 버튼 표시
           → 클릭 시 퀴즈 팝업
           → 정답: 키워드 획득 (선착순)
           → 오답: 15초 쿨타임 (비활성화 + 타이머 표시)
```

### DB 변경 (마이그레이션)

1. **`tag_rooms`에 `game_mode` 컬럼 추가** — `'tag'`(기본값) 또는 `'treasure'`
2. **`treasure_items` 테이블 생성**:
   - `id`, `room_id` (FK → tag_rooms), `keyword` (보물 키워드)
   - `latitude`, `longitude` (보물 위치)
   - `quiz_question`, `quiz_answer` (퀴즈)
   - `found_by` (nullable, 찾은 플레이어 ID)
   - `found_at` (nullable, 찾은 시간)
   - RLS: anon/authenticated 모두 SELECT/INSERT/UPDATE 가능 (tag 게임과 동일한 공개 정책)
   - Realtime 활성화 (선착순 갱신 실시간 반영)

### 수정/생성 파일

| 파일 | 설명 |
|---|---|
| **DB 마이그레이션** | `game_mode` 컬럼 + `treasure_items` 테이블 |
| `src/hooks/useTagRoom.ts` | `TagRoom` 인터페이스에 `game_mode` 추가, `createRoom`에 모드 파라미터 |
| `src/pages/play/Lobby.tsx` | 방 생성 시 모드 선택 (술래잡기/보물찾기) UI |
| `src/components/tag-game/WaitingRoom.tsx` | 보물찾기 모드일 때 보물 등록 UI (키워드, 위치, 퀴즈) 표시 |
| **새: `src/hooks/useTreasureHunt.ts`** | 보물 CRUD, 근접 거리 계산, 퀴즈 정답 처리, 실시간 구독 |
| **새: `src/components/treasure/ProximityGlow.tsx`** | 화면 테두리 글로우 효과 (30m=초록, 10m=노란) |
| **새: `src/components/treasure/TreasureReveal.tsx`** | 5m 이내 보물 오브제 + "보물찾기 시도" 버튼 + 쿨타임 |
| **새: `src/components/treasure/TreasureQuizPopup.tsx`** | 퀴즈 다이얼로그, 정답/오답 처리 |
| **새: `src/components/treasure/TreasureHUD.tsx`** | 상단 키워드 현황 표시 (🔑 3/8) |
| **새: `src/components/treasure/TreasureSetup.tsx`** | 대기실 방장용 보물 등록 폼 |
| **새: `src/components/treasure/TreasureGameMap.tsx`** | 보물찾기 전용 지도 (보물 마커 미표시, 근접 시에만 반응) |
| `src/pages/play/GameRoom.tsx` | `game_mode`에 따라 태그/보물찾기 뷰 분기 |
| `src/index.css` (또는 tailwind.config.ts) | 글로우 애니메이션 keyframes 추가 |

### 주요 컴포넌트 상세

#### ProximityGlow (화면 테두리 글로우)
- `position: fixed` 전체화면 오버레이, `pointer-events: none`
- `box-shadow: inset 0 0 60px` 으로 테두리 글로우 구현
- 30m 이내: 초록색 (`#22c55e`) 맥동 애니메이션 (1.5초 주기)
- 10m 이내: 노란색 (`#eab308`) 더 강한 맥동
- 거리에 따라 글로우 강도(opacity) 점진적 변화

#### TreasureReveal (5m 보물 오브제)
- 화면 중앙에 보물상자 이모지/SVG 오브제 등장
- CSS `filter: drop-shadow()` + `box-shadow` 글로우 효과
- 빛 파티클: CSS keyframe으로 여러 작은 원이 원형 궤도로 회전
- 아래에 "보물찾기 시도" 버튼
- 보물 오브제 클릭 또는 버튼 클릭 모두 퀴즈 팝업 트리거
- 오답 시: 버튼 비활성화 + 15초 카운트다운 표시, 오브제도 흐리게 처리

#### TreasureQuizPopup (퀴즈)
- Dialog 컴포넌트 사용
- 퀴즈 질문 표시 + 텍스트 입력
- 정답: 축하 애니메이션 + 키워드 표시 + DB 업데이트 (`found_by` 설정)
- 오답: "틀렸습니다!" + 15초 쿨타임 시작
- 선착순 보호: update 시 `found_by IS NULL` 조건 (이미 찾은 경우 실패 처리)

#### TreasureHUD (상단 키워드 현황)
- 게임 화면 상단바에 자신이 찾은 키워드 목록과 전체 개수 표시
- 예: `🔑 내 키워드: 사과, 바나나 (2/8)`

### 근접 감지 로직 (`useTreasureHunt`)
```typescript
// 매 위치 업데이트마다 모든 미발견 보물과 거리 계산
const nearestTreasure = treasures
  .filter(t => !t.found_by)
  .map(t => ({ ...t, distance: haversineDistance(...) }))
  .sort((a, b) => a.distance - b.distance)[0];

// 가장 가까운 보물 기준으로 글로우 단계 결정
proximityLevel = distance <= 5 ? 'close' : distance <= 10 ? 'near' : distance <= 30 ? 'far' : null;
```

