import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Wrench, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    // If state reset doesn't clear it, allow page reload
    try {
      window.location.reload();
    } catch {
      // ignore
    }
  };

  private handleSafeReset = () => {
    if (!window.confirm('손상된 세이브 데이터를 안전하게 초기화하고 새로 시작할까요?\n(기존 데이터는 백업 키로 안전하게 보관됩니다)')) {
      return;
    }
    try {
      // Backup any salvageable keys
      const keysToBackup = [
        'survival-world-v1',
        'survival-gps-world-v1',
        'survival-world-v1_backup',
        'survival-gps-world-v1_backup',
      ];
      const timestamp = Date.now();
      keysToBackup.forEach(k => {
        const val = localStorage.getItem(k);
        if (val) {
          localStorage.setItem(`corrupted_${k}_${timestamp}`, val);
          localStorage.removeItem(k);
        }
      });
      // Clear legacy cache
      localStorage.removeItem('colonion_sprite_cache_v1');
    } catch (e) {
      console.error('Failed to clean corrupted save', e);
    }
    window.location.href = '/play/survival';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-[#1c1917] p-4 text-[#e7e5e4] select-none font-sans">
          <div className="w-full max-w-md rounded-xl border-4 border-[#44403c] bg-[#292524] p-6 shadow-2xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3 border-b-2 border-[#44403c] pb-3 text-amber-400">
              <AlertTriangle className="h-7 w-7 flex-shrink-0 animate-pulse text-amber-400" />
              <div>
                <h2 className="text-base font-extrabold tracking-wide">
                  {this.props.fallbackTitle || '선사시대 복구 센터 (오류 방어 시스템)'}
                </h2>
                <p className="text-[11px] text-[#a8a29e]">화면 멈춤 및 흰색 화면 방어 성공</p>
              </div>
            </div>

            <div className="my-4 rounded-lg border border-[#44403c] bg-[#1c1917] p-3 text-xs">
              <p className="font-semibold text-rose-400 mb-1">
                {this.state.error?.name || '오류 발생'}: {this.state.error?.message || '알 수 없는 렌더링 예외가 포착되었습니다.'}
              </p>
              <p className="text-[10px] text-[#78716c] line-clamp-3 overflow-hidden font-mono">
                {this.state.error?.stack || this.state.errorInfo?.componentStack || '컴포넌트 스택 추적 불가'}
              </p>
            </div>

            <p className="text-xs text-[#d6d3d1] leading-relaxed mb-5">
              일시적인 데이터 지연 또는 호환되지 않는 저장 데이터로 인해 오류가 발생했습니다.
              아래 버튼으로 다시 시도하거나 데이터를 안전하게 초기화할 수 있습니다.
            </p>

            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow transition-transform active:scale-95 hover:bg-emerald-600"
              >
                <RefreshCw className="h-4 w-4" /> 새로고침 / 다시 시도 (Retry)
              </button>

              <button
                type="button"
                onClick={this.handleSafeReset}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-amber-800 px-4 py-2.5 text-xs font-bold text-white shadow transition-transform active:scale-95 hover:bg-amber-700"
              >
                <Wrench className="h-4 w-4" /> 🛠️ 안전 복구 (세이브 초기화 후 진입)
              </button>

              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#44403c] bg-stone-800 px-3 py-2 text-xs text-[#a8a29e] transition hover:bg-stone-700"
              >
                <Home className="h-3.5 w-3.5" /> 홈 화면으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
