DROP POLICY IF EXISTS "Anyone reads custom pets" ON public.survival_custom_pets;
CREATE POLICY "Read active custom pets" ON public.survival_custom_pets FOR SELECT
USING (is_active OR public.has_role(auth.uid(), 'main_admin'::public.app_role));
DROP POLICY IF EXISTS "Anyone reads custom mobs" ON public.survival_custom_mobs;
CREATE POLICY "Read active custom mobs" ON public.survival_custom_mobs FOR SELECT
USING (is_active OR public.has_role(auth.uid(), 'main_admin'::public.app_role));
DROP POLICY IF EXISTS "Signed-in users read item catalog" ON public.survival_item_catalog;
CREATE POLICY "Signed-in users read item catalog" ON public.survival_item_catalog FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);