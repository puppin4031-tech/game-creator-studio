REVOKE EXECUTE ON FUNCTION public.claim_survival_ai_request(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.survival_ai_daily_usage (
  client_hash text NOT NULL,
  usage_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  request_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (client_hash, usage_date)
);
GRANT ALL ON public.survival_ai_daily_usage TO service_role;
ALTER TABLE public.survival_ai_daily_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.claim_survival_ai_daily(p_client_hash text, p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE n integer;
BEGIN
  INSERT INTO public.survival_ai_daily_usage (client_hash, request_count) VALUES (p_client_hash, 1)
  ON CONFLICT (client_hash, usage_date) DO UPDATE SET request_count = survival_ai_daily_usage.request_count + 1
  RETURNING request_count INTO n;
  RETURN n <= p_limit;
END; $$;
REVOKE EXECUTE ON FUNCTION public.claim_survival_ai_daily(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_survival_ai_daily(text, integer) TO service_role;

CREATE OR REPLACE FUNCTION public.validate_survival_save()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE s jsonb; arr text;
BEGIN
  IF pg_column_size(NEW.payload) > 524288 THEN RAISE EXCEPTION 'save too large'; END IF;
  IF jsonb_typeof(NEW.payload) <> 'object' OR jsonb_typeof(NEW.payload->'pos') <> 'object' THEN RAISE EXCEPTION 'invalid save'; END IF;
  IF (NEW.payload->>'hp')::numeric NOT BETWEEN 0 AND 200 OR (NEW.payload->>'hunger')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'invalid vitals'; END IF;
  IF (NEW.payload->>'lastTickAt')::numeric > (extract(epoch FROM now()) * 1000 + 300000) THEN RAISE EXCEPTION 'save from the future'; END IF;
  FOREACH arr IN ARRAY ARRAY['backpack','storage'] LOOP
    IF jsonb_typeof(COALESCE(NEW.payload->arr, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(NEW.payload->arr, '[]'::jsonb)) > 200 THEN RAISE EXCEPTION 'invalid %', arr; END IF;
    FOR s IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.payload->arr, '[]'::jsonb)) LOOP
      IF jsonb_typeof(s->'count') <> 'number' OR (s->>'count')::numeric < 0 OR (s->>'count')::numeric > 9999 THEN RAISE EXCEPTION 'invalid item count'; END IF;
    END LOOP;
  END LOOP;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_survival_save BEFORE INSERT OR UPDATE ON public.survival_saves FOR EACH ROW EXECUTE FUNCTION public.validate_survival_save();