CREATE TABLE public.survival_saves (
  user_id uuid PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.survival_saves TO authenticated;
GRANT ALL ON public.survival_saves TO service_role;

ALTER TABLE public.survival_saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own survival save"
  ON public.survival_saves FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own survival save"
  ON public.survival_saves FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own survival save"
  ON public.survival_saves FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);