ALTER TABLE public.treasure_items ADD COLUMN points integer NOT NULL DEFAULT 15;
ALTER TABLE public.treasure_items ADD COLUMN treasure_subtype text;