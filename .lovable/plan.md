

## Plan: 다크 테마 → 라이트 테마 전환

### 개요
현재 앱 전체가 다크 테마(어두운 배경 + 밝은 텍스트)로 되어 있습니다. CSS 변수와 하드코딩된 색상을 모두 밝은 테마로 변경합니다.

### 변경 사항

**1. CSS 변수 변경 (`src/index.css`)**
- `:root` 변수를 밝은 색상으로 교체
- 배경: 흰색/밝은 회색 계열
- 텍스트: 어두운 색 계열
- 카드/사이드바: 밝은 배경
- Primary(녹색), Accent(금색), Destructive(빨간색) 유지하되 밝은 배경에 맞게 조정
- Google Maps 배경 오버라이드 제거

**2. Exodus 레이아웃 라이트 전환 (`src/layouts/ExodusLayout.tsx`)**
- 하드코딩된 다크 색상(`#0a1628`, `#0f1d32`, `#1e2d4a`) → Tailwind 시맨틱 클래스(`bg-background`, `border-border` 등)로 교체

**3. Exodus 사이드바 (`src/components/admin/ExodusSidebar.tsx`)**
- 동일하게 하드코딩 다크 색상 → 시맨틱 클래스로 교체
- 금색 악센트(`#d4a843`) 유지

**4. Exodus 페이지들 (7개 파일)**
- `StagesTimeline.tsx`, `NPCEncyclopedia.tsx`, `PuzzleQuizMaker.tsx`, `SpotManagement.tsx`, `SpotDetail.tsx`, `ExodusDashboard.tsx`, `ItemPresets.tsx`
- `bg-[#0a1628]` → `bg-background`, `bg-[#111f38]` → `bg-card`, `border-[#1e2d4a]` → `border-border`, `text-[#e8e0d0]` → `text-foreground`, `text-[#7b8da6]` → `text-muted-foreground`

### 기술 세부사항

라이트 테마 CSS 변수 (예시):
```text
--background:    0 0% 100%      (흰색)
--foreground:    220 20% 15%    (어두운 남색)
--card:          220 15% 97%    (밝은 회색)
--primary:       150 80% 40%    (녹색 유지)
--accent:        35 90% 50%     (금색 유지)
--sidebar-bg:    220 15% 96%    (밝은 사이드바)
--border:        220 15% 88%    (밝은 테두리)
```

- 하드코딩된 색상 274곳을 시맨틱 Tailwind 클래스로 일괄 교체
- 게임 관련 glow 애니메이션 색상은 유지

