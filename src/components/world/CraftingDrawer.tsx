import { useState, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Package, Hammer, Lock, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const ITEM_ICONS: Record<string, string> = {
  ruby: '❤️', sapphire: '💙', emerald: '💚', diamond: '💎',
  gold: '🥇', silver: '🥈', copper: '🟤', alloy: '⚙️',
  opal: '🤍', amethyst: '💜', topaz: '🧡', pearl: '🫧', tin: '🪨',
};

const RESULT_ICONS: Record<string, string> = {
  gem: '💍', sparkles: '✨', flower: '🌸', crown: '👑',
};

const BONUS_LABELS: Record<string, string> = {
  search_radius: '탐색 반경',
  detect_range: '감지 거리',
  respawn_reduction: '리스폰 감소',
  xp_multiplier: 'XP 보너스',
  move_speed: '이동 속도',
  rare_chance: '희귀 확률',
  all_bonus: '전체 보너스',
};

interface MaterialReq {
  item_type: string;
  quantity: number;
}

interface Recipe {
  id: string;
  result_item_name: string;
  result_item_icon: string;
  result_item_type: string;
  result_description: string | null;
  required_materials: MaterialReq[];
  bonus_type: string | null;
  bonus_value: number | null;
  level_required: number;
  xp_reward: number;
}

interface InventoryItem {
  id: string;
  item_name: string;
  item_type: string;
  item_icon: string | null;
  quantity: number;
}

interface CraftingDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CraftingDrawer({ open, onOpenChange }: CraftingDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [crafting, setCrafting] = useState(false);
  const [craftedItem, setCraftedItem] = useState<string | null>(null);

  const { data: recipes = [] } = useQuery({
    queryKey: ['crafting_recipes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('crafting_recipes').select('*');
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        required_materials: (r.required_materials as any) || [],
      })) as Recipe[];
    },
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['user_inventory', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('user_inventory').select('*').eq('user_id', user.id);
      return (data || []) as InventoryItem[];
    },
    enabled: !!user,
  });

  const { data: userStats } = useQuery({
    queryKey: ['user_stats', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('user_stats').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Aggregate inventory by item_name for materials
  const materialCounts = useMemo(() => {
    const map = new Map<string, number>();
    inventory.filter(i => i.item_type === 'material').forEach(i => {
      map.set(i.item_name, (map.get(i.item_name) || 0) + (i.quantity || 1));
    });
    return map;
  }, [inventory]);

  const userLevel = userStats?.level ?? 1;

  // Check if recipe is craftable
  const canCraft = useCallback((recipe: Recipe) => {
    if (userLevel < recipe.level_required) return false;
    return recipe.required_materials.every(
      mat => (materialCounts.get(mat.item_type) || 0) >= mat.quantity
    );
  }, [materialCounts, userLevel]);

  const handleCraft = useCallback(async (recipe: Recipe) => {
    if (!user || crafting || !canCraft(recipe)) return;
    setCrafting(true);
    try {
      // Consume materials: delete inventory rows (quantity-based)
      for (const mat of recipe.required_materials) {
        let remaining = mat.quantity;
        const matItems = inventory
          .filter(i => i.item_name === mat.item_type && i.item_type === 'material')
          .sort((a, b) => (a.quantity || 1) - (b.quantity || 1));
        
        for (const item of matItems) {
          if (remaining <= 0) break;
          const itemQty = item.quantity || 1;
          if (itemQty <= remaining) {
            await supabase.from('user_inventory').delete().eq('id', item.id);
            remaining -= itemQty;
          } else {
            await supabase.from('user_inventory').update({ quantity: itemQty - remaining }).eq('id', item.id);
            remaining = 0;
          }
        }
      }

      // Add crafted item to inventory
      await supabase.from('user_inventory').insert({
        user_id: user.id,
        item_name: recipe.result_item_name,
        item_icon: recipe.result_item_icon,
        item_type: 'jewelry',
        quantity: 1,
      });

      // Award XP
      if (userStats) {
        const newXp = (userStats.current_xp || 0) + recipe.xp_reward;
        const newLevel = Math.floor(newXp / 100) + 1;
        await supabase.from('user_stats').update({
          current_xp: newXp,
          level: Math.max(userStats.level || 1, newLevel),
        }).eq('user_id', user.id);
      }

      setCraftedItem(recipe.result_item_name);
      setTimeout(() => setCraftedItem(null), 2500);
      toast.success(`${recipe.result_item_name} 제작 완료! +${recipe.xp_reward} XP`);

      queryClient.invalidateQueries({ queryKey: ['user_inventory'] });
      queryClient.invalidateQueries({ queryKey: ['user_stats'] });
    } catch (e) {
      toast.error('제작 실패');
    } finally {
      setCrafting(false);
    }
  }, [user, crafting, canCraft, inventory, userStats, queryClient]);

  const materials = Array.from(materialCounts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const jewelryItems = inventory.filter(i => i.item_type === 'jewelry');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl bg-card border-border">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Hammer size={20} /> 세공 작업대
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="recipes" className="h-full">
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="recipes">📜 레시피</TabsTrigger>
            <TabsTrigger value="materials">🧱 재료 ({materials.length})</TabsTrigger>
            <TabsTrigger value="jewelry">💍 장신구 ({jewelryItems.length})</TabsTrigger>
          </TabsList>

          {/* ===== RECIPES ===== */}
          <TabsContent value="recipes" className="overflow-y-auto max-h-[calc(85vh-140px)] space-y-3 pr-1">
            {recipes.sort((a, b) => a.level_required - b.level_required).map(recipe => {
              const craftable = canCraft(recipe);
              const levelLocked = userLevel < recipe.level_required;
              return (
                <div
                  key={recipe.id}
                  className={`rounded-xl border p-3 transition-all ${
                    craftable ? 'border-green-500/50 bg-green-500/5' :
                    levelLocked ? 'border-border/50 bg-muted/30 opacity-60' :
                    'border-border bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{RESULT_ICONS[recipe.result_item_icon] || '💍'}</span>
                      <div>
                        <div className="font-bold text-sm text-foreground">{recipe.result_item_name}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          {levelLocked ? (
                            <span className="flex items-center gap-1 text-destructive"><Lock size={10} /> Lv.{recipe.level_required} 필요</span>
                          ) : (
                            <span className="text-yellow-500">Lv.{recipe.level_required}</span>
                          )}
                          {recipe.bonus_type && (
                            <span className="text-primary">
                              {BONUS_LABELS[recipe.bonus_type] || recipe.bonus_type} +{recipe.bonus_value}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles size={10} className="mr-1" /> +{recipe.xp_reward} XP
                      </Badge>
                      <Button
                        size="sm"
                        disabled={!craftable || crafting}
                        onClick={() => handleCraft(recipe)}
                        className={craftable ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                      >
                        {crafting ? '...' : '제작'}
                      </Button>
                    </div>
                  </div>
                  {/* Materials list */}
                  <div className="flex flex-wrap gap-2">
                    {recipe.required_materials.map((mat, i) => {
                      const have = materialCounts.get(mat.item_type) || 0;
                      const enough = have >= mat.quantity;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
                            enough ? 'border-green-500/50 text-green-400' : 'border-destructive/50 text-destructive'
                          }`}
                        >
                          <span>{ITEM_ICONS[mat.item_type] || '📦'}</span>
                          <span className="capitalize">{mat.item_type}</span>
                          <span className="font-mono">{have}/{mat.quantity}</span>
                          {enough ? <Check size={10} /> : <X size={10} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </TabsContent>

          {/* ===== MATERIALS ===== */}
          <TabsContent value="materials" className="overflow-y-auto max-h-[calc(85vh-140px)]">
            {materials.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Package size={40} className="mx-auto mb-3 opacity-40" />
                <p>보유한 재료가 없습니다</p>
                <p className="text-xs mt-1">월드 맵에서 원석과 금속을 채집하세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {materials.map(([name, count]) => (
                  <div key={name} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-border bg-card">
                    <span className="text-3xl">{ITEM_ICONS[name] || '📦'}</span>
                    <span className="text-xs font-medium capitalize text-foreground">{name}</span>
                    <span className="text-lg font-bold text-primary">×{count}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ===== JEWELRY ===== */}
          <TabsContent value="jewelry" className="overflow-y-auto max-h-[calc(85vh-140px)]">
            {jewelryItems.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <Sparkles size={40} className="mx-auto mb-3 opacity-40" />
                <p>제작한 장신구가 없습니다</p>
                <p className="text-xs mt-1">레시피 탭에서 장신구를 제작하세요!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {jewelryItems.map(item => {
                  const recipe = recipes.find(r => r.result_item_name === item.item_name);
                  return (
                    <div key={item.id} className="p-3 rounded-xl border border-primary/30 bg-primary/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{RESULT_ICONS[item.item_icon || 'gem'] || '💍'}</span>
                        <span className="font-bold text-sm text-foreground">{item.item_name}</span>
                      </div>
                      {recipe?.bonus_type && (
                        <div className="text-xs text-primary">
                          {BONUS_LABELS[recipe.bonus_type]} +{recipe.bonus_value}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Craft success animation */}
        <AnimatePresence>
          {craftedItem && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 pointer-events-none"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.6 }}
                className="text-center"
              >
                <div className="text-7xl mb-4">💍</div>
                <div className="text-2xl font-bold text-foreground">{craftedItem}</div>
                <div className="text-lg text-primary mt-1">제작 완료!</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}
