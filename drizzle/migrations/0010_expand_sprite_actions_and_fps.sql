-- Expand allowed actions in survival_sprite_animations to support all 9 actions + scale + talk
ALTER TABLE public.survival_sprite_animations DROP CONSTRAINT IF EXISTS survival_sprite_animations_action_check;
ALTER TABLE public.survival_sprite_animations ADD CONSTRAINT survival_sprite_animations_action_check CHECK (
  action IN ('idle', 'walk', 'gather', 'attack', 'chop', 'talk', 'poop', 'pick_nose', 'nose_pick', 'celebrate', 'hurt', 'scale')
);

-- Expand fps constraint to accommodate scale ratio storage (50~300) and high-speed animations
ALTER TABLE public.survival_sprite_animations DROP CONSTRAINT IF EXISTS survival_sprite_animations_fps_check;
ALTER TABLE public.survival_sprite_animations ADD CONSTRAINT survival_sprite_animations_fps_check CHECK (fps BETWEEN 1 AND 500);
