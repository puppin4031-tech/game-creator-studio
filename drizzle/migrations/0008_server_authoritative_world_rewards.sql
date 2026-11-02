DROP POLICY IF EXISTS "Users can add to their inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can delete their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can update own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Signed-in users collect spawns" ON public.global_spawns;

CREATE OR REPLACE FUNCTION public.collect_global_spawn(_spawn_id uuid, _lat double precision, _lng double precision)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); s public.global_spawns; xp integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF abs(_lat) > 90 OR abs(_lng) > 180 THEN RAISE EXCEPTION 'invalid position'; END IF;
  SELECT * INTO s FROM public.global_spawns WHERE id = _spawn_id FOR UPDATE;
  IF NOT FOUND OR NOT s.is_active THEN RAISE EXCEPTION 'spawn unavailable'; END IF;
  IF s.last_collected_at IS NOT NULL AND now() - s.last_collected_at <= make_interval(secs => s.respawn_seconds) THEN
    RAISE EXCEPTION 'spawn not ready';
  END IF;
  IF NOT extensions.ST_DWithin(s.location::extensions.geography,
       extensions.ST_SetSRID(extensions.ST_MakePoint(_lng, _lat), 4326)::extensions.geography, 25) THEN
    RAISE EXCEPTION 'too far';
  END IF;
  UPDATE public.global_spawns SET last_collected_at = now(), last_collected_by = uid WHERE id = s.id;
  INSERT INTO public.user_inventory (user_id, item_name, item_icon, item_type, quantity)
  VALUES (uid, s.item_type, s.item_icon, 'material', 1);
  xp := CASE s.rarity WHEN 'legendary' THEN 25 WHEN 'epic' THEN 15 WHEN 'rare' THEN 10 WHEN 'uncommon' THEN 5 ELSE 3 END;
  INSERT INTO public.user_stats (user_id, current_xp, level) VALUES (uid, xp, 1)
  ON CONFLICT (user_id) DO UPDATE SET current_xp = user_stats.current_xp + xp,
    level = GREATEST(user_stats.level, (user_stats.current_xp + xp) / 100 + 1);
  RETURN jsonb_build_object('item_type', s.item_type, 'xp', xp);
END; $$;

CREATE OR REPLACE FUNCTION public.craft_recipe(_recipe_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); r public.crafting_recipes; m jsonb; need integer; have integer; row record; lvl integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO r FROM public.crafting_recipes WHERE id = _recipe_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'recipe not found'; END IF;
  SELECT COALESCE(level, 1) INTO lvl FROM public.user_stats WHERE user_id = uid;
  IF COALESCE(lvl, 1) < r.level_required THEN RAISE EXCEPTION 'level too low'; END IF;
  FOR m IN SELECT * FROM jsonb_array_elements(r.required_materials) LOOP
    need := (m->>'quantity')::integer;
    SELECT COALESCE(sum(quantity), 0) INTO have FROM public.user_inventory
      WHERE user_id = uid AND item_type = 'material' AND item_name = m->>'item_type';
    IF have < need THEN RAISE EXCEPTION 'not enough materials'; END IF;
    FOR row IN SELECT id, quantity FROM public.user_inventory
      WHERE user_id = uid AND item_type = 'material' AND item_name = m->>'item_type'
      ORDER BY quantity FOR UPDATE LOOP
      EXIT WHEN need <= 0;
      IF row.quantity <= need THEN
        DELETE FROM public.user_inventory WHERE id = row.id; need := need - row.quantity;
      ELSE
        UPDATE public.user_inventory SET quantity = quantity - need WHERE id = row.id; need := 0;
      END IF;
    END LOOP;
  END LOOP;
  INSERT INTO public.user_inventory (user_id, item_name, item_icon, item_type, quantity)
  VALUES (uid, r.result_item_name, r.result_item_icon, 'jewelry', 1);
  INSERT INTO public.user_stats (user_id, current_xp, level) VALUES (uid, r.xp_reward, r.xp_reward / 100 + 1)
  ON CONFLICT (user_id) DO UPDATE SET current_xp = user_stats.current_xp + r.xp_reward,
    level = GREATEST(user_stats.level, (user_stats.current_xp + r.xp_reward) / 100 + 1);
  RETURN jsonb_build_object('item', r.result_item_name, 'xp', r.xp_reward);
END; $$;

REVOKE EXECUTE ON FUNCTION public.collect_global_spawn(uuid, double precision, double precision) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.craft_recipe(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collect_global_spawn(uuid, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.craft_recipe(uuid) TO authenticated;