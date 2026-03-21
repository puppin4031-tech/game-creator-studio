import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Package } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface InventoryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: Tables<'user_inventory'>[];
}

export function InventoryDrawer({ open, onOpenChange, items }: InventoryDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            내 가방 ({items.length})
          </DrawerTitle>
        </DrawerHeader>
        <div className="p-4 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">아직 획득한 아이템이 없습니다</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {items.map(item => (
                <div
                  key={item.id}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-secondary/50 border border-border"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Package className="h-5 w-5 text-accent" />
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{item.item_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
