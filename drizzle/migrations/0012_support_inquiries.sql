CREATE TABLE public.support_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  category text NOT NULL DEFAULT 'general',
  message text NOT NULL CHECK (char_length(message) BETWEEN 2 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_inquiries TO authenticated;
GRANT ALL ON public.support_inquiries TO service_role;
ALTER TABLE public.support_inquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insert" ON public.support_inquiries FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status = 'open' AND admin_reply IS NULL);
CREATE POLICY "own or admin read" ON public.support_inquiries FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'main_admin'));
CREATE POLICY "admin update" ON public.support_inquiries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'main_admin')) WITH CHECK (public.has_role(auth.uid(), 'main_admin'));
CREATE TRIGGER support_inquiries_updated BEFORE UPDATE ON public.support_inquiries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();