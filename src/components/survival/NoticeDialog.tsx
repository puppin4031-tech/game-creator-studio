import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { NOTICES, type NoticeTag } from '@/lib/survival/notices';

const TAG: Record<NoticeTag, { label: string; cls: string }> = {
  feature: { label: '추가', cls: 'bg-primary text-primary-foreground' },
  fix: { label: '수정', cls: 'bg-destructive text-destructive-foreground' },
  balance: { label: '조정', cls: 'bg-secondary text-secondary-foreground' },
};

export default function NoticeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="font-pixel max-h-[85dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>공지사항</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {NOTICES.map((n) => (
            <section key={n.id} className="border-b border-border pb-3 last:border-0">
              <p className="text-xs text-muted-foreground">{n.date}</p>
              <h3 className="text-sm font-bold">{n.title}</h3>
              <ul className="mt-2 space-y-1.5">
                {n.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${TAG[it.tag].cls}`}>{TAG[it.tag].label}</span>
                    <span>{it.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
