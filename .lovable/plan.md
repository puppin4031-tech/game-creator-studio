

## 아이콘 이미지 교체 계획

업로드한 새 이미지(더 디테일한 일러스트 버전)로 기존 `src/assets/treasure/` 아이콘을 덮어쓰기합니다. 코드 변경은 필요 없고, 파일만 교체하면 됩니다.

### 파일 매핑

| 업로드 파일 | 덮어쓸 대상 |
|---|---|
| 순금-2.png | src/assets/treasure/gold.png |
| 순은-2.png | src/assets/treasure/silver.png |
| 퀴즈-2.png | src/assets/treasure/quiz.png |
| 토파즈-2.png | src/assets/treasure/topaz.png |
| 퍼즐-2.png | src/assets/treasure/puzzle.png |
| 다이아몬드-2.png | src/assets/treasure/diamond.png |
| 루비-2.png | src/assets/treasure/ruby.png |
| 보물_상자-2.png | src/assets/treasure/chest.png |
| 에메랄드-2.png | src/assets/treasure/emerald.png |
| 열쇠-2.png | src/assets/treasure/key.png |

### 코드 변경

없음. `src/lib/treasureIcons.ts`의 import 경로가 동일한 파일명을 참조하므로, 이미지 파일만 교체하면 보물찾기 지도, 오픈월드 지도, 인벤토리, 셋업 화면 모두 자동으로 새 아이콘이 적용됩니다.

