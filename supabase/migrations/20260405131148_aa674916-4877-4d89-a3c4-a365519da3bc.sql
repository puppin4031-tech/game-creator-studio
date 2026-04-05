
-- Add game_mode column to tag_rooms
ALTER TABLE public.tag_rooms ADD COLUMN game_mode text NOT NULL DEFAULT 'tag';

-- Create treasure_items table
CREATE TABLE public.treasure_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.tag_rooms(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  quiz_question text NOT NULL,
  quiz_answer text NOT NULL,
  found_by uuid REFERENCES public.tag_players(id) ON DELETE SET NULL,
  found_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treasure_items ENABLE ROW LEVEL SECURITY;

-- Public RLS policies (same as tag game tables)
CREATE POLICY "Anyone can view treasure items" ON public.treasure_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert treasure items" ON public.treasure_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update treasure items" ON public.treasure_items FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can delete treasure items" ON public.treasure_items FOR DELETE TO anon, authenticated USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.treasure_items;
