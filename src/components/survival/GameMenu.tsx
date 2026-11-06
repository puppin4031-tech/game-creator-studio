import { useEffect, useState } from 'react';
import { Menu, LogOut, Settings, DoorOpen, MessageSquare, BookOpen, Megaphone } from 'lucide-react';
import SupportInquiryDialog from './SupportInquiryDialog';
import NoticeDialog from './NoticeDialog';
import { hasUnreadNotice, markNoticeRead } from '@/lib/survival/notices';
import GuideBook from './GuideBook';
import { toast } from 'sonner';
import { enableNotifications, notifySupported } from '@/lib/survival/notify';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { getSettings, saveSettings, subscribeSettings, playSfx, haptic, type GameSettings, type VolumeLevel } from '@/lib/survival/gameSettings';

interface Props { onExit: () => void; onLogout: () => Promise<void> | void; loggedIn: boolean }

export function useGameSettings() {
  const [s, setS] = useState<GameSettings>(getSettings);
  useEffect(() => subscribeSettings(setS), []);
  return s;
}

export default function GameMenu({ onExit, onLogout, loggedIn }: Props) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [unread, setUnread] = useState(hasUnreadNotice);
  const s = useGameSettings();
  const Row = ({ label, hint, k }: { label: string; hint: string; k: 'bgm' | 'sfx' | 'haptic' }) => (
    <label className="flex min-h-11 items-center justify-between gap-3">
      <span><b className="block text-sm">{label}</b><span className="text-xs text-muted-foreground">{hint}</span></span>
      <Switch checked={s[k]} onCheckedChange={(v) => { saveSettings({ [k]: v }); if (k === 'sfx' && v) playSfx('notify'); if (k === 'haptic' && v) haptic(80); }} />
    </label>
  );
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label="메뉴" className="pixel-btn relative flex h-11 w-11 items-center justify-center bg-card"><Menu className="!h-6 !w-6" />{unread && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-destructive" />}</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="font-pixel">
          <DropdownMenuItem className="min-h-11" onSelect={onExit}><DoorOpen className="mr-2 !h-5 !w-5" />나가기</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => { setNoticeOpen(true); markNoticeRead(); setUnread(false); }}><Megaphone className="mr-2 !h-5 !w-5" />공지사항{unread && <span className="ml-2 h-2 w-2 rounded-full bg-destructive" />}</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => setGuideOpen(true)}><BookOpen className="mr-2 !h-5 !w-5" />가이드</DropdownMenuItem>
          <DropdownMenuItem className="min-h-11" onSelect={() => setSettingsOpen(true)}><Settings className="mr-2 !h-5 !w-5" />설정</DropdownMenuItem>
          {loggedIn && <DropdownMenuItem className="min-h-11 text-destructive" onSelect={() => setConfirmLogout(true)}><LogOut className="mr-2 !h-5 !w-5" />로그아웃</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent className="font-pixel">
          <AlertDialogHeader><AlertDialogTitle>로그아웃 하시겠습니까?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">아니요</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={() => void onLogout()}>예</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="font-pixel">
          <DialogHeader><DialogTitle>설정</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Row k="bgm" label="배경음 (BGM)" hint="음악 앱과 함께 쓸 땐 꺼두세요" />
            <Row k="sfx" label="효과음 (SFX)" hint="타격음·위험 경고음" />
            <div>
              <b className="text-sm">소리 크기</b>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {(['S', 'M', 'L'] as VolumeLevel[]).map((v) => (
                  <button key={v} type="button" aria-pressed={s.volume === v} onClick={() => { saveSettings({ volume: v }); playSfx('notify'); }}
                    className={`pixel-btn min-h-11 text-sm ${s.volume === v ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{v}</button>
                ))}
              </div>
            </div>
            <Row k="haptic" label="진동" hint="주머니 속에서도 위험·공격·알림을 진동으로" />
            <label className="flex min-h-11 items-center justify-between gap-3">
              <span><b className="block text-sm">알림</b><span className="text-xs text-muted-foreground">연구 완료·원정대 귀환·공격·전투 신청을 알림으로</span></span>
              <Switch checked={s.notify} onCheckedChange={async (v) => {
                if (!v) { saveSettings({ notify: false }); return; }
                if (!notifySupported()) { toast.error('이 브라우저는 알림을 지원하지 않아요'); return; }
                if (!(await enableNotifications())) toast.error('알림 권한이 거부되었어요. 브라우저 설정에서 허용해 주세요');
                else toast.success('알림을 켰어요');
              }} />
            </label>
            <button type="button" onClick={() => { setSettingsOpen(false); setSupportOpen(true); }} className="pixel-btn flex min-h-11 w-full items-center justify-center gap-2 bg-card text-sm"><MessageSquare className="!h-5 !w-5" />문의하기</button>
          </div>
        </DialogContent>
      </Dialog>
      <SupportInquiryDialog open={supportOpen} onOpenChange={setSupportOpen} />
      <GuideBook open={guideOpen} onOpenChange={setGuideOpen} />
      <NoticeDialog open={noticeOpen} onOpenChange={setNoticeOpen} />
    </>
  );
}
