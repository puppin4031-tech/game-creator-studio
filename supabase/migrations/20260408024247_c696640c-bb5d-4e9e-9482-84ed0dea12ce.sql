
-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;

-- 1. global_spawns: 오픈 월드 아이템 스폰 포인트
CREATE TABLE public.global_spawns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location extensions.geometry(Point, 4326) NOT NULL,
  item_type text NOT NULL,
  item_icon text NOT NULL DEFAULT 'gem',
  rarity text NOT NULL DEFAULT 'common',
  respawn_seconds integer NOT NULL DEFAULT 300,
  last_collected_at timestamp with time zone,
  last_collected_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_global_spawns_location ON public.global_spawns USING gist (location);

ALTER TABLE public.global_spawns ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view spawns
CREATE POLICY "Anyone can view spawns" ON public.global_spawns
  FOR SELECT TO authenticated USING (true);

-- Anyone authenticated can update spawn collection status
CREATE POLICY "Anyone can collect spawns" ON public.global_spawns
  FOR UPDATE TO authenticated USING (true);

-- Only admins can insert/delete spawns
CREATE POLICY "Admins can manage spawns" ON public.global_spawns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'main_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'main_admin'::app_role));

-- 2. user_inventory 확장: quantity 컬럼 추가
ALTER TABLE public.user_inventory
  ADD COLUMN IF NOT EXISTS quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS item_type text NOT NULL DEFAULT 'material';

-- 3. user_stats: 유저 레벨/경험치/이동거리
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  level integer NOT NULL DEFAULT 1,
  current_xp integer NOT NULL DEFAULT 0,
  total_distance double precision NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats" ON public.user_stats
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats" ON public.user_stats
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats" ON public.user_stats
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- 4. crafting_recipes: 세공 레시피
CREATE TABLE public.crafting_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_item_name text NOT NULL,
  result_item_icon text NOT NULL DEFAULT 'sparkles',
  result_item_type text NOT NULL DEFAULT 'jewelry',
  required_materials jsonb NOT NULL DEFAULT '[]'::jsonb,
  result_description text,
  bonus_type text,
  bonus_value double precision,
  level_required integer NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.crafting_recipes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view recipes
CREATE POLICY "Anyone can view recipes" ON public.crafting_recipes
  FOR SELECT TO authenticated USING (true);

-- Only admins can manage recipes
CREATE POLICY "Admins can manage recipes" ON public.crafting_recipes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'main_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'main_admin'::app_role));

-- RPC: 반경 내 스폰 조회 (PostGIS ST_DWithin)
CREATE OR REPLACE FUNCTION public.get_nearby_spawns(
  _lat double precision,
  _lng double precision,
  _radius_m double precision DEFAULT 500
)
RETURNS SETOF public.global_spawns
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.global_spawns
  WHERE is_active = true
    AND (last_collected_at IS NULL OR now() - last_collected_at > (respawn_seconds || ' seconds')::interval)
    AND extensions.ST_DWithin(
      location::extensions.geography,
      extensions.ST_SetSRID(extensions.ST_MakePoint(_lng, _lat), 4326)::extensions.geography,
      _radius_m
    );
$$;
