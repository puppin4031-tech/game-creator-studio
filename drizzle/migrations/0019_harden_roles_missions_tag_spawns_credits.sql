CREATE OR REPLACE FUNCTION public.guard_profile_privileges() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.has_role(auth.uid(), 'main_admin') THEN RETURN NEW; END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.assigned_region IS DISTINCT FROM OLD.assigned_region
     OR NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Only main admins can change roles' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_profile_privileges ON public.profiles;
CREATE TRIGGER guard_profile_privileges BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privileges();

DROP POLICY IF EXISTS "Sub admins can update own draft missions" ON public.missions;
CREATE POLICY "Sub admins can update own draft missions" ON public.missions FOR UPDATE TO authenticated
USING (creator_id = auth.uid() AND status IN ('작성중','반려'))
WITH CHECK (creator_id = auth.uid() AND status IN ('작성중','반려','승인대기') AND reviewed_by IS NULL AND region_id = public.get_user_region(auth.uid()));

CREATE OR REPLACE FUNCTION public.guard_tag_caught() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'service_role' OR public.is_tag_room_owner(OLD.room_id) THEN RETURN NEW; END IF;
  IF NEW.is_caught IS DISTINCT FROM OLD.is_caught AND NOT (OLD.is_caught = false AND NEW.is_caught = true) THEN
    RAISE EXCEPTION 'Only the room owner can change caught status' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_tag_caught ON public.tag_players;
CREATE TRIGGER guard_tag_caught BEFORE UPDATE ON public.tag_players FOR EACH ROW EXECUTE FUNCTION public.guard_tag_caught();

REVOKE EXECUTE ON FUNCTION public.get_nearby_spawns(double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_nearby_spawns(double precision, double precision, double precision) TO authenticated;

ALTER TABLE public.survival_invention_credits ADD COLUMN IF NOT EXISTS walk_claims integer NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS last_walk_claim_at timestamptz;

CREATE OR REPLACE FUNCTION public.survival_invention_credit_action(p_user uuid, p_action text, p_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE r public.survival_invention_credits; d text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD'); steps integer; token uuid;
BEGIN
SELECT COALESCE((payload->>'walkSteps')::integer,0) INTO steps FROM public.survival_saves WHERE user_id=p_user;
steps := COALESCE(steps,0);
INSERT INTO public.survival_invention_credits(user_id,day_key,walk_mark) VALUES(p_user,d,steps) ON CONFLICT DO NOTHING;
SELECT * INTO r FROM public.survival_invention_credits WHERE user_id=p_user FOR UPDATE;
IF r.day_key <> d THEN r.day_key:=d; r.free_left:=5; r.invite_claimed:=false; r.walk_mark:=steps; r.timer_started_at:=NULL; r.walk_claims:=0; END IF;
IF r.walk_mark > steps THEN r.walk_mark:=steps; END IF;
IF r.reservation IS NOT NULL AND r.reserved_at < now()-interval '2 minutes' THEN r.reservation:=NULL; END IF;
IF p_action='reserve' THEN
 IF r.reservation IS NOT NULL OR r.free_left+r.bonus=0 THEN RETURN jsonb_build_object('ok',false,'message','발명권이 없거나 이미 발명 중입니다'); END IF;
 r.reservation:=gen_random_uuid(); r.reserved_at:=now(); token:=r.reservation;
ELSIF p_action IN ('accept','reject','cancel') THEN
 IF r.reservation IS DISTINCT FROM p_token OR r.reservation IS NULL THEN RETURN jsonb_build_object('ok',false,'message','발명 요청이 만료되었습니다'); END IF;
 IF p_action='accept' THEN IF r.free_left>0 THEN r.free_left:=r.free_left-1; ELSE r.bonus:=r.bonus-1; END IF;
 ELSIF p_action='reject' THEN r.fragments:=r.fragments+1; END IF;
 r.reservation:=NULL;
ELSIF p_action='timer_start' THEN r.timer_started_at:=now();
ELSIF p_action='timer' THEN
 IF r.timer_started_at IS NULL OR now()-r.timer_started_at < interval '15 seconds' THEN RETURN jsonb_build_object('ok',false,'message','15초 시청을 완료하세요'); END IF;
 r.bonus:=r.bonus+1; r.timer_started_at:=NULL;
ELSIF p_action='invite' THEN
 IF r.invite_claimed THEN RETURN jsonb_build_object('ok',false,'message','오늘 초대 보상을 이미 받았습니다'); END IF;
 r.bonus:=r.bonus+3; r.invite_claimed:=true;
ELSIF p_action='walk' THEN
 IF steps-r.walk_mark<10 THEN RETURN jsonb_build_object('ok',false,'message','시속 13km 이하로 새 지역 200m를 걸어 탐험하세요'); END IF;
 IF r.walk_claims >= 3 THEN RETURN jsonb_build_object('ok',false,'message','오늘 걷기 보상을 모두 받았습니다'); END IF;
 -- 200m at walking pace takes at least ~1 minute; enforce a server-side interval since the last claim
 IF r.last_walk_claim_at IS NOT NULL AND now()-r.last_walk_claim_at < interval '10 minutes' THEN RETURN jsonb_build_object('ok',false,'message','걷기 보상은 10분마다 받을 수 있습니다'); END IF;
 r.bonus:=r.bonus+3; r.walk_mark:=steps; r.walk_claims:=r.walk_claims+1; r.last_walk_claim_at:=now();
ELSIF p_action='hint' THEN
 IF r.fragments<3 THEN RETURN jsonb_build_object('ok',false,'message','시행착오 파편 3개가 필요합니다'); END IF;
 r.fragments:=r.fragments-3;
ELSIF p_action<>'status' THEN RAISE EXCEPTION 'invalid credit action'; END IF;
UPDATE public.survival_invention_credits SET day_key=r.day_key, free_left=r.free_left, bonus=r.bonus, fragments=r.fragments, reservation=r.reservation, reserved_at=r.reserved_at, timer_started_at=r.timer_started_at, invite_claimed=r.invite_claimed, walk_mark=r.walk_mark, walk_claims=r.walk_claims, last_walk_claim_at=r.last_walk_claim_at WHERE user_id=p_user;
RETURN jsonb_build_object('ok',true,'token',token,'day',r.day_key,'freeLeft',r.free_left,'bonus',r.bonus,'fragments',r.fragments,'inviteClaimed',r.invite_claimed,'walkMeters',least(200,greatest(0,steps-r.walk_mark)*20));
END $function$;
REVOKE EXECUTE ON FUNCTION public.survival_invention_credit_action(uuid,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.survival_invention_credit_action(uuid,text,uuid) TO service_role;