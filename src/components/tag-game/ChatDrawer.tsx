import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TagMessage, TagRoom } from '@/hooks/useTagRoom';
import { MessageCircle, Send } from 'lucide-react';

interface Props {
  room: TagRoom;
  messages: TagMessage[];
  currentNickname: string;
  currentTeam: number | null;
  isHost: boolean;
  onSend: (message: string, channel: string) => void;
}

export default function ChatDrawer({ room, messages, currentNickname, currentTeam, isHost, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [tab, setTab] = useState<string>(currentTeam === 1 ? 'team1' : currentTeam === 2 ? 'team2' : 'all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const teamChannel = currentTeam === 1 ? 'team1' : 'team2';

  const filteredMessages = messages.filter(m => {
    if (tab === 'all') return m.channel === 'all';
    return m.channel === tab;
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [filteredMessages.length, open]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), tab);
    setText('');
  };

  const unreadCount = messages.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="secondary" className="h-16 w-16 rounded-full shadow-lg relative">
          <MessageCircle className="w-7 h-7" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 text-xs bg-destructive text-destructive-foreground rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-lg">채팅</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-2 py-2">
          <Badge
            variant={tab === teamChannel ? 'default' : 'outline'}
            className="cursor-pointer text-sm px-3 py-1"
            onClick={() => setTab(teamChannel)}
          >
            팀 채팅
          </Badge>
          {isHost && (
            <Badge
              variant={tab === 'all' ? 'default' : 'outline'}
              className="cursor-pointer text-sm px-3 py-1"
              onClick={() => setTab('all')}
            >
              전체 채팅
            </Badge>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-2 py-2">
          {filteredMessages.map(m => (
            <div key={m.id} className={`text-base ${m.sender_nickname === currentNickname ? 'text-right' : ''}`}>
              <span className="text-sm text-muted-foreground">{m.sender_nickname}</span>
              <div className={`inline-block px-3 py-2 rounded-lg max-w-[80%] ${
                m.sender_nickname === currentNickname
                  ? 'bg-primary text-primary-foreground ml-auto'
                  : 'bg-muted'
              }`}>
                {m.message}
              </div>
            </div>
          ))}
          {filteredMessages.length === 0 && (
            <p className="text-center text-base text-muted-foreground py-8">메시지가 없습니다</p>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-2 border-t">
          <Input
            placeholder="메시지 입력..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="text-base h-11"
          />
          <Button size="icon" onClick={handleSend} className="h-11 w-11">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
