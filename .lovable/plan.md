

# 세 가지 UI 개선

## 1. 월드맵(/world) 상단에 "GPS 게임" 버튼 추가
- `WorldMap.tsx` 상단 HUD 영역에 `/play`로 이동하는 "GPS 게임" 버튼 추가
- 기존 GameMenu 옆이나 좌측 상단에 배치

## 2. 보물찾기 지도 선택 UI 확대 (TreasureSetup.tsx)
- 현재: `mapContainerStyle` 높이 200px로 고정된 인라인 지도 — 너무 작음
- 변경: "지도에서 선택" 클릭 시 **전체화면 오버레이 지도**를 띄움 (2번 이미지 참고)
  - 화면 전체를 덮는 지도 + 하단에 "찾아오시는 길" 스타일 안내 패널
  - 지도 탭으로 핀 설정 → 하단에 좌표 표시 + "등록" / "취소" 버튼
  - 핀 확정 후 오버레이 닫히고 기존 폼으로 복귀

## 3. 랜딩페이지 조절 — 다음 단계에서 진행
- 이번 구현 후 랜딩페이지 논의

### 수정 파일
- `src/pages/WorldMap.tsx` — 상단에 GPS 게임 Link 버튼 추가
- `src/components/treasure/TreasureSetup.tsx` — 지도 선택 시 fullscreen 오버레이 모드로 전환, 기존 200px 인라인 지도 제거

