
-- Add DELETE policy for tag_rooms
CREATE POLICY "Anyone can delete rooms"
ON public.tag_rooms
FOR DELETE
TO anon, authenticated
USING (true);

-- Add DELETE policy for tag_messages
CREATE POLICY "Anyone can delete messages"
ON public.tag_messages
FOR DELETE
TO anon, authenticated
USING (true);

-- Add foreign key with cascade on tag_players.room_id
ALTER TABLE public.tag_players
DROP CONSTRAINT IF EXISTS tag_players_room_id_fkey;

ALTER TABLE public.tag_players
ADD CONSTRAINT tag_players_room_id_fkey
FOREIGN KEY (room_id) REFERENCES public.tag_rooms(id) ON DELETE CASCADE;

-- Add foreign key with cascade on tag_messages.room_id
ALTER TABLE public.tag_messages
DROP CONSTRAINT IF EXISTS tag_messages_room_id_fkey;

ALTER TABLE public.tag_messages
ADD CONSTRAINT tag_messages_room_id_fkey
FOREIGN KEY (room_id) REFERENCES public.tag_rooms(id) ON DELETE CASCADE;
