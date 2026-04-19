

## 술래잡기/보물찾기 맵을 /world 스타일로 통일

### 현재 차이점

| 항목 | /world (WorldMap) | 술래잡기/보물찾기 |
|---|---|---|
| 나침반 회전 | ✅ 150vmax 컨테이너 CSS 회전 + LERP 보간 | ❌ 없음 (DirectionCone만) / ❌ 아예 없음 |
| 사용자 마커 | 🔼 화살표(SVG, heading 회전) / 점 토글 | ⚪ 단순 원형 점 |
| 줌 레벨 | level 2 (가까움) | 술래잡기 level 5, 보물 level 2 |
| 채집 반경 표시 | 20m 초록 + 500m 파랑 Circle | 술래잡기만 1000m Circle, 보물 없음 |
| 나침반 토글 버튼 | ✅ 우하단 동일 스타일 (h-12 둥근 버튼) | 술래잡기 GameRoom에 있음 / 보물 없음 |
| Spawn 플로팅 | float + glow pulse 애니메이션 | 보물은 float만, 술래잡기는 정적 |

### 변경 사항

**1. 공통 헬퍼 추가 — `src/components/game/CompassMapWrapper.tsx` (신규)**
- WorldMap의 150vmax 회전 + accumulatedAngle/smoothedAngle/RAF LERP 로직을 추출
- `<CompassMapWrapper compassActive heading>{<Map>...}</Map></CompassMapWrapper>` 형태로 재사용
- 회전 중에는 `draggable={false} zoomable={false}` 자동 적용 (children에 prop 전달)

**2. `src/components/game/UserArrowMarker.tsx` (신규)**
- WorldMap에서 쓰는 초록 SVG 화살표 마커를 컴포넌트화
- `compassActive && heading !== null`이면 화살표(heading 회전), 아니면 동그란 점
- 색상은 prop으로 받음 (술래잡기는 팀 색, 보물은 #3b82f6, 월드는 #22c55e)

**3. `src/components/tag-game/TagGameMap.tsx` 리팩토링**
- 줌 레벨 `5 → 2`로 변경 (월드맵과 동일한 근접 뷰)
- 본인 마커를 `UserArrowMarker`로 교체 → 나침반 켤 때 화살표로 표시
- `<Map>`을 `<CompassMapWrapper>`로 감싸서 지도 자체 회전 적용
- 기존 `DirectionCone` 제거 (화살표 마커가 대체)
- 1000m Circle은 유지 (시야 반경 의미)

**4. `src/components/treasure/TreasureGameMap.tsx` 리팩토링**
- 본인 마커를 `UserArrowMarker`로 교체
- `<Map>`을 `<CompassMapWrapper>`로 감싸기
- 30m 탐색 반경 Circle 추가 (보물 근접 표시 — 월드의 20m 채집 원과 동일 스타일)
- props에 `heading`, `compassActive` 추가 (GameRoom에서 전달)
- 보물 마커에 월드 SpawnMarker 스타일의 glow pulse 추가 (선택, 시각 통일)

**5. `src/pages/play/GameRoom.tsx` 수정**
- 보물 모드에도 나침반 토글 버튼 추가 (이미 술래잡기엔 있음)
- TreasureGameMap에 `heading`, `compassActive` props 전달
- 나침반/신호/채팅 버튼 스타일을 월드맵과 통일 (h-12 w-12 rounded-full, 색상 톤)

### 영향받지 않는 것
- 게임 로직 (잡기, 채집, 퀴즈), Realtime 구독, 채팅, 핑, 타이머
- WaitingRoom, 인벤토리, 점수판
- /world 페이지 자체

### 결과
모든 GPS 게임 맵이 동일한 시각 언어를 가짐:
- 나침반 켜면 지도가 부드럽게 회전 + 내 마커는 항상 위쪽 화살표
- 동일한 줌 레벨, 동일한 반경 원 스타일, 동일한 하단 버튼 디자인

