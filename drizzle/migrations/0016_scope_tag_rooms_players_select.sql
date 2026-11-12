CREATE OR REPLACE FUNCTION public.is_tag_room_member(_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.tag_players WHERE room_id = _room AND user_id = auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.is_tag_room_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_tag_room_member(uuid) TO authenticated;

DROP POLICY IF EXISTS "Signed-in users view players" ON public.tag_players;
CREATE POLICY "Room members view players" ON public.tag_players FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_tag_room_member(room_id) OR public.is_tag_room_owner(room_id));

DROP POLICY IF EXISTS "Signed-in users view rooms" ON public.tag_rooms;
CREATE POLICY "Open lobby rooms or own rooms visible" ON public.tag_rooms FOR SELECT TO authenticated
  USING (status IN ('waiting','playing') OR owner_id = auth.uid() OR public.is_tag_room_member(id));