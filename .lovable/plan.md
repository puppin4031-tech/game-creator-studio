
문제 재정의

- 지금 사용자가 보고 있는 화면은 첫 진입 지도 화면 `/` (`src/pages/Index.tsx`)인데, 이전 수정은 주로 `/play/:roomCode` (`GameRoom`) 쪽에 들어가서 실제 문제 화면이 거의 안 바뀌었습니다.
- 업로드한 스크린샷대로, 햄버거 메뉴가 `술래잡기` 버튼을 가리고 있습니다. 이건 “반응형이 대충 안 맞는 수준”이 아니라, 같은 좌표에 두 버튼을 올려둔 구조 문제입니다.

Do I know what the issue is?

- Yes.

실제 원인

1. 같은 위치에 두 개를 고정 배치함
- `src/components/game/GameMenu.tsx`
  - 메뉴 버튼이 `fixed top-4 right-4 z-[1100]`
- `src/pages/Index.tsx`
  - `술래잡기` 링크가 `fixed top-4 right-4 z-[1000]`
- 즉, 완전히 같은 자리입니다. 메뉴가 위 z-index라서 `술래잡기`가 가려지는 게 정상 동작처럼 되어 있습니다.

2. 부모 레이아웃이 없어서 충돌을 막을 구조가 없음
- 첫 지도 화면의 오버레이 UI가 전부 각자 `fixed`입니다.
  - 메뉴
  - 술래잡기 CTA
  - 층 선택기
  - 상태바
  - 하단 액션바
  - 모의 이동 버튼
- `Index.tsx`가 “상단/하단 HUD를 관리하는 부모 컨테이너” 역할을 안 하고 있어서, 새 버튼을 추가할 때마다 겹칠 가능성이 계속 생깁니다.

3. 버튼이 안 커 보이는 원인도 따로 있음
- `src/components/ui/button.tsx`에 `[&_svg]:size-4`가 있어서, 버튼 안 아이콘이 기본 16px로 강제됩니다.
- 그래서 아이콘에 `w-9 h-9` 같은 클래스를 줘도 실제 체감이 작게 보일 수 있습니다.
- 즉 “크기 수정이 안 먹는 느낌”은 버튼 공통 컴포넌트가 일부 막고 있는 겁니다.

4. 지금 페이지 기준으로는 수정 대상이 달랐음
- 사용자는 첫 지도 화면에서 문제를 보고 있는데, 이전 수정은 `GameRoom`, `ChatDrawer`, `GameTimer`, `TeamScoreboard` 중심이었습니다.
- 그래서 “분명 수정했다고 했는데 내가 보는 화면은 왜 그대로냐”가 발생한 상태입니다.

5. 추가 충돌 후보도 있음
- `src/components/game/FloorSelector.tsx`도 `fixed top-16 right-4`
- 상단 버튼을 키우면 메뉴/CTA와 다시 가까워질 수 있습니다.
- `src/components/game/MockControls.tsx`는 `fixed bottom-24 right-3`라서, 하단 액션바를 키우면 하단에서도 충돌 가능성이 있습니다.

수정 계획

1. 첫 지도 화면의 오버레이 구조를 부모가 관리하도록 바꾸기
- `src/pages/Index.tsx`에 상단/하단 HUD 래퍼를 만들고,
- 각 버튼이 자기 멋대로 `fixed` 되는 방식 대신,
- 부모가 위치를 정하고 내부는 `flex`, `gap`, `stack`으로 배치하게 바꿉니다.

2. 상단 우측 요소를 하나의 네비게이션 영역으로 통합
- 메뉴 버튼과 `술래잡기` 버튼을 같은 상단 우측 컨테이너에 넣어 정렬
- 같은 `top/right` 좌표를 따로 주지 않고,
- 한 줄 또는 세로 스택으로 배치해서 절대 겹치지 않게 만듭니다.
- `FloorSelector`도 이 우측 스택 아래에 붙여서 상단 컨트롤을 한 묶음으로 관리합니다.

3. `GameMenu`를 “자체 fixed 컴포넌트”에서 “부모 배치형 컴포넌트”로 리팩터
- `GameMenu.tsx` 안의 `fixed top-4 right-4` 제거
- 부모(`Index.tsx`)가 메뉴 버튼 위치를 제어하도록 구조 변경
- 이렇게 해야 앞으로 메뉴/버튼을 추가해도 같은 문제가 반복되지 않습니다.

4. 모바일에서 실제로 커지게 버튼/아이콘 규칙 수정
- `src/components/ui/button.tsx`의 SVG 강제 크기 규칙을 조정
- 아이콘은 `size-*` 기준으로 명시해서 공통 규칙에 덮이지 않게 정리
- 모바일 기준 최소 48~56px 터치 타깃으로 확대
  - 메뉴 버튼
  - 술래잡기 버튼
  - 층 선택 버튼
  - 하단 액션 버튼

5. safe-area 기준 도입
- `src/index.css`에 상단/우측/하단 safe-area 변수 추가
- 노치/삼성 브라우저/엣지-투-엣지 환경에서도 상단 버튼이 너무 붙지 않게 처리

6. 하단도 겹침 방지 구조로 정리
- `FloatingBar`와 `MockControls`가 서로 침범하지 않게 하단 슬롯을 나눔
- 모바일에서는 `MockControls` 위치를 더 내리거나 축소/비노출 검토
- 앞으로 하단 버튼을 더 추가해도 기존 바와 부딪히지 않도록 정리

수정 대상 파일

- `src/pages/Index.tsx`
  - 상단/하단 HUD 부모 레이아웃 추가
  - `술래잡기` 버튼의 단독 fixed 제거
- `src/components/game/GameMenu.tsx`
  - 메뉴 버튼 fixed 제거, 부모 배치형으로 변경
- `src/components/game/FloorSelector.tsx`
  - 우측 스택형 배치로 이동, 모바일 크기 확대
- `src/components/game/FloatingBar.tsx`
  - 모바일 버튼/폰트 확대
- `src/components/game/MockControls.tsx`
  - 하단 겹침 방지 위치 조정
- `src/components/ui/button.tsx`
  - 아이콘 강제 16px 규칙 보정
- `src/index.css`
  - safe-area 유틸 추가

기대 결과

- 첫 지도 화면에서 햄버거 메뉴와 `술래잡기`가 더 이상 겹치지 않음
- 모바일에서 버튼과 아이콘이 눈에 띄게 커짐
- 앞으로 메뉴를 추가해도 부모 HUD 레이아웃이 위치를 관리해서 같은 문제가 반복되지 않음
- 지금 문제는 “숨은 부모 제한”보다, 반대로 “부모가 배치를 전혀 관리하지 않는 구조”가 핵심 원인입니다
