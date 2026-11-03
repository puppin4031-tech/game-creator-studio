CREATE TABLE public.survival_item_catalog (
  item_id text PRIMARY KEY CHECK (item_id ~ '^[a-z0-9_]{2,40}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  category text NOT NULL DEFAULT 'material' CHECK (category IN ('material','ore','food','processed','tool','weapon','armor','trinket')),
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','epic')),
  weight double precision NOT NULL DEFAULT 1 CHECK (weight >= 0 AND weight <= 200),
  image_path text,
  is_custom boolean NOT NULL DEFAULT false,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survival_item_catalog TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.survival_item_catalog TO authenticated;
GRANT ALL ON public.survival_item_catalog TO service_role;
ALTER TABLE public.survival_item_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read item catalog" ON public.survival_item_catalog FOR SELECT TO authenticated USING (true);
CREATE POLICY "Main admin inserts item catalog" ON public.survival_item_catalog FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'main_admin'));
CREATE POLICY "Main admin updates item catalog" ON public.survival_item_catalog FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'main_admin')) WITH CHECK (public.has_role(auth.uid(), 'main_admin'));
CREATE POLICY "Main admin deletes item catalog" ON public.survival_item_catalog FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'main_admin'));