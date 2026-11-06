CREATE TABLE public.survival_invention_credits (user_id uuid PRIMARY KEY, day_key text NOT NULL, free_left integer NOT NULL DEFAULT 5 CHECK(free_left BETWEEN 0 AND 5), bonus integer NOT NULL DEFAULT 0 CHECK(bonus >= 0), fragments integer NOT NULL DEFAULT 0 CHECK(fragments >= 0), reservation uuid, reserved_at timestamptz, timer_started_at timestamptz, invite_claimed boolean NOT NULL DEFAULT false, walk_mark integer NOT NULL DEFAULT 0);
GRANT SELECT ON public.survival_invention_credits TO authenticated;
GRANT ALL ON public.survival_invention_credits TO service_role;
ALTER TABLE public.survival_invention_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY credits_owner_read ON public.survival_invention_credits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE OR REPLACE FUNCTION public.survival_invention_credit_action(p_user uuid, p_action text, p_token uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.survival_invention_credits; d text := to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM-DD'); steps integer; token uuid;
BEGIN
SELECT COALESCE((payload->>'exploredTotal')::integer,jsonb_array_length(payload->'explored'),0) INTO steps FROM public.survival_saves WHERE user_id=p_user;
steps := COALESCE(steps,0);
INSERT INTO public.survival_invention_credits(user_id,day_key,walk_mark) VALUES(p_user,d,steps) ON CONFLICT DO NOTHING;
SELECT * INTO r FROM public.survival_invention_credits WHERE user_id=p_user FOR UPDATE;
IF r.day_key <> d THEN r.day_key:=d; r.free_left:=5; r.invite_claimed:=false; r.walk_mark:=steps; r.timer_started_at:=NULL; END IF;
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
 IF steps-r.walk_mark<10 THEN RETURN jsonb_build_object('ok',false,'message','새 지역 200m를 실제 GPS로 탐험하세요'); END IF;
 r.bonus:=r.bonus+3; r.walk_mark:=steps;
ELSIF p_action='hint' THEN
 IF r.fragments<3 THEN RETURN jsonb_build_object('ok',false,'message','시행착오 파편 3개가 필요합니다'); END IF;
 r.fragments:=r.fragments-3;
ELSIF p_action<>'status' THEN RAISE EXCEPTION 'invalid credit action'; END IF;
UPDATE public.survival_invention_credits SET day_key=r.day_key,free_left=r.free_left,bonus=r.bonus,fragments=r.fragments,reservation=r.reservation,reserved_at=r.reserved_at,timer_started_at=r.timer_started_at,invite_claimed=r.invite_claimed,walk_mark=r.walk_mark WHERE user_id=p_user;
RETURN jsonb_build_object('ok',true,'token',token,'day',r.day_key,'freeLeft',r.free_left,'bonus',r.bonus,'fragments',r.fragments,'inviteClaimed',r.invite_claimed,'walkMeters',least(200,greatest(0,steps-r.walk_mark)*20));
END $$;
REVOKE ALL ON FUNCTION public.survival_invention_credit_action(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.survival_invention_credit_action(uuid,text,uuid) TO service_role;