import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Shield } from 'lucide-react';
import { loginAudience, loginDestination, type LoginAudience } from '@/lib/authNavigation';

const LOGIN_COPY: Record<LoginAudience, { title: string; subtitle: string; note: string; signUp: string }> = {
  player: {
    title: '콜로니온에 오신 것을 환영해요',
    subtitle: '실제 지도를 걸으며 문명을 개척해요',
    note: '진행 상황은 자동 저장되어 다른 기기에서도 이어져요.',
    signUp: '여정 시작하기',
  },
  explorer: {
    title: '탐험을 시작해 볼까요?',
    subtitle: '현실 GPS로 떠나는 생존 탐험',
    note: '걸어서 모은 자원과 배낭, 거점까지 그대로 저장돼요.',
    signUp: '여정 시작하기',
  },
  admin: {
    title: '관리자 포털',
    subtitle: '콜로니온 운영 관리',
    note: '운영 계정으로만 이용해 주세요.',
    signUp: '관리자 가입',
  },
};

export default function Login() {
  const { user, signIn, signUp, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const destination = loginDestination(searchParams.get('returnTo'));
  const audience = loginAudience(destination);
  const copy = LOGIN_COPY[audience];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate(destination, { replace: true });
    }
  }, [user, isLoading, navigate, destination]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } catch {
      setError('로그인할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await signUp(email.trim(), password, displayName);
      if (error) setError(error);
      else setConfirmationSent(true);
    } catch {
      setError('회원가입할 수 없습니다. 연결을 확인하고 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  if (!isLoading && user) return null;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            {audience === 'admin' ? (
              <Shield className="h-7 w-7 text-primary" />
            ) : (
              <MapPin className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">{copy.title}</CardTitle>
          <CardDescription className="flex items-center justify-center gap-1">
            {audience === 'admin' ? <Shield className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {copy.subtitle}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" onValueChange={() => { setError(null); setConfirmationSent(false); }}>
            <TabsList className="w-full">
              <TabsTrigger value="signin" className="flex-1">로그인</TabsTrigger>
              <TabsTrigger value="signup" className="flex-1">회원가입</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="email">이메일</Label>
                  <Input id="email" type="email" autoComplete="username" placeholder="name@example.com" className="min-h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">비밀번호</Label>
                  <Input id="password" type="password" autoComplete="current-password" placeholder="비밀번호를 입력해 주세요" className="min-h-11 text-base" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full min-h-11" disabled={loading || isLoading}>
                  {loading ? '확인하고 있어요...' : '로그인'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">{copy.note}</p>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">닉네임</Label>
                  <Input id="name" placeholder="게임에서 보여요" className="min-h-11 text-base" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">이메일</Label>
                  <Input id="email2" type="email" autoComplete="username" placeholder="name@example.com" className="min-h-11 text-base" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pw2">비밀번호</Label>
                  <Input id="pw2" type="password" autoComplete="new-password" placeholder="6자 이상 입력해 주세요" className="min-h-11 text-base" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                {confirmationSent && <p role="status" className="text-sm text-primary">가입 확인 이메일을 보냈습니다. 이메일의 확인 링크를 눌러 주세요.</p>}
                <Button type="submit" className="w-full min-h-11" disabled={loading || isLoading || confirmationSent}>
                  {loading ? '준비하고 있어요...' : copy.signUp}
                </Button>
                <p className="text-center text-xs text-muted-foreground">{copy.note}</p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
