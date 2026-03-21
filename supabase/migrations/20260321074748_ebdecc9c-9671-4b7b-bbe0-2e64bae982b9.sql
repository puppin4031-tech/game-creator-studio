
-- 1. Add bounds, creator_id, theme_id to spots table
ALTER TABLE public.spots
  ADD COLUMN IF NOT EXISTS bounds_north double precision,
  ADD COLUMN IF NOT EXISTS bounds_south double precision,
  ADD COLUMN IF NOT EXISTS bounds_east double precision,
  ADD COLUMN IF NOT EXISTS bounds_west double precision,
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS theme_id uuid REFERENCES public.themes(id) ON DELETE SET NULL;

-- 2. Create spot_elements table
CREATE TABLE IF NOT EXISTS public.spot_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spot_id uuid NOT NULL REFERENCES public.spots(id) ON DELETE CASCADE,
  theme_element_id uuid NOT NULL REFERENCES public.theme_elements(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS on spot_elements
ALTER TABLE public.spot_elements ENABLE ROW LEVEL SECURITY;

-- 4. Drop old spots SELECT policy and recreate with admin access
DROP POLICY IF EXISTS "Spots are viewable by everyone" ON public.spots;

CREATE POLICY "Admins can view all spots"
  ON public.spots FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'main_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
  );

-- 5. Spots INSERT — any admin can create
CREATE POLICY "Admins can insert spots"
  ON public.spots FOR INSERT TO authenticated
  WITH CHECK (
    (has_role(auth.uid(), 'main_admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role))
    AND creator_id = auth.uid()
  );

-- 6. Spots UPDATE — own spots or main_admin
CREATE POLICY "Admins can update own spots or main_admin all"
  ON public.spots FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR has_role(auth.uid(), 'main_admin'::app_role)
  );

-- 7. Spots DELETE — own spots or main_admin
CREATE POLICY "Admins can delete own spots or main_admin all"
  ON public.spots FOR DELETE TO authenticated
  USING (
    creator_id = auth.uid()
    OR has_role(auth.uid(), 'main_admin'::app_role)
  );

-- 8. spot_elements SELECT
CREATE POLICY "Admins can view spot elements"
  ON public.spot_elements FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'main_admin'::app_role)
    OR has_role(auth.uid(), 'sub_admin'::app_role)
  );

-- 9. spot_elements INSERT
CREATE POLICY "Admins can insert spot elements"
  ON public.spot_elements FOR INSERT TO authenticated
  WITH CHECK (
    creator_id = auth.uid()
    AND (has_role(auth.uid(), 'main_admin'::app_role) OR has_role(auth.uid(), 'sub_admin'::app_role))
  );

-- 10. spot_elements UPDATE — own or main_admin
CREATE POLICY "Admins can update own spot elements"
  ON public.spot_elements FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    OR has_role(auth.uid(), 'main_admin'::app_role)
  );

-- 11. spot_elements DELETE — own or main_admin
CREATE POLICY "Admins can delete own spot elements"
  ON public.spot_elements FOR DELETE TO authenticated
  USING (
    creator_id = auth.uid()
    OR has_role(auth.uid(), 'main_admin'::app_role)
  );
