# 카카오맵 Zoom 튐 & 마커/핑 쏠림 수정

지도 확대/축소 시 위치가 튀는 문제와, 호출 핑·유저 마커가 실제 GPS 좌표보다 위쪽으로 어긋나는 현상을 한 번에 정리합니다. 사용자가 제시한 코드를 검토한 결과, 3개 파일 외에 **`TreasureGameMap.tsx`도 동일한 이중 정렬 버그**를 가지고 있어 함께 고칩니다.

## 원인 정리

1. **지도 튐**: `CompassMapWrapper`가 나침반 OFF 상태에서도 항상 `150vmax × 150vmax` 컨테이너로 감싸고 있음 → 카카오맵이 자기 viewport를 화면보다 훨씬 크게 인식 → zoom in/out 시 중심 좌표 재계산 과정에서 시각적 중심이 어긋나며 튐.
2. **마커·핑 쏠림 (위쪽 편향)**: `CustomOverlayMap`은 기본 anchor가 `xAnchor=0.5, yAnchor=1.0` (좌표 위쪽으로 콘텐츠가 그려짐). 일부 마커는 이를 보정하려고 내부 div에 `transform: translate(-50%, -50%)`를 넣어두었지만, 이는 X축만 보정하고 Y축은 여전히 위쪽으로 쏠림. 또 `PingOverlay`처럼 이미 `yAnchor=0.5`를 명시한 곳과 안 한 곳이 섞여 있어 마커 간 기준점이 다름.

## 수정 대상 파일

### 1. `src/components/game/CompassMapWrapper.tsx`
- 나침반 OFF: `width:100%, height:100%` 일반 래퍼로 렌더 → 카카오맵 viewport 정상화 → zoom 튐 해소.
- 나침반 ON: 기존 `150vmax + rotate` 회전 컨테이너 유지.
- 회전 상태에서 OFF로 전환될 때 RAF/누적 각도가 깨끗이 리셋되는지 재확인.

### 2. `src/components/game/UserArrowMarker.tsx`
- `CustomOverlayMap`에 `xAnchor={0.5} yAnchor={0.5}` 명시.
- 점 마커(`div`) 내부의 `transform: translate(-50%, -50%)` 제거 (anchor가 이미 중앙 정렬).
- 화살표 SVG는 `width:48 height:48` 고정 박스에 회전만 적용, 이중 보정 없음.

### 3. `src/components/tag-game/TagGameMap.tsx`
- 같은 팀 다른 플레이어 마커 `CustomOverlayMap`에 `xAnchor=0.5, yAnchor=0.5` 추가.
- 내부 wrapper div의 `transform: translate(-50%, -50%)` 제거.
- 마커 + 닉네임이 세로로 쌓이는 구조이므로, 점이 정확히 GPS 좌표 위에 오도록 wrapper에서 `transform: translateY(-50%)`처럼 추가 보정을 해야 닉네임 라벨이 아래로 내려옴 → 가장 깔끔한 방식: 닉네임을 점의 **아래쪽 absolute**로 두고 wrapper는 점 크기(24×24)만 차지하게 변경.

### 4. `src/components/treasure/TreasureGameMap.tsx` (추가 발견)
- 동료 플레이어 작은 점 마커: `xAnchor=0.5 yAnchor=0.5` 추가 + `transform: translate(-50%, -50%)` 제거.
- 보물 아이콘 마커: `xAnchor=0.5 yAnchor=0.5` 명시 (현재 미지정이라 위로 쏠려있음).

## 일관 규칙 (전 마커 공통)

```text
모든 CustomOverlayMap:
  xAnchor=0.5, yAnchor=0.5 명시
내부 children:
  더 이상 translate(-50%, -50%) 사용 금지
  중앙 기준 위/아래로 라벨 띄울 때만 absolute + translateX(-50%) 사용
```

## 검증 시나리오

1. `/play/tag-sim` 진입 후 핀치 줌, +/- 줌 반복 → 지도 중심이 시각적으로 안 튐.
2. 호출(📡) 발사 → 펄스 원의 중심이 본인 마커(점/화살표) 중심과 정확히 겹침.
3. 나침반 토글 ON/OFF → 회전 컨테이너만 활성/비활성, 일반 모드에선 카카오맵 줌·드래그 자연스러움.
4. `/play/treasure-sim`에서도 동료 점·보물 아이콘이 GPS 좌표 정중앙에 표시.

## 영향 범위

- 변경 파일: 4개 (CompassMapWrapper, UserArrowMarker, TagGameMap, TreasureGameMap)
- 변경 없음: PingOverlay (이미 `yAnchor=0.5` + 중앙 정렬 구조 정상)
- DB/스키마/네트워크 변경 없음, 순수 클라이언트 렌더링 수정.
