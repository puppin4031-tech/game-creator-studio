-- Security Hardening Migration
-- Addresses security findings:
-- 1. Users can award themselves a role, money, or a win
-- 2. Anyone can change who appears caught in a game (tag_players)
-- 3. Anyone can award themselves treasure points (treasure_items)
-- 4. Anyone can view nearby spawn records without signing in (global_spawns & get_nearby_spawns)

-- 1. FIX: Prevent users from self-promoting to admin or altering critical profile fields
CREATE OR REPLACE FUNCTION public.check_profile_role_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.has_role(auth.uid(), 'main_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only main admins can change user roles';
    END IF;
  END IF;
  IF NEW.assigned_region IS DISTINCT FROM OLD.assigned_region THEN
    IF NOT public.has_role(auth.uid(), 'main_admin'::public.app_role) THEN
      RAISE EXCEPTION 'Only main admins can change assigned region';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_profile_role_update ON public.profiles;
CREATE TRIGGER trg_check_profile_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_role_update();

DROP POLICY IF EXISTS "Users can update own profile display_name" ON public.profiles;
CREATE POLICY "Users can update own profile display_name" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (
      role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'main_admin'::public.app_role)
    )
  );

-- 2. FIX: Validate user_stats progression so users cannot inject arbitrary levels or XP
CREATE OR REPLACE FUNCTION public.validate_user_stats_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.level < 1 OR NEW.current_xp < 0 OR NEW.total_distance < 0 THEN
    RAISE EXCEPTION 'Invalid user stats values';
  END IF;
  IF NEW.level > OLD.level + 5 AND NOT public.has_role(auth.uid(), 'main_admin'::public.app_role) THEN
    RAISE EXCEPTION 'Level progression must be gradual';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_user_stats_update ON public.user_stats;
CREATE TRIGGER trg_validate_user_stats_update
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_stats_update();

-- 3. FIX: Anyone can change who appears caught in a game (tag_players)
DROP POLICY IF EXISTS "Anyone can update players" ON public.tag_players;
DROP POLICY IF EXISTS "Anyone can leave" ON public.tag_players;

CREATE POLICY "Players can update in own active room" ON public.tag_players
  FOR UPDATE TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tag_rooms r
      WHERE r.id = tag_players.room_id
        AND r.status != 'ended'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tag_rooms r
      WHERE r.id = tag_players.room_id
    )
  );

CREATE POLICY "Players can leave own room" ON public.tag_players
  FOR DELETE TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tag_rooms r
      WHERE r.id = tag_players.room_id
    )
  );

-- 4. FIX: Anyone can award themselves treasure points (treasure_items)
DROP POLICY IF EXISTS "Anyone can update treasure items" ON public.treasure_items;
DROP POLICY IF EXISTS "Anyone can delete treasure items" ON public.treasure_items;

CREATE POLICY "Players can claim unclaimed treasure" ON public.treasure_items
  FOR UPDATE TO anon, authenticated
  USING (found_by IS NULL)
  WITH CHECK (found_by IS NOT NULL);

CREATE POLICY "Only hosts can delete treasure items" ON public.treasure_items
  FOR DELETE TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tag_players p
      WHERE p.room_id = treasure_items.room_id
        AND p.is_host = true
    )
  );

-- 5. FIX: Anyone can view nearby spawn records without signing in & get_nearby_spawns access
REVOKE EXECUTE ON FUNCTION public.get_nearby_spawns(double precision, double precision, double precision) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_spawns(double precision, double precision, double precision) TO authenticated;

DROP POLICY IF EXISTS "Anyone can view spawns" ON public.global_spawns;
CREATE POLICY "Authenticated users can view spawns" ON public.global_spawns
  FOR SELECT TO authenticated
  USING (true);
