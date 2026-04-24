

## 같은 팀만 보이도록 시야 제한

### 변경 파일
`src/components/tag-game/TagGameMap.tsx`

### 수정 내용
`visiblePlayers` useMemo의 필터 로직 단순화:

**현재 (28-37줄):**
```typescript
const visiblePlayers = useMemo(() => {
  return players.filter(p => {
    if (p.id === currentPlayerId) return false;
    if (p.team === myTeam) return true;
    const dist = haversineDistance(...);
    return dist <= 1000; // ← 다른 팀도 1km 내면 보임
  });
}, [players, currentPlayerId, myTeam, position.latitude, position.longitude]);
```

**변경 후:**
```typescript
const visiblePlayers = useMemo(() => {
  return players.filter(p => {
    if (p.id === currentPlayerId) return false; // 본인 제외
    return p.team === myTeam; // 같은 팀만
  });
}, [players, currentPlayerId, myTeam]);
```

### 부수 정리
- `haversineDistance`, `position` import/의존성 더 이상 필요 없음 → 제거
- 단, `position`은 `center` 계산과 자기 마커 표시에 여전히 필요하므로 **유지**
- `haversineDistance` import만 제거 (다른 곳에서 안 쓰면)

### 영향
- ✅ 1팀은 1팀원만, 2팀은 2팀원만 지도에서 확인 가능
- ✅ 미배정(team === null) 플레이어 끼리도 같은 그룹으로만 보임
- ✅ 본인 마커, 1km 반경 원, 핑(PingOverlay), 나침반 등 다른 기능은 영향 없음
- ✅ DB/Realtime 변경 없음 — 순수 클라이언트 필터링

### 참고
- 채팅(`ChatDrawer`)의 팀 채널은 별개 시스템이므로 그대로 유지
- 신호(Ping)는 현재 팀원에게만 보내지는 구조라면 그대로 OK (필요 시 별도 검토 가능)

