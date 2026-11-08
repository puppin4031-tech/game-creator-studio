CREATE TABLE public.survival_custom_pets (
  pet_id text PRIMARY KEY,
  name text NOT NULL,
  hatch_mode text NOT NULL DEFAULT 'distance' CHECK (hatch_mode IN ('steps','distance')),
  hatch_steps integer NOT NULL DEFAULT 500 CHECK (hatch_steps BETWEEN 50 AND 100000),
  hatch_meters integer NOT NULL DEFAULT 300 CHECK (hatch_meters BETWEEN 20 AND 50000),
  max_speed_kmh integer NOT NULL DEFAULT 13 CHECK (max_speed_kmh BETWEEN 3 AND 13),
  weight integer NOT NULL DEFAULT 1 CHECK (weight BETWEEN 0 AND 100),
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survival_custom_pets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survival_custom_pets TO authenticated;
GRANT ALL ON public.survival_custom_pets TO service_role;
ALTER TABLE public.survival_custom_pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads custom pets" ON public.survival_custom_pets FOR SELECT USING (true);
CREATE POLICY "Main admin inserts custom pets" ON public.survival_custom_pets FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'main_admin'));
CREATE POLICY "Main admin updates custom pets" ON public.survival_custom_pets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'main_admin')) WITH CHECK (has_role(auth.uid(), 'main_admin'));
CREATE POLICY "Main admin deletes custom pets" ON public.survival_custom_pets FOR DELETE TO authenticated USING (has_role(auth.uid(), 'main_admin'));

CREATE TABLE public.survival_custom_mobs (
  mob_id text PRIMARY KEY,
  name text NOT NULL,
  hp integer NOT NULL DEFAULT 20 CHECK (hp BETWEEN 1 AND 500),
  atk integer NOT NULL DEFAULT 3 CHECK (atk BETWEEN 0 AND 50),
  temper text NOT NULL DEFAULT 'neutral' CHECK (temper IN ('passive','neutral','aggressive')),
  xp integer NOT NULL DEFAULT 20 CHECK (xp BETWEEN 0 AND 1000),
  spawn_weight numeric NOT NULL DEFAULT 1 CHECK (spawn_weight BETWEEN 0 AND 10),
  is_active boolean NOT NULL DEFAULT true,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.survival_custom_mobs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.survival_custom_mobs TO authenticated;
GRANT ALL ON public.survival_custom_mobs TO service_role;
ALTER TABLE public.survival_custom_mobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads custom mobs" ON public.survival_custom_mobs FOR SELECT USING (true);
CREATE POLICY "Main admin inserts custom mobs" ON public.survival_custom_mobs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'main_admin'));
CREATE POLICY "Main admin updates custom mobs" ON public.survival_custom_mobs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'main_admin')) WITH CHECK (has_role(auth.uid(), 'main_admin'));
CREATE POLICY "Main admin deletes custom mobs" ON public.survival_custom_mobs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'main_admin'));