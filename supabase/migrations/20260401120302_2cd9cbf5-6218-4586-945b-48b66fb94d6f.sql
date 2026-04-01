
-- Create tag_rooms table
CREATE TABLE public.tag_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code text NOT NULL UNIQUE,
  title text NOT NULL,
  host_id text NOT NULL,
  status text NOT NULL DEFAULT 'waiting',
  timer_seconds integer NOT NULL DEFAULT 600,
  team1_name text NOT NULL DEFAULT '팀 1',
  team2_name text NOT NULL DEFAULT '팀 2',
  started_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tag_players table
CREATE TABLE public.tag_players (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.tag_rooms(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  team integer DEFAULT NULL,
  latitude double precision DEFAULT 0,
  longitude double precision DEFAULT 0,
  is_caught boolean NOT NULL DEFAULT false,
  is_host boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create tag_messages table
CREATE TABLE public.tag_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.tag_rooms(id) ON DELETE CASCADE,
  sender_nickname text NOT NULL,
  message text NOT NULL,
  channel text NOT NULL DEFAULT 'all',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tag_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for tag_rooms (anon access)
CREATE POLICY "Anyone can view rooms" ON public.tag_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can create rooms" ON public.tag_rooms FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.tag_rooms FOR UPDATE TO anon, authenticated USING (true);

-- RLS policies for tag_players (anon access)
CREATE POLICY "Anyone can view players" ON public.tag_players FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can join" ON public.tag_players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update players" ON public.tag_players FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can leave" ON public.tag_players FOR DELETE TO anon, authenticated USING (true);

-- RLS policies for tag_messages (anon access)
CREATE POLICY "Anyone can view messages" ON public.tag_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can send messages" ON public.tag_messages FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tag_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tag_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tag_rooms;
