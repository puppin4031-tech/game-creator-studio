DROP POLICY IF EXISTS "Anyone can insert treasure items" ON public.treasure_items;
DROP POLICY IF EXISTS "Anyone can update treasure items" ON public.treasure_items;
DROP POLICY IF EXISTS "Anyone can delete treasure items" ON public.treasure_items;

CREATE POLICY "Room owner can insert treasure items" ON public.treasure_items
  FOR INSERT TO authenticated WITH CHECK (public.is_tag_room_owner(room_id) AND found_by IS NULL AND found_at IS NULL AND points BETWEEN 0 AND 100);
CREATE POLICY "Room owner can delete treasure items" ON public.treasure_items
  FOR DELETE TO authenticated USING (public.is_tag_room_owner(room_id));
CREATE POLICY "Room members can claim treasure items" ON public.treasure_items
  FOR UPDATE TO authenticated
  USING (public.is_tag_room_member(room_id) OR public.is_tag_room_owner(room_id))
  WITH CHECK (public.is_tag_room_member(room_id) OR public.is_tag_room_owner(room_id));

CREATE OR REPLACE FUNCTION public.guard_treasure_item_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.room_id IS DISTINCT FROM OLD.room_id OR NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION 'Treasure room and points are immutable';
  END IF;
  IF NEW.found_by IS DISTINCT FROM OLD.found_by OR NEW.found_at IS DISTINCT FROM OLD.found_at THEN
    IF OLD.found_by IS NOT NULL OR NEW.found_by IS NULL THEN
      RAISE EXCEPTION 'Treasure already claimed';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.tag_players p WHERE p.id = NEW.found_by AND p.room_id = NEW.room_id AND p.user_id = auth.uid()) THEN
      RAISE EXCEPTION 'You can only claim treasure for yourself';
    END IF;
    NEW.found_at := now();
  END IF;
  IF (NEW.keyword, NEW.latitude, NEW.longitude, NEW.quiz_question, NEW.quiz_answer, NEW.challenge_type, NEW.puzzle_image_url, NEW.puzzle_grid_size, NEW.treasure_subtype)
     IS DISTINCT FROM (OLD.keyword, OLD.latitude, OLD.longitude, OLD.quiz_question, OLD.quiz_answer, OLD.challenge_type, OLD.puzzle_image_url, OLD.puzzle_grid_size, OLD.treasure_subtype)
     AND NOT public.is_tag_room_owner(OLD.room_id) THEN
    RAISE EXCEPTION 'Only the room owner can edit treasure details';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_treasure_item_update ON public.treasure_items;
CREATE TRIGGER guard_treasure_item_update BEFORE UPDATE ON public.treasure_items
  FOR EACH ROW EXECUTE FUNCTION public.guard_treasure_item_update();