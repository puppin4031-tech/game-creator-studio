## 문제 원인

현재 `WaitingRoom.tsx`의 공유 링크는 `window.location.origin`을 그대로 사용합니다.

호스트가 **Lovable 프리뷰 환경**(예: `id-preview--be22ceda...lovable.app`)에서 방을 만들고 링크를 공유하면, 그 도메인은 Lovable 편집자 계정 인증이 걸려 있어서 **외부 참가자가 lovable 로그인 화면을 만나게 됩니다**. 앱 자체의 `/play/:roomCode` 라우트는 이미 비보호(누구나 접근 가능)로 잘 설정돼 있어 코드 로직 문제는 아닙니다.

## 해결 방법

초대 링크 생성 시 **항상 게시된 공개 도메인(`https://gpspinggo.lovable.app`)을 사용**하도록 강제합니다. 사용자가 이미 공개 도메인 또는 추후 연결될 커스텀 도메인에서 접속 중이면 그대로 `window.location.origin`을 씁니다.

### 변경 파일
`src/components/tag-game/WaitingRoom.tsx`

### 수정 로직
```ts
const PUBLIC_HOST = 'https://gpspinggo.lovable.app';

function getShareOrigin() {
  const origin = window.location.origin;
  // Lovable 편집/프리뷰 도메인이면 공개 도메인으로 치환
  if (/lovable\.app$/.test(new URL(origin).hostname) && /(^|\.)id-preview--|--lovable\.app$|^preview--/.test(new URL(origin).hostname)) {
    return PUBLIC_HOST;
  }
  // 그 외(공개 도메인, 커스텀 도메인, localhost 등)는 그대로
  return origin;
}

const url = `${getShareOrigin()}/play/${room.room_code}`;
```

판별 조건은 안전하게: hostname이 `id-preview--`로 시작하거나 `lovable.dev`/편집기 호스트인 경우 → 공개 도메인 강제. 그 외엔 현 origin 유지(향후 커스텀 도메인 연결 시 자동 호환).

### 효과
- ✅ 프리뷰에서 공유해도 외부 참가자가 lovable 로그인 없이 바로 방에 참여
- ✅ 게시된 도메인에서 공유하면 그대로 사용
- ✅ 향후 커스텀 도메인 연결 시에도 자동 적용

### 참고
- `/play/:roomCode` 라우트는 이미 비보호 상태이므로 추가 변경 불필요
- 닉네임 입력 카드 흐름도 그대로 유지
