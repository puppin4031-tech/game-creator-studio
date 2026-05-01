import { Outlet } from 'react-router-dom';

/**
 * 게임 플레이 화면(`/play/*`) 전용 모바일 프레임.
 * - 데스크톱에서도 항상 480px 최대 폭으로 고정되어 모바일 규격에서만 렌더링됨.
 * - 양옆은 어두운 배경, 가운데 컨테이너가 모든 자식(지도/HUD/채팅 등)의 기준이 됨.
 * - 자식 컴포넌트의 `fixed` / `absolute` 요소는 이 컨테이너 기준으로 배치되도록
 *   `relative` + `overflow-hidden`을 적용해 레이아웃 이탈을 방지.
 */
export default function MobileFrame() {
  return (
    <div className="min-h-[100dvh] w-full bg-neutral-900 flex justify-center">
      <div
        className="relative w-full max-w-[480px] min-h-[100dvh] bg-background overflow-hidden shadow-2xl"
        style={{ contain: 'layout paint' }}
      >
        <Outlet />
      </div>
    </div>
  );
}
