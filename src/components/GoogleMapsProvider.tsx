import { useKakaoLoader } from 'react-kakao-maps-sdk';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: Props) {
  const [loading, error] = useKakaoLoader({
    appkey: '19011b5025994c098412aad00af53134',
    libraries: ['services'],
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    // Dev-only pages (no map needed) still render when the SDK is blocked,
    // e.g. on localhost where the Kakao Web domain isn't registered.
    if (window.location.pathname.startsWith('/play/survival')) return <>{children}</>;
    if (window.location.pathname.startsWith('/dev/')) {
      return (
        <>
          <div className="bg-destructive/10 px-3 py-1.5 text-center text-xs text-destructive">
            지도 로딩 실패 (현재 도메인 미등록) — 지도 없는 점검 페이지만 표시합니다.
          </div>
          {children}
        </>
      );
    }
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-2">
          <p className="text-destructive font-semibold">지도 로딩 실패</p>
          <p className="text-xs text-muted-foreground">
            현재 도메인: <code className="bg-muted px-1 rounded">{window.location.origin}</code>
          </p>
          <p className="text-xs text-muted-foreground">
            카카오 개발자 콘솔 → 내 애플리케이션 → 플랫폼 → Web에 위 도메인이 등록되어 있는지 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
