import { useEffect, useState } from 'react';
import { Download, Share, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'colonion_pwa_banner_dismissed_v1';

export default function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (fullscreen PWA)
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(standaloneMode);
    if (standaloneMode) return;

    // Check localStorage dismissal
    const wasDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
    if (wasDismissed) return;

    // Defer PWA install banner until after survival tutorial is completed
    const isTutorialDone = () => {
      try {
        return (
          localStorage.getItem('colonion.tutorialCompleted.v2') === '1' ||
          localStorage.getItem('colonion_tutorial_completed') === '1'
        );
      } catch {
        return true;
      }
    };

    if (!isTutorialDone()) {
      // Defer showing until tutorial completed
      setDismissed(true);
      const onStorage = () => {
        if (isTutorialDone() && !wasDismissed) {
          setDismissed(false);
        }
      };
      window.addEventListener('storage', onStorage);
      return () => window.removeEventListener('storage', onStorage);
    }

    // Detect iOS (Safari doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent;
    const isIosDevice = /iPhone|iPad|iPod/.test(ua) && !('MSStream' in window);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      setDismissed(false);
    }

    // Capture Chrome/Android PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDismissed(true);
      localStorage.setItem(STORAGE_KEY, 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (isStandalone || dismissed) {
    return null;
  }

  // Show Android/Chrome install prompt or iOS Safari instruction
  return (
    <div
      role="region"
      aria-label="앱 설치 안내"
      className="pixel-frame fixed top-[max(0.5rem,env(safe-area-inset-top))] inset-x-2 z-50 flex items-center justify-between gap-2.5 rounded-lg border-2 border-amber-600/60 bg-stone-900/95 p-2.5 text-stone-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300 sm:left-auto sm:right-4 sm:max-w-md"
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-amber-500/50 bg-stone-950 text-amber-400">
          <Sparkles className="h-4 w-4 animate-pulse" />
        </div>
        <div className="min-w-0 flex-1 text-xs">
          <div className="font-bold text-amber-400 flex items-center gap-1">
            <span>COLONION 전체화면 플레이</span>
          </div>
          {isIos ? (
            <p className="text-[11px] text-stone-300 truncate">
              사파리 공유 버튼(<Share className="inline h-3 w-3 text-sky-400 -mt-0.5" />) → <b className="text-white">'홈 화면에 추가'</b>
            </p>
          ) : (
            <p className="text-[11px] text-stone-300 truncate">
              앱으로 설치하여 주소창 없는 전체화면으로 즐기세요
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!isIos && deferredPrompt && (
          <Button
            type="button"
            size="sm"
            onClick={handleInstallClick}
            className="pixel-btn h-8 py-1 px-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 flex items-center gap-1"
          >
            <Download className="h-3.5 w-3.5" />
            <span>설치</span>
          </Button>
        )}
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded p-1 text-stone-400 hover:bg-stone-800 hover:text-stone-200 active:scale-95 transition-colors"
          title="안내 닫기"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
