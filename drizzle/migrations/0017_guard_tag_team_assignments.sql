CREATE OR REPLACE FUNCTION public.guard_tag_team_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_owner uuid;
  room_status text;
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.room_id IS DISTINCT FROM OLD.room_id OR
    NEW.user_id IS DISTINCT FROM OLD.user_id OR
    NEW.is_host IS DISTINCT FROM OLD.is_host
  ) THEN
    RAISE EXCEPTION 'Player identity cannot be changed' USING ERRCODE = '42501';
  END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.team IS NOT NULL THEN
      RAISE EXCEPTION 'Teams must be assigned after joining' USING ERRCODE = '42501';
    END IF;
  ELSIF NEW.team IS DISTINCT FROM OLD.team THEN
    SELECT owner_id, status INTO room_owner, room_status
    FROM public.tag_rooms WHERE id = OLD.room_id FOR SHARE;
    IF auth.uid() IS NULL OR room_owner IS DISTINCT FROM auth.uid() OR room_status IS DISTINCT FROM 'waiting' THEN
      RAISE EXCEPTION 'Only the room owner can assign teams before the game starts' USING ERRCODE = '42501';
    END IF;
    IF NEW.team IS NOT NULL AND NEW.team NOT IN (1, 2) THEN
      RAISE EXCEPTION 'Invalid team' USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_tag_team_assignments() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_tag_team_assignments
BEFORE INSERT OR UPDATE ON public.tag_players
FOR EACH ROW EXECUTE FUNCTION public.guard_tag_team_assignments();