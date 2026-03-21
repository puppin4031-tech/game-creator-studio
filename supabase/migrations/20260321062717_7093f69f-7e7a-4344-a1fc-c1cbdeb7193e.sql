
-- Fix overly permissive RLS on user_inventory
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can add to their inventory" ON public.user_inventory;

CREATE POLICY "Users can view their own inventory" ON public.user_inventory
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can add to their inventory" ON public.user_inventory
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Fix overly permissive RLS on game_logs
DROP POLICY IF EXISTS "Users can view their own logs" ON public.game_logs;
DROP POLICY IF EXISTS "Users can create logs" ON public.game_logs;

CREATE POLICY "Users can view their own logs" ON public.game_logs
  FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create logs" ON public.game_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);
