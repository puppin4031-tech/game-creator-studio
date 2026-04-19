

## 팀 배정 + 변경 모두 가능 + 모바일 반응성 개선

### 동작 (잘못 배정해도 자유롭게 수정 가능)

| 위치 | 가능한 액션 |
|---|---|
| 미배정 영역 | [1팀] [2팀] 버튼으로 팀 지정 |
| 1팀 카드 안 | [→ 2팀] 이동 / [미배정] 되돌리기 |
| 2팀 카드 안 | [→ 1팀] 이동 / [미배정] 되돌리기 |
| 호스트 본인 | 동일하게 자유 이동 (Crown 아이콘은 유지) |

### 변경

**`src/components/tag-game/WaitingRoom.tsx`**
- 낙관적 업데이트 `pendingAssignments` state 추가 → 클릭 즉시 카드 이동
- 미배정 1/2 버튼: `min-w-[44px] min-h-[44px]` 터치 타겟 확보
- 팀 카드 행 안에 두 개 버튼 배치:
  - 반대편 팀으로 이동 (`ArrowRight` + 팀 번호)
  - **미배정으로 되돌리기** (`Undo2` 아이콘) — 신규 추가
- 호스트 본인 이동 차단 조건 (`!p.is_host`) 제거
- `onAssignTeam(playerId, null)` 호출로 팀 해제 지원

**`src/hooks/useTagRoom.ts`**
- `assignTeam` 시그니처를 `(playerId, team: number | null)` 으로 변경하여 미배정 복귀 허용 (DB 컬럼은 이미 nullable)

### 부가
- `pending` 동안 모든 관련 버튼 `disabled` → 연타 방지
- 서버 값과 pending이 일치하면 자동 정리

