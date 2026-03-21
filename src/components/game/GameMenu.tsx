import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, LogIn, LogOut, Settings, HelpCircle, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GameMenu() {
  const [open, setOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <>
      {/* Menu toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-4 right-4 z-[1100] w-12 h-12 rounded-full bg-card/90 backdrop-blur border border-border flex items-center justify-center shadow-lg hover:bg-accent transition-colors"
      >
        {open ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
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
          {user ? (
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
            <div className="mb-6 p-4 rounded-xl bg-muted/50 border border-border text-center">
              <User className="h-9 w-9 text-muted-foreground mx-auto mb-2" />
              <p className="text-[15px] text-muted-foreground">로그인하여 게임 진행을 저장하세요</p>
            </div>
          )}

          {/* Menu items */}
          <nav className="flex flex-col gap-1 flex-1">
            {!user ? (
              <Button
                variant="ghost"
                className="justify-start gap-3 h-12 text-[15px] text-foreground"
                onClick={() => { navigate('/login'); setOpen(false); }}
              >
                <LogIn className="h-5 w-5" />
                로그인 / 회원가입
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
