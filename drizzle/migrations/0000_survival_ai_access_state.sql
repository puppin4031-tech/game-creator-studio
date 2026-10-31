CREATE TABLE public.survival_ai_access_state (
  id text PRIMARY KEY,
  status_code integer NOT NULL DEFAULT 403,
  message text NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.survival_ai_access_state TO service_role;
REVOKE ALL ON public.survival_ai_access_state FROM anon, authenticated;
ALTER TABLE public.survival_ai_access_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages AI access state" ON public.survival_ai_access_state FOR ALL TO service_role USING (true) WITH CHECK (true);