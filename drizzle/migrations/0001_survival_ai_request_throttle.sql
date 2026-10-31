CREATE TABLE public.survival_ai_request_throttle (
  client_hash text PRIMARY KEY,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.survival_ai_request_throttle TO service_role;
REVOKE ALL ON public.survival_ai_request_throttle FROM anon, authenticated;
ALTER TABLE public.survival_ai_request_throttle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages AI throttle" ON public.survival_ai_request_throttle FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE FUNCTION public.claim_survival_ai_request(p_client_hash text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE claimed text;
BEGIN
 INSERT INTO public.survival_ai_request_throttle (client_hash, last_requested_at) VALUES (p_client_hash, now())
 ON CONFLICT (client_hash) DO UPDATE SET last_requested_at = now() WHERE survival_ai_request_throttle.last_requested_at < now() - interval '30 seconds'
 RETURNING client_hash INTO claimed;
 RETURN claimed IS NOT NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_survival_ai_request(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_survival_ai_request(text) TO service_role;