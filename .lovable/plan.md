

## 퍼즐 시뮬레이터 개선 계획

### 변경 사항

1. **SlidingPuzzle 컴포넌트** (`src/components/treasure/SlidingPuzzle.tsx`)
   - 타이머 바 위에 원본 이미지를 작은 썸네일(60×60px, 둥근 모서리)로 항상 표시 — 기존 `<details>` 접이식 제거
   - 썸네일과 타이머/이동수를 한 줄에 배치

2. **PuzzleSimulator 페이지** (`src/pages/play/PuzzleSimulator.tsx`)
   - `timeLimit`을 30초 → 60초로 변경
   - 버튼 텍스트 "30초" → "60초"로 업데이트

