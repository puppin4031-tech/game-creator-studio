
-- Add puzzle fields to treasure_items
ALTER TABLE public.treasure_items
  ADD COLUMN challenge_type text NOT NULL DEFAULT 'quiz',
  ADD COLUMN puzzle_image_url text,
  ADD COLUMN puzzle_grid_size integer NOT NULL DEFAULT 3;

-- Create storage bucket for puzzle images
INSERT INTO storage.buckets (id, name, public) VALUES ('puzzle-images', 'puzzle-images', true);

-- Storage RLS policies
CREATE POLICY "Anyone can upload puzzle images" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'puzzle-images');
CREATE POLICY "Anyone can view puzzle images" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'puzzle-images');
CREATE POLICY "Anyone can delete puzzle images" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'puzzle-images');
