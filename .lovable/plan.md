
목표

- `src/components/GoogleMapsProvider.tsx`에 남아 있는 기존 Kakao JavaScript key를 새 키 `19011b5025994c098412aad00af53134`로 교체합니다.
- 미리보기와 배포 환경 모두에서 Kakao SDK가 정상 로드되도록 원인을 정리하고 재검증합니다.
- 실패 시 원인을 바로 알 수 있도록 지도 로딩 에러 안내를 개선합니다.

현재 확인한 내용

- `index.html`에서는 중복 Kakao SDK 스크립트가 이미 제거되어 있습니다.
- 하지만 실제 코드에는 아직 이전 key `dca9db976cffa9c5b926112d49058efd`가 남아 있습니다.
  - 위치: `src/components/GoogleMapsProvider.tsx`
- 미리보기 콘솔에는 계속 아래 로그가 뜹니다.
  - `Failed to load Kakao Maps script, retrying...`
- 미리보기 네트워크를 확인해보니 Kakao SDK 요청이 모두 실패했고, 실제 요청 URL도 여전히 이전 key를 사용 중입니다.
  - `https://dapi.kakao.com/v2/maps/sdk.js?appkey=dca9db...&autoload=false`
  - 실패 원인: `net::ERR_BLOCKED_BY_ORB`
- 이 요청의 실제 referer는 `https://be22ceda-dd96-4e0b-8a65-d447b401355d.lovableproject.com/` 입니다.
- 즉, 지금은 “도메인 등록 문제”만이 아니라 “코드가 아직 예전 key를 사용 중”인 상태도 같이 겹쳐 있습니다.
- 콘솔의 React ref 경고는 보이지만, 지도 SDK 실패의 직접 원인은 아닙니다.

수정 계획

1. `GoogleMapsProvider.tsx`의 `appkey`를 새 값 `19011b5025994c098412aad00af53134`로 교체합니다.
2. 이 값이 Kakao의 `JavaScript Key`인지 기준에 맞춰 반영합니다. `REST API Key`가 아니라 지도 Web SDK용 키여야 합니다.
3. 로딩 실패 UI를 개선해서 단순히 `지도 로딩 실패`만 보여주지 않고, 현재 접속 origin과 도메인 등록 안내를 함께 표시합니다.
4. 수정 후 미리보기에서 다시 콘솔/네트워크를 확인해 Kakao SDK 요청이 더 이상 `ERR_BLOCKED_BY_ORB`로 실패하지 않는지 검증합니다.
5. `/`와 실제 지도 화면 경로에서 모두 확인해, 미리보기와 배포 동작 범위를 함께 점검합니다.

도메인 확인 범위

새 key 기준으로 아래 도메인들이 등록되어 있어야 합니다.

- 배포: `https://gpspinggo.lovable.app`
- 공유 프리뷰: `https://id-preview--be22ceda-dd96-4e0b-8a65-d447b401355d.lovable.app`
- 에디터 내부 프리뷰: `https://be22ceda-dd96-4e0b-8a65-d447b401355d.lovableproject.com`

기술 메모

- Kakao 가이드상, 지도 SDK는 `JavaScript Key`와 등록 도메인이 정확히 일치해야 로드됩니다.
- 이번 실패는 스크립트 요청 자체가 브라우저에서 막히고 있어, 정상 JavaScript 대신 인증/도메인 오류 응답을 받은 상황에 가깝습니다.
- 그래서 도메인만 등록해도 안 되고, key만 바꿔도 안 됩니다. “코드의 key”와 “그 key에 등록된 도메인”이 정확히 맞아야 해결됩니다.
