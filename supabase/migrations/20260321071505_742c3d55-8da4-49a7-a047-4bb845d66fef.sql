
CREATE TYPE public.theme_category AS ENUM ('biblical', 'historical', 'fantasy', 'nature');

CREATE TABLE public.themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.theme_category NOT NULL,
  name text NOT NULL,
  description text,
  thumbnail_url text,
  color_primary text DEFAULT '#6366f1',
  color_secondary text DEFAULT '#8b5cf6',
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage themes" ON public.themes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'main_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'main_admin'::app_role));

CREATE POLICY "Sub admins can view themes" ON public.themes
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sub_admin'::app_role));

CREATE TYPE public.theme_element_type AS ENUM ('item', 'quiz', 'puzzle', 'story');

CREATE TABLE public.theme_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id uuid NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  element_type public.theme_element_type NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  icon text DEFAULT 'package',
  content jsonb DEFAULT '{}'::jsonb,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.theme_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage theme elements" ON public.theme_elements
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'main_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'main_admin'::app_role));

CREATE POLICY "Sub admins can view theme elements" ON public.theme_elements
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'sub_admin'::app_role));
