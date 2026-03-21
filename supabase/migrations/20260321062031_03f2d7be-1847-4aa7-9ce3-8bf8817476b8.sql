
-- Create spots table (game locations with floor info)
CREATE TABLE public.spots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  hint_text TEXT,
  item_name TEXT,
  item_icon TEXT DEFAULT 'package',
  quest_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_inventory table
CREATE TABLE public.user_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_icon TEXT DEFAULT 'package',
  acquired_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_logs table
CREATE TABLE public.game_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  spot_id UUID REFERENCES public.spots(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  floor INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_logs ENABLE ROW LEVEL SECURITY;

-- Spots are readable by everyone
CREATE POLICY "Spots are viewable by everyone" ON public.spots FOR SELECT USING (true);

-- User inventory policies
CREATE POLICY "Users can view their own inventory" ON public.user_inventory FOR SELECT USING (true);
CREATE POLICY "Users can add to their inventory" ON public.user_inventory FOR INSERT WITH CHECK (true);

-- Game logs policies
CREATE POLICY "Users can view their own logs" ON public.game_logs FOR SELECT USING (true);
CREATE POLICY "Users can create logs" ON public.game_logs FOR INSERT WITH CHECK (true);

-- Insert sample spots for testing (Seoul area)
INSERT INTO public.spots (name, latitude, longitude, floor, hint_text, item_name, item_icon) VALUES
  ('비밀의 입구', 37.5665, 126.9780, 1, '건물 입구에서 첫 번째 단서를 찾으세요', '열쇠 조각', 'key'),
  ('숨겨진 서재', 37.5665, 126.9785, 2, '2층 서재에 고대 문서가 숨겨져 있습니다', '고대 문서', 'scroll'),
  ('시계탑 꼭대기', 37.5670, 126.9780, 3, '시계탑에서 마지막 비밀을 풀어보세요', '시간의 보석', 'gem'),
  ('지하 연구실', 37.5660, 126.9775, -1, '지하에 숨겨진 연구 노트를 찾으세요', '연구 노트', 'file-text'),
  ('옥상 정원', 37.5668, 126.9790, 5, '옥상에서 별빛 아래 마지막 퍼즐을 맞추세요', '별의 파편', 'star');
