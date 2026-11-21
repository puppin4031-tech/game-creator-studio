import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, LogIn, LogOut, Settings, HelpCircle, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GameMenuProps {
  loggedIn?: boolean;
  onExit?: () => void;
  onLogout?: () => Promise<void> | void;
  onRestoreSave?: () => Promise<void> | void;
}

export function GameMenu({ onExit, onLogout, onRestoreSave }: GameMenuProps = {}) {
  const [open, setOpen] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await signOut();
    }
    setOpen(false);
  };

  const handleRestore = async () => {
    if (!onRestoreSave) return;
    setRestoring(true);
    try {
      await onRestoreSave();
    } finally {
      setRestoring(false);
    }
  };

  const isGuest = !user || user.is_anonymous;

  return (
    <>
      {/* Menu toggle button — NO fixed positioning; parent controls placement */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center shadow-lg hover:bg-accent transition-colors active:scale-95"
      >
        {open ? <X className="h-7 w-7 text-foreground" /> : <Menu className="h-7 w-7 text-foreground" />}
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[1050] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 z-[1060] h-full w-80 bg-card border-l border-border shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-18 px-5 pb-6">
          {/* Profile section */}
          {!isGuest && user ? (
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-medium text-foreground truncate">
                    {profile?.display_name || user.email}
                  </p>
                  <p className="text-[13px] text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              {(profile?.role === 'main_admin' || profile?.role === 'sub_admin') && (
                <span className="inline-flex items-center gap-1 text-[13px] bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  <Shield className="h-3.5 w-3.5" />
                  {profile.role === 'main_admin' ? '메인 관리자' : '서브 관리자'}
                </span>
              )}
            </div>
          ) : (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-left">
              <div className="flex items-center gap-2 mb-1.5 text-amber-500 font-bold text-[14px]">
                <User className="h-4 w-4" /> 게스트(비회원) 모드
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">
                현재 임시 게스트 상태입니다. 기존 <b>puppin4031@gmail.com</b> 등 저장된 데이터로 플레이하시려면 정식 로그인해 주세요.
              </p>
              <Button
                size="sm"
                className="w-full bg-primary text-primary-foreground font-semibold"
                onClick={() => { navigate('/login?returnTo=/world'); setOpen(false); }}
              >
                <LogIn className="h-4 w-4 mr-1.5" /> 계정 로그인하기
              </Button>
            </div>
          )}

          {/* Menu items */}
          <nav className="flex flex-col gap-1 flex-1">
            {isGuest ? (
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12 text-[15px] text-foreground"
                onClick={() => { navigate('/login?returnTo=/world'); setOpen(false); }}
              >
                <LogIn className="h-5 w-5" />
                로그인 / 계정 전환
              </Button>
            ) : (
              <>
                {(profile?.role === 'main_admin' || profile?.role === 'sub_admin') && (
                  <Button
                    variant="ghost"
                    className="justify-start gap-3 h-12 text-[15px] text-foreground"
                    onClick={() => { navigate('/admin'); setOpen(false); }}
                  >
                    <Shield className="h-5 w-5" />
                    관리자 대시보드
                  </Button>
                )}
              </>
            )}

            {onRestoreSave && (
              <Button
                variant="outline"
                className="justify-start gap-2 h-11 text-[13px] border-primary/40 text-primary hover:bg-primary/10 my-1"
                onClick={handleRestore}
                disabled={restoring}
              >
                <span className="text-base">🔄</span>
                {restoring ? '저장 데이터 복원 중...' : '저장 데이터 복원 (최고 진행도)'}
              </Button>
            )}

            <Button
              variant="ghost"
              className="justify-start gap-3 h-12 text-[15px] text-foreground"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-5 w-5" />
              설정
            </Button>

            <Button
              variant="ghost"
              className="justify-start gap-3 h-12 text-[15px] text-foreground"
              onClick={() => setOpen(false)}
            >
              <HelpCircle className="h-5 w-5" />
              도움말
            </Button>
          </nav>

          {/* Logout at bottom */}
          {user && (
            <Button
              variant="ghost"
              className="justify-start gap-3 h-12 text-[15px] text-destructive hover:text-destructive hover:bg-destructive/10 mt-auto"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              로그아웃
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
