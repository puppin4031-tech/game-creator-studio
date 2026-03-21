

# 스팟 관리 시스템 구현 계획

## 개요
관리자가 지도에서 사각형 영역으로 스팟을 생성하고, 스팟 내부에 테마/이벤트 요소를 배치할 수 있는 시스템을 구축합니다.

## 데이터베이스 변경

### 1. `spots` 테이블 수정
현재 spots 테이블은 단일 좌표(lat/lng)만 저장합니다. 사각형 영역을 지원하기 위해 컬럼을 추가합니다:

- `bounds_north`, `bounds_south`, `bounds_east`, `bounds_west` (double precision) — 사각형 경계
- `creator_id` (uuid, NOT NULL) — 생성한 관리자 ID
- `theme_id` (uuid, nullable, FK to themes) — 연결된 테마

### 2. `spot_elements` 테이블 생성 (신규)
스팟 내부에 배치되는 테마 요소(아이템, 퀴즈, 퍼즐 등)의 위치를 저장합니다:

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| spot_id | uuid FK(spots) | 소속 스팟 |
| theme_element_id | uuid FK(theme_elements) | 테마 요소 참조 |
| latitude | double precision | 배치 위치 |
| longitude | double precision | 배치 위치 |
| creator_id | uuid | 배치한 관리자 |
| created_at | timestamptz | |

### 3. RLS 정책
- **spots**: 모든 관리자가 INSERT 가능. UPDATE/DELETE는 `creator_id = auth.uid()` 또는 main_admin만 가능
- **spot_elements**: 동일 패턴 (자기 스팟 내 요소만 수정, main_admin은 전체)

## 프론트엔드 구현

### 4. 스팟 관리 페이지 (`/admin/exodus/spots`)
Leaflet 지도 기반의 스팟 관리 화면:

- **스팟 생성**: 지도에서 드래그하여 사각형 영역 지정 → 이름/설명 입력 → 저장
- **스팟 목록**: 사이드 패널에 생성된 스팟 리스트 표시
- **권한 제어**: 자신이 만든 스팟만 편집/삭제 가능, main_admin은 모든 스팟 편집 가능
- 사각형은 `L.rectangle`로 지도에 표시, GPS 좌표로 고정

### 5. 스팟 상세/테마 배치 화면
스팟 클릭 시 진입하는 상세 화면:

- **테마 선택**: 드롭다운으로 themes 테이블에서 테마 선택
- **요소 배치**: 선택한 테마의 theme_elements를 드래그&드롭으로 스팟 사각형 내부 지도에 배치
- 스팟 경계 밖에는 배치 불가 (좌표 검증)

### 6. 사이드바 메뉴 추가
ExodusSidebar에 "스팟 관리" 메뉴 항목 추가 (`/admin/exodus/spots`)

### 7. 라우트 추가
App.tsx에 `/admin/exodus/spots` 라우트 등록

## 구현 순서
1. DB 마이그레이션 (spots 컬럼 추가 + spot_elements 테이블 + RLS)
2. 스팟 관리 페이지 (지도 + 사각형 드래그 생성)
3. 스팟 상세 — 테마 선택 및 요소 배치
4. 사이드바/라우트 연결

