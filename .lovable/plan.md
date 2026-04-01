

## Plan: GPS 술래잡기 팀전 시스템 구축

### 개요
닉네임만 입력하면 바로 참여 가능한 실시간 GPS 술래잡기 팀전 게임. 방 만들기 → 팀 나누기 → 게임 시작/종료 → 실시간 위치 공유 + 팀/전체 채팅.

### 새로운 DB 테이블 (4개)

**1. `tag_rooms`** — 방 정보
- id, room_code (6자리 코드), title, host_id (text), status (waiting/playing/ended), timer_seconds, team1_name, team2_name, created_at

**2. `tag_players`** — 참가자
- id, room_id (FK → tag_rooms), nickname, team (1 or 2), latitude, longitude, updated_at, is_caught (boolean), is_host (boolean)

**3. `tag_messages`** — 채팅
- id, room_id (FK → tag_rooms), sender_nickname, message, channel (team1/team2/all), created_at

Realtime 활성화: `tag_players`, `tag_messages` 테이블

RLS: 모든 테이블에 anon/authenticated 접근 허용 (닉네임 기반이므로 별도 인증 없음)

### 새로운 페이지 & 컴포넌트

**1. `/play` — 로비 페이지**
- 닉네임 입력
- "방 만들기" 버튼 → 방 제목 입력 → 방 코드 생성
- "방 참여" 버튼 → 방 코드 입력하여 참가

**2. `/play/:roomCode` — 게임 방 페이지**
- **대기 상태**: 참가자 목록, 방장이 팀1/팀2 이름 설정, 참가자 팀 배정, 게임 시작 버튼
- **게임 중**: 
  - 전체 화면 Google Map에 GPS 위치 표시
  - 같은 팀원은 항상 보임, 상대팀은 반경 1km 내일 때만 보임
  - 상단: 타이머 (카운트다운), 팀별 생존자 수
  - 하단: 채팅 버튼
- **게임 종료**: 결과 화면

**3. 채팅 컴포넌트**
- 팀 채팅 탭 + 전체 채팅 탭
- 방장만 전체 채팅 가능, 일반 참가자는 팀 채팅만
- Supabase Realtime 구독으로 실시간 메시지

**4. 위치 공유 시스템**
- `useGeolocation` 훅으로 GPS 추적
- 5초마다 `tag_players` 테이블에 위치 업데이트
- Realtime 구독으로 다른 플레이어 위치 수신
- 같은 팀: 항상 마커 표시 / 상대팀: 1km 내일 때만 표시

### 라우팅 변경 (`App.tsx`)
- `/play` → 로비 페이지
- `/play/:roomCode` → 게임 방 페이지
- 기존 `/` (Index) 및 `/admin` 루트는 유지

### 파일 구조
```text
src/pages/play/
  Lobby.tsx          — 닉네임 입력 + 방 생성/참여
  GameRoom.tsx       — 게임 방 메인 (대기/진행/종료)

src/components/tag-game/
  WaitingRoom.tsx    — 대기실 UI (팀 배정, 설정)
  TagGameMap.tsx     — 게임 지도 (팀별 마커, 1km 범위)
  GameTimer.tsx      — 타이머 + 상태바
  ChatDrawer.tsx     — 팀/전체 채팅 Drawer
  TeamScoreboard.tsx — 팀별 생존자 현황

src/hooks/
  useTagRoom.ts      — 방 CRUD, Realtime 구독
  useLocationShare.ts — 위치 공유 (주기적 업데이트 + 수신)
```

### 기술 세부사항

- 인증 없이 닉네임 + 방 코드로 식별 → RLS는 `anon` role에도 허용 필요
- 위치 업데이트: `setInterval` 5초 주기로 `tag_players` upsert
- 상대팀 1km 필터: 클라이언트 사이드에서 haversine 계산 (기존 `src/lib/haversine.ts` 활용)
- 타이머: 방장이 설정한 시간 기준, 클라이언트에서 `tag_rooms.timer_seconds` + 시작 시간으로 계산
- Realtime: `tag_players` 위치 변경 + `tag_messages` 새 메시지 구독

