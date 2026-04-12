import { useKakaoLoader } from 'react-kakao-maps-sdk';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: Props) {
  const [loading, error] = useKakaoLoader({
    appkey: '19011b5025994c098412aad00af53134',
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-destructive">
        지도 로딩 실패
      </div>
    );
  }

  return <>{children}</>;
}
