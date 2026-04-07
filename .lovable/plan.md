

# Phase 1: Landing Page 제작 계획

## 현재 상태
- `/` 경로는 현재 AR 방탈출 게임맵(Index.tsx)으로 사용 중
- Framer Motion은 설치되어 있지 않음 (설치 필요)
- 기존 Index.tsx의 게임맵 기능은 향후 Phase 3에서 `/world`로 이동 예정

## 변경 사항

### 1. 패키지 설치
- `framer-motion` 추가

### 2. 새 파일 생성: `src/pages/LandingPage.tsx`
스크롤형 랜딩 페이지, 4개 섹션 구성:

- **Hero Section**: 어두운 그라디언트 오버레이 배경, 볼드 타이틀 "일상이 게임이 되는 순간, GPS 리얼타임 액션", 서브카피, CTA 버튼 (`/world`로 이동). Framer Motion fade-in + slide-up 적용
- **Features Section**: 3개 카드 (오픈 월드 수집 & 세공 / GPS 술래잡기 & 보물찾기 / AR 방탈출). 스크롤 시 stagger fade-in
- **Target Audience Section**: 교회 수련회, 팀빌딩, 학교 체험학습 활용 사례 어필
- **Footer**: 저작권 + 관리자 로그인 링크

### 3. 라우팅 변경: `src/App.tsx`
- `/` → `LandingPage` (새 랜딩 페이지)
- `/world` → 기존 `Index` (AR 게임맵, 기존 코드 그대로 유지)
- 기타 라우트 변경 없음

### 4. 기존 Index.tsx
- 파일 수정 없음, 라우트만 `/world`로 변경

## 기술 세부사항
- Framer Motion의 `motion.div`, `useInView`, `stagger` 활용
- Hero 배경은 CSS gradient (실제 이미지 대신 다크 그라디언트 + 패턴)
- 반응형: 모바일 우선 (현재 뷰포트 573x976)
- Lucide 아이콘 활용 (Globe, Users, Gamepad2 등)

