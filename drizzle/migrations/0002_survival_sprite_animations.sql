CREATE TABLE public.survival_sprite_animations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_key text NOT NULL DEFAULT 'hunter',
  action text NOT NULL CHECK (action IN ('idle','walk','gather','attack','talk')),
  image_path text NOT NULL,
  frame_count int NOT NULL CHECK (frame_count BETWEEN 1 AND 32),
  fps int NOT NULL CHECK (fps BETWEEN 1 AND 30),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (character_key, action)
);
GRANT SELECT ON public.survival_sprite_animations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survival_sprite_animations TO authenticated;
GRANT ALL ON public.survival_sprite_animations TO service_role;
ALTER TABLE public.survival_sprite_animations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads sprite animations" ON public.survival_sprite_animations FOR SELECT USING (true);
CREATE POLICY "Main admin inserts sprite animations" ON public.survival_sprite_animations FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'main_admin'::app_role));
CREATE POLICY "Main admin updates sprite animations" ON public.survival_sprite_animations FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'main_admin'::app_role));
CREATE POLICY "Main admin deletes sprite animations" ON public.survival_sprite_animations FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'main_admin'::app_role));
CREATE POLICY "Public reads survival sprites" ON storage.objects FOR SELECT USING (bucket_id = 'survival-sprites');
CREATE POLICY "Main admin uploads survival sprites" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survival-sprites' AND public.has_role(auth.uid(), 'main_admin'::app_role));
CREATE POLICY "Main admin updates survival sprites" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'survival-sprites' AND public.has_role(auth.uid(), 'main_admin'::app_role));
CREATE POLICY "Main admin deletes survival sprites" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'survival-sprites' AND public.has_role(auth.uid(), 'main_admin'::app_role));