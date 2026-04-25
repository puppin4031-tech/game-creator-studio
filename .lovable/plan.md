## 술래잡기 호출/방 공유 개선

### 진단

1. **호출 오버레이가 사용자 중앙에서 어긋남**
   `PingOverlay`의 외곽 컨테이너는 0×0 div이고, 자식 원에 `transform: translate(-50%, -50%)`만 걸려 있음. 카카오 `CustomOverlayMap`은 자식의 좌상단을 좌표에 배치하므로, 결과적으로 원이 좌표 기준 좌상단 방향으로 살짝 치우쳐 보임. → `xAnchor/yAnchor=0.5`로 컨테이너를 좌표 정중앙에 고정해야 함.

2. **호출시 팀원에게 좌표가 안 보일 수 있음 / 라이브 구독 누락**
   `sendPing()`에서 `supabase.channel('pings_'+room.id).send(...)` 로 **새 채널 인스턴스**를 매번 만들어 전송함. 해당 인스턴스는 `subscribe()`되지 않아 broadcast 송출이 누락되는 케이스 발생. 또한 수신 채널은 `useEffect` 의존성에 `myTeam`이 들어 있어 팀이 늦게 할당되면 재구독이 일어나며 그 사이의 ping을 놓칠 수 있음. → **수신/송신 채널을 ref로 공유**, `subscribe` 콜백에서 SUBSCRIBED 확인 후에만 ref 세팅, 의존성을 `room.id`로만 묶고 팀 필터는 ref(`myTeamRef`)로 처리.

3. **방 생성 후 링크 공유로 바로 입장 불가**
   현재 `WaitingRoom`에는 방 코드만 복사되고, URL 자체를 공유할 수 없음. `/play/:roomCode` 라우트는 이미 존재하나, 닉네임이 없으면 `GameRoom`이 즉시 `/play`로 리다이렉트시킴. → 링크로 들어온 사용자에게 닉네임 입력 후 자동 참여 화면을 보여주고, 입력 시 `rejoinRoom`으로 즉시 참여시켜야 함.

### 구현 변경

#### 1) `src/components/tag-game/PingOverlay.tsx` — 중앙 정렬 수정
- `<CustomOverlayMap>`에 `xAnchor={0.5} yAnchor={0.5}` 추가.
- 컨테이너 div를 0×0 anchor 박스로 만들고, 펄스 원은 `position:absolute; left:50%; top:50%; transform:translate(-50%,-50%)`로 항상 중앙에서 확장.
- 닉네임 라벨도 동일 패턴(중앙 상단 -28px)으로 정확 배치.

#### 2) `src/pages/play/GameRoom.tsx` — 라이브 구독 안정화
- `pingChannelRef = useRef<RealtimeChannel | null>(null)` 추가.
- 구독 useEffect 의존성 → `[room?.id, room?.status]`만 (myTeam 제거).
- `subscribe((status) => { if (status === 'SUBSCRIBED') pingChannelRef.current = channel; })` 패턴.
- `myTeamRef = useRef<number | null>(null)` 추가, `myTeam` 변경 시 ref 동기화. broadcast 수신 콜백은 `myTeamRef.current`로 팀 필터링.
- `sendPing`에서 새 채널을 만들지 않고 `pingChannelRef.current?.send(...)` 사용. 발신자 본인에게는 `setPings`로 즉시 표시(기존과 동일).
- 콘솔 로그(`[Ping] subscribed/sent/received`) 추가.

#### 3) `src/components/tag-game/WaitingRoom.tsx` — 방 링크 공유 버튼
- 코드 옆에 `Share2` 아이콘 버튼 추가.
- 클릭 시 `${window.location.origin}/play/${room.room_code}` URL을:
  - `navigator.share` 가능하면 네이티브 공유,
  - 아니면 클립보드 복사 + `toast.success('초대 링크가 복사되었습니다')`.

#### 4) `src/pages/play/GameRoom.tsx` — 링크 직접 진입 처리
- `nickname`이 sessionStorage에 없을 때 `/play`로 리다이렉트하던 로직 → **닉네임 입력 카드** 렌더로 변경.
- 카드: 방 제목/코드 표시 + 닉네임 입력 + "참여하기" 버튼.
- 참여 시 `useTagRoom`의 `rejoinRoom(roomCode, nickname)` 호출 → 성공하면 sessionStorage에 닉네임/플레이어ID 저장하고 그대로 게임 페이지 진입(같은 화면이 자동으로 WaitingRoom/GameMap으로 전환).

### 영향 범위
- DB/RLS/Realtime publication 변경 없음 (broadcast 채널만 사용).
- 같은 팀끼리만 핑이 보이는 정책 유지.
- 기존 sessionStorage 흐름·로비 동작 그대로.
- `/play/:roomCode` 직접 링크가 비로그인/세션 없는 신규 사용자에게도 작동.
