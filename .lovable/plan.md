

## 문제 분석

1. **방장이 뒤로갔다 돌아오면 새로 입장해야 하는 문제**: 방을 나갔다가 다시 로비에서 자기 방 코드로 참여하면 새 플레이어로 추가됨. 기존 세션을 인식하지 못함.
2. **방 삭제 기능 없음**: 방장이 만든 방을 삭제할 수 없어 "대기 중인 방" 목록에 유령 방이 쌓임.

## 개선 계획

### 1단계: 세션 복귀 기능 (자동 재진입)

- `sessionStorage`에 `tag_room_code`와 `tag_player_id`를 저장
- **Lobby.tsx**: 페이지 진입 시 저장된 방 코드가 있으면 "내 방으로 돌아가기" 버튼을 상단에 표시
- **GameRoom.tsx**: 닉네임+방코드로 기존 플레이어를 DB에서 조회, 있으면 새로 insert하지 않고 기존 player로 복귀
- **useTagRoom.ts**: `rejoinRoom` 함수 추가 — 닉네임으로 기존 플레이어 검색 후, 있으면 해당 플레이어 반환 (없으면 새로 insert)

### 2단계: 방 삭제 기능

- **DB 마이그레이션**: `tag_rooms`에 DELETE RLS 정책 추가 (anon, authenticated 모두 허용)
- **useTagRoom.ts**: `deleteRoom` 함수 추가 — 방 삭제 시 관련 플레이어/메시지도 cascade 또는 수동 삭제
- **WaitingRoom.tsx**: 방장에게만 "방 삭제" 버튼 표시 (설정 영역 또는 뒤로가기 옆)
- **Lobby.tsx**: 방장이 뒤로가기 시 "방을 유지할까요?" 확인 없이, 로비에서 삭제 가능하도록

### 3단계: 로비에서 "내 방" 표시

- 로비의 대기 중인 방 목록에서 내가 이미 참여 중인 방은 "참여" 대신 **"돌아가기"** 버튼으로 표시
- 목록 상단에 내 방을 별도로 강조 표시

## 수정 파일

| 파일 | 변경 내용 |
|---|---|
| `supabase migration` | `tag_rooms` DELETE 정책 추가, `tag_players`/`tag_messages`에 `room_id` FK cascade 추가 |
| `src/hooks/useTagRoom.ts` | `rejoinRoom`, `deleteRoom` 함수 추가 |
| `src/pages/play/Lobby.tsx` | 세션 기반 "내 방 돌아가기" 버튼, 방 목록에서 내 방 구분 |
| `src/pages/play/GameRoom.tsx` | 입장 시 기존 플레이어 조회 후 복귀 로직 |
| `src/components/tag-game/WaitingRoom.tsx` | 방장용 "방 삭제" 버튼 추가 |

