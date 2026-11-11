ALTER TABLE public.tag_rooms ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.tag_players ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.is_tag_room_owner(_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tag_rooms WHERE id = _room AND owner_id = auth.uid())
$$;

DROP POLICY IF EXISTS "Anyone can delete rooms" ON public.tag_rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON public.tag_rooms;
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.tag_rooms;
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.tag_rooms;
CREATE POLICY "Signed-in users view rooms" ON public.tag_rooms FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users create own rooms" ON public.tag_rooms FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update rooms" ON public.tag_rooms FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners delete rooms" ON public.tag_rooms FOR DELETE TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can leave" ON public.tag_players;
DROP POLICY IF EXISTS "Anyone can update players" ON public.tag_players;
DROP POLICY IF EXISTS "Anyone can join" ON public.tag_players;
DROP POLICY IF EXISTS "Anyone can view players" ON public.tag_players;
CREATE POLICY "Signed-in users view players" ON public.tag_players FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users join as themselves" ON public.tag_players FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (is_host = false OR public.is_tag_room_owner(room_id)));
CREATE POLICY "Self or room owner update players" ON public.tag_players FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_tag_room_owner(room_id)) WITH CHECK (user_id = auth.uid() OR public.is_tag_room_owner(room_id));
CREATE POLICY "Self or room owner remove players" ON public.tag_players FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_tag_room_owner(room_id));