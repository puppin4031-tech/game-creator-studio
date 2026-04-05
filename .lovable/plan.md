

## 슬라이드 퍼즐 프리셋 & 타이머 구현 계획

### 변경 사항 요약

1. **4개 명화 이미지를 프리셋으로 추가** — 고흐(별이 빛나는 밤), 램브란트(돌아온 탕자), 뭉크(절규), 미켈란젤로(천지창조)를 `public/presets/` 폴더에 복사
2. **5x5 격자 지원 추가** — `SlidingPuzzle` 컴포넌트의 `gridSize` 타입을 `3 | 4 | 5`로 확장
3. **30초 타이머 추가** — `SlidingPuzzle`에 `timeLimit` prop 추가, 시간 초과 시 실패 콜백
4. **프리셋 선택 UI 개선** — `TreasureSetup`에서 3x3/4x4/5x5 선택 가능, 4개 명화 프리셋을 하드코딩으로 제공
5. **시뮬레이션 페이지** — 퍼즐을 바로 테스트할 수 있는 간단한 시뮬레이션 UI 추가

### 파일별 변경

| 파일 | 변경 |
|---|---|
| `public/presets/gogh.jpeg` | 고흐 이미지 복사 |
| `public/presets/rembrandt.jpg` | 램브란트 이미지 복사 |
| `public/presets/munch.jpeg` | 뭉크 이미지 복사 |
| `public/presets/creation.jpg` | 천지창조 이미지 복사 |
| `src/components/treasure/SlidingPuzzle.tsx` | gridSize `3|4|5` 지원, `timeLimit` prop(초) 추가, 타이머 UI + 시간 초과 시 `onTimeout` 콜백 |
| `src/components/treasure/TreasureSetup.tsx` | 격자 크기 `3|4|5` 선택, 하드코딩된 4개 프리셋 (명화) 표시, 커스텀 이미지 업로드 시 격자 크기 선택 |
| `src/components/treasure/TreasureQuizPopup.tsx` | `gridSize` 타입을 `3|4|5`로 확장, 퍼즐 실패(타임아웃) 처리 추가 |
| `src/pages/play/PuzzleSimulator.tsx` | 새 페이지 — 프리셋 이미지 선택 → 격자 크기 선택 → 퍼즐 플레이 시뮬레이션 |
| `src/App.tsx` | `/play/puzzle-sim` 라우트 추가 |

### SlidingPuzzle 타이머 동작
- `timeLimit` prop이 있으면 상단에 카운트다운 바 + 남은 초 표시
- 0초 도달 시 `onTimeout()` 호출 → 퍼즐 팝업에서 실패 처리 (15초 쿨타임)
- 타이머 바는 progress bar 형태로 시간에 따라 줄어듦
- 색상: 10초 이상 초록 → 5~10초 노랑 → 5초 미만 빨강

### 프리셋 데이터 구조
```typescript
const PUZZLE_PRESETS = [
  { id: 'gogh', name: '별이 빛나는 밤', image_url: '/presets/gogh.jpeg' },
  { id: 'rembrandt', name: '돌아온 탕자', image_url: '/presets/rembrandt.jpg' },
  { id: 'munch', name: '절규', image_url: '/presets/munch.jpeg' },
  { id: 'creation', name: '천지창조', image_url: '/presets/creation.jpg' },
];
```
프리셋 선택 시 격자 크기는 별도로 3x3/4x4/5x5 중 선택 가능 (프리셋 자체에 격자 크기가 고정되지 않음).

