CREATE TABLE public.survival_vassals (
  vassal_id uuid PRIMARY KEY,
  lord_id uuid NOT NULL,
  lord_name text NOT NULL DEFAULT '',
  vassal_name text NOT NULL DEFAULT '',
  last_tribute_on date,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survival_vassals_not_self CHECK (vassal_id <> lord_id)
);
GRANT SELECT, DELETE ON public.survival_vassals TO authenticated;
GRANT ALL ON public.survival_vassals TO service_role;
ALTER TABLE public.survival_vassals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read own vassal link" ON public.survival_vassals FOR SELECT TO authenticated USING (auth.uid() = vassal_id OR auth.uid() = lord_id);
CREATE POLICY "Members break own vassal link" ON public.survival_vassals FOR DELETE TO authenticated USING (auth.uid() = vassal_id OR auth.uid() = lord_id);

CREATE TABLE public.survival_tributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lord_id uuid NOT NULL,
  vassal_id uuid NOT NULL,
  vassal_name text NOT NULL DEFAULT '',
  item_id text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz
);
GRANT SELECT ON public.survival_tributes TO authenticated;
GRANT ALL ON public.survival_tributes TO service_role;
ALTER TABLE public.survival_tributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parties read own tributes" ON public.survival_tributes FOR SELECT TO authenticated USING (auth.uid() = lord_id OR auth.uid() = vassal_id);

-- The caller consents to becoming a vassal of _lord (only the vassal can create the link).
CREATE OR REPLACE FUNCTION public.become_survival_vassal(_lord uuid, _lord_name text, _vassal_name text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL OR _lord IS NULL OR _lord = uid THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM survival_vassals WHERE vassal_id = _lord AND lord_id = uid) THEN RETURN false; END IF;
  INSERT INTO survival_vassals (vassal_id, lord_id, lord_name, vassal_name)
  VALUES (uid, _lord, left(coalesce(_lord_name, ''), 40), left(coalesce(_vassal_name, ''), 40))
  ON CONFLICT (vassal_id) DO UPDATE SET lord_id = EXCLUDED.lord_id, lord_name = EXCLUDED.lord_name,
    vassal_name = EXCLUDED.vassal_name, last_tribute_on = NULL, created_at = now();
  RETURN true;
END $$;

-- Once per day: pick a random stored item from the caller's cloud save and send 1 to the lord.
CREATE OR REPLACE FUNCTION public.pay_survival_tribute()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); v survival_vassals%ROWTYPE; pick text;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v FROM survival_vassals WHERE vassal_id = uid FOR UPDATE;
  IF NOT FOUND OR (v.last_tribute_on IS NOT NULL AND v.last_tribute_on >= current_date) THEN RETURN NULL; END IF;
  SELECT el->>'itemId' INTO pick
  FROM survival_saves s, jsonb_array_elements(coalesce(s.payload->'storage', '[]'::jsonb)) el
  WHERE s.user_id = uid AND coalesce((el->>'count')::int, 0) > 0
  ORDER BY random() LIMIT 1;
  UPDATE survival_vassals SET last_tribute_on = current_date WHERE vassal_id = uid;
  IF pick IS NULL THEN RETURN jsonb_build_object('item_id', NULL, 'lord_name', v.lord_name); END IF;
  INSERT INTO survival_tributes (lord_id, vassal_id, vassal_name, item_id, count) VALUES (v.lord_id, uid, v.vassal_name, pick, 1);
  RETURN jsonb_build_object('item_id', pick, 'lord_name', v.lord_name);
END $$;

CREATE OR REPLACE FUNCTION public.claim_survival_tributes()
RETURNS TABLE(item_id text, count integer, vassal_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  RETURN QUERY UPDATE survival_tributes t SET claimed_at = now()
    WHERE t.lord_id = auth.uid() AND t.claimed_at IS NULL
    RETURNING t.item_id, t.count, t.vassal_name;
END $$;

REVOKE EXECUTE ON FUNCTION public.become_survival_vassal(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.pay_survival_tribute() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_survival_tributes() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.become_survival_vassal(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_survival_tribute() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_survival_tributes() TO authenticated;