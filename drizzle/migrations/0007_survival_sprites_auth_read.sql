DROP POLICY IF EXISTS "Public reads survival sprites" ON storage.objects;
CREATE POLICY "Signed-in users read survival sprites" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'survival-sprites');