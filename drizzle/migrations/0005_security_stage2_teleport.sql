CREATE OR REPLACE FUNCTION public.validate_survival_save()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE s jsonb; arr text; d_m double precision; dt_s double precision;
  olat double precision; olng double precision; nlat double precision; nlng double precision;
BEGIN
  IF pg_column_size(NEW.payload) > 524288 THEN RAISE EXCEPTION 'save too large'; END IF;
  IF jsonb_typeof(NEW.payload) <> 'object' OR jsonb_typeof(NEW.payload->'pos') <> 'object' THEN RAISE EXCEPTION 'invalid save'; END IF;
  IF jsonb_typeof(NEW.payload->'pos'->'lat') <> 'number' OR jsonb_typeof(NEW.payload->'pos'->'lng') <> 'number' THEN RAISE EXCEPTION 'invalid position'; END IF;
  nlat := (NEW.payload->'pos'->>'lat')::double precision; nlng := (NEW.payload->'pos'->>'lng')::double precision;
  IF abs(nlat) > 90 OR abs(nlng) > 180 THEN RAISE EXCEPTION 'invalid position'; END IF;
  IF (NEW.payload->>'hp')::numeric NOT BETWEEN 0 AND 200 OR (NEW.payload->>'hunger')::numeric NOT BETWEEN 0 AND 100 THEN RAISE EXCEPTION 'invalid vitals'; END IF;
  IF (NEW.payload->>'lastTickAt')::numeric > (extract(epoch FROM now()) * 1000 + 300000) THEN RAISE EXCEPTION 'save from the future'; END IF;
  FOREACH arr IN ARRAY ARRAY['backpack','storage'] LOOP
    IF jsonb_typeof(COALESCE(NEW.payload->arr, '[]'::jsonb)) <> 'array' OR jsonb_array_length(COALESCE(NEW.payload->arr, '[]'::jsonb)) > 200 THEN RAISE EXCEPTION 'invalid %', arr; END IF;
    FOR s IN SELECT * FROM jsonb_array_elements(COALESCE(NEW.payload->arr, '[]'::jsonb)) LOOP
      IF jsonb_typeof(s->'count') <> 'number' OR (s->>'count')::numeric < 0 OR (s->>'count')::numeric > 9999 THEN RAISE EXCEPTION 'invalid item count'; END IF;
    END LOOP;
  END LOOP;
  -- Teleport guard: implied travel since the last stored save must stay below 100 m/s (+1 km GPS slack).
  IF TG_OP = 'UPDATE' AND jsonb_typeof(OLD.payload->'pos'->'lat') = 'number' AND jsonb_typeof(OLD.payload->'pos'->'lng') = 'number' THEN
    olat := (OLD.payload->'pos'->>'lat')::double precision; olng := (OLD.payload->'pos'->>'lng')::double precision;
    d_m := 6371000 * 2 * asin(sqrt(power(sin(radians(nlat - olat) / 2), 2) + cos(radians(olat)) * cos(radians(nlat)) * power(sin(radians(nlng - olng) / 2), 2)));
    dt_s := GREATEST(0, extract(epoch FROM (now() - OLD.updated_at)));
    IF d_m > 1000 + 100 * dt_s THEN RAISE EXCEPTION 'impossible movement'; END IF;
    IF (NEW.payload->>'lastTickAt')::numeric < (OLD.payload->>'lastTickAt')::numeric THEN RAISE EXCEPTION 'stale save'; END IF;
  END IF;
  RETURN NEW;
END; $$;