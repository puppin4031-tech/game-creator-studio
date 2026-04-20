

분석 결과, 사용자가 제시한 방향성은 현재 코드 구조와 100% 호환됩니다. 기존 `useTagRoom.ts`, `Lobby.tsx`, `useLocationShare.ts`, `GameRoom.tsx`를 갈아엎지 않고 누락된 부분만 보강하면 됩니다.

## 구현 계획 (4파일 수정)

### 1. `src/pages/play/Lobby.tsx` — 로비 실시간화
- 기존 `fetchOpenRooms()` 1회 호출 유지
- `useEffect`에 Supabase 채널 2개 추가:
  - `tag_rooms` (INSERT/UPDATE/DELETE) → `fetchOpenRooms()` 재호출
  - `tag_players` (INSERT/DELETE) → `fetchOpenRooms()` 재호출 (인원 수 갱신)
- 언마운트 시 채널 정리

### 2. `src/hooks/useTagRoom.ts` — 구독 race condition 차단
- 기존 3개 채널(`tag_players`, `tag_messages`, `tag_rooms`) 구조 유지
- 각 `.subscribe()` 콜백에서 `status === 'SUBSCRIBED'` 확인 시:
  - players/messages 채널 → `fetchPlayers(room.id)`, `fetchMessages(room.id)` 재호출
  - room 채널 → `fetchRoom(room.room_code)` 재호출
- `console.log` 디버그 (수신 이벤트, 구독 상태) 임시 추가 → 추후 제거 가능

### 3. `src/hooks/useLocationShare.ts` — 스마트 전송 로직
- 기존 `setInterval` 5초 + 좌표 동일성 체크 **제거**
- 새 로직 (haversine 거리 사용 — `src/lib/haversine.ts` 이미 존재):
  - GPS position 변경 감지 useEffect → 마지막 전송 위치 대비 **2m 이상 이동** 시 즉시 전송
  - 별도 `setInterval(1000)` heartbeat → **마지막 전송 후 5초 경과** 시 현재 위치 전송 (정지 상태 생존 신고)
  - `isActive` true 전환 후 첫 5초간은 1초 간격 강제 전송 (Fast Sync)
- ref 활용: `lastSentAt`, `lastSentPos`, `activatedAt`

### 4. `src/pages/play/GameRoom.tsx` — 전환 UX
- 방장의 "시작"/"종료" 버튼 클릭 시 로컬 `isPending` state로 즉시 비활성화 + Spinner 표시
- Realtime으로 `room.status` 변경 수신되면 자동 해제 (useEffect로 status 의존성)
- 중복 클릭 차단

## 영향 없음
- DB 스키마 변경 없음 (모든 필요 테이블이 이미 supabase_realtime publication에 등록됨)
- WaitingRoom, ChatDrawer, TagGameMap, TreasureGameMap, 나침반, 채팅 로직 모두 그대로
- /world 페이지 영향 없음

## 기대 결과

| 시나리오 | 현재 | 개선 후 |
|---|---|---|
| 로비에서 새 방 생성 감지 | 새로고침 필요 | 즉시 표시 |
| 로비에서 인원 수 변동 | 새로고침 필요 | 즉시 갱신 |
| 대기실에 다른 유저 입장 | 가끔 누락 | 100% 즉시 반영 |
| 방장 시작 버튼 → 다른 유저 화면 | 가끔 누락 | 즉시 게임 화면 전환 |
| 다른 유저 마커 이동 | 5초+ 멈춤 | 1~2초 내 부드러운 이동 |
| 가만히 서 있는 유저 | 사라진 듯 보임 | 5초 heartbeat로 항상 활성 |
| 게임 시작 직후 마커 위치 | 부정확 | 5초간 빠른 동기화로 정확 |

