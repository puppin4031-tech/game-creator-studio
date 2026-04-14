

## SpawnMarker 컴포넌트 분리 및 이미지 마커 적용

### 변경 사항

**1. 신규: `src/components/world/SpawnMarker.tsx`**
- `WorldMap.tsx`의 309–364줄(spawns.map 루프)을 별도 컴포넌트로 추출
- Props: `spawn` 데이터(id, lat, lng, item_type, rarity, inRange, distance), `onSelect` 콜백
- `TREASURE_ICON_MAP`에서 아이콘을 조회하여 `CustomOverlayMap`으로 렌더링
- 글로우 링 + 플로팅 애니메이션 유지
- **폴백 제거**: 매핑에 없는 item_type도 `diamondImg`(기본 이미지)를 사용하여 항상 일러스트 이미지로 표시 — SVG 점 폴백 삭제
- `RARITY_GLOW`, 사이즈 로직을 컴포넌트 내부에 포함

**2. 수정: `src/pages/WorldMap.tsx`**
- 309–364줄의 spawns.map 블록을 `<SpawnMarker>` 컴포넌트 호출로 교체
- `spawnMarkerImage` 함수, `RARITY_GLOW` 상수 제거 (SpawnMarker로 이동)
- `TREASURE_ICON_MAP` import 제거 (SpawnMarker 내부에서 처리)

### 기술 세부

| 기존 | 변경 후 |
|---|---|
| `TREASURE_ICON_MAP[s.item_type]` 없으면 SVG dot 폴백 | `TREASURE_ICON_MAP[s.item_type] ?? diamondImg` — 항상 이미지 |
| 마커 로직 WorldMap에 인라인 | `<SpawnMarker>` 컴포넌트 1개로 깔끔하게 분리 |

