

# 카카오맵 로딩 실패 수정

## 원인 분석
1. **SDK 이중 로딩**: `index.html`에서 SDK `<script>` 태그로 로드 + `useKakaoLoader`에서 다시 로드 → 충돌
2. **도메인 미등록**: 프리뷰 도메인 `*.lovableproject.com`이 카카오 콘솔에 미등록

## 수정 사항

### 코드 수정 (1개 파일)
- **`index.html`**: 카카오맵 SDK `<script>` 태그를 **제거**. `useKakaoLoader`가 SDK 로드를 전담하도록 함

### 사용자 작업 (카카오 개발자 콘솔)
- **JavaScript SDK 도메인**에 아래 도메인 추가:
  - `https://id-preview--be22ceda-dd96-4e0b-8a65-d447b401355d.lovable.app`
  - (선택) 프리뷰 테스트용: `https://be22ceda-dd96-4e0b-8a65-d447b401355d.lovableproject.com`

