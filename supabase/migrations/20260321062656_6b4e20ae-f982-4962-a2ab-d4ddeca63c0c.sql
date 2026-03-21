
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('main_admin', 'sub_admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'sub_admin',
  display_name TEXT,
  email TEXT,
  assigned_region UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create regions table
CREATE TABLE public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  bounds_north DOUBLE PRECISION NOT NULL,
  bounds_south DOUBLE PRECISION NOT NULL,
  bounds_east DOUBLE PRECISION NOT NULL,
  bounds_west DOUBLE PRECISION NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create missions table
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  floor INTEGER NOT NULL DEFAULT 1,
  quiz_content TEXT,
  qr_code_info TEXT,
  status TEXT NOT NULL DEFAULT '작성중' CHECK (status IN ('작성중', '승인대기', '승인완료', '반려')),
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add FK from profiles to regions
ALTER TABLE public.profiles ADD CONSTRAINT profiles_assigned_region_fkey FOREIGN KEY (assigned_region) REFERENCES public.regions(id) ON DELETE SET NULL;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user's assigned region
CREATE OR REPLACE FUNCTION public.get_user_region(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT assigned_region FROM public.profiles WHERE user_id = _user_id
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;

-- PROFILES RLS
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Main admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'main_admin'));

CREATE POLICY "Main admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'main_admin'));

CREATE POLICY "Main admins can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'main_admin'));

CREATE POLICY "Users can update own profile display_name" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- REGIONS RLS
CREATE POLICY "Everyone can view regions" ON public.regions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Main admins can manage regions" ON public.regions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'main_admin'));

-- MISSIONS RLS
CREATE POLICY "Main admins can view all missions" ON public.missions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'main_admin'));

CREATE POLICY "Sub admins can view own region missions" ON public.missions
  FOR SELECT TO authenticated
  USING (region_id = public.get_user_region(auth.uid()));

CREATE POLICY "Sub admins can insert missions in own region" ON public.missions
  FOR INSERT TO authenticated
  WITH CHECK (
    region_id = public.get_user_region(auth.uid())
    AND creator_id = auth.uid()
  );

CREATE POLICY "Sub admins can update own draft missions" ON public.missions
  FOR UPDATE TO authenticated
  USING (
    creator_id = auth.uid()
    AND status IN ('작성중', '반려')
  );

CREATE POLICY "Main admins can update any mission" ON public.missions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'main_admin'));

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_missions_updated_at BEFORE UPDATE ON public.missions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Sample regions
INSERT INTO public.regions (name, description, center_lat, center_lng, bounds_north, bounds_south, bounds_east, bounds_west) VALUES
  ('홍대점', '홍대입구역 주변 방탈출 구역', 37.5563, 126.9237, 37.5600, 37.5520, 126.9280, 126.9190),
  ('강남점', '강남역 주변 방탈출 구역', 37.4979, 127.0276, 37.5020, 37.4940, 127.0320, 127.0230),
  ('명동점', '명동 중심가 방탈출 구역', 37.5636, 126.9869, 37.5670, 37.5600, 126.9910, 126.9830);
