DROP POLICY IF EXISTS "Anyone can collect spawns" ON public.global_spawns;
CREATE POLICY "Signed-in users collect spawns" ON public.global_spawns FOR UPDATE TO authenticated
USING (is_active = true) WITH CHECK (last_collected_by = auth.uid());
DROP POLICY IF EXISTS "Anyone can delete puzzle images" ON storage.objects;