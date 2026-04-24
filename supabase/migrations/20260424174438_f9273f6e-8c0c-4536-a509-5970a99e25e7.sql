-- Mochi Room schema

-- 1. Couple settings (single row): secret code + which two display names
CREATE TABLE public.couple_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  secret_code TEXT NOT NULL DEFAULT 'mochi',
  partner_one_name TEXT NOT NULL DEFAULT 'Você',
  partner_two_name TEXT NOT NULL DEFAULT 'Par',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Pet state (single shared row)
CREATE TABLE public.pet_state (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pet_name TEXT NOT NULL DEFAULT 'Mochi',
  hunger INTEGER NOT NULL DEFAULT 70,
  happiness INTEGER NOT NULL DEFAULT 80,
  energy INTEGER NOT NULL DEFAULT 75,
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_mood TEXT NOT NULL DEFAULT 'happy',
  last_fed_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  last_interaction_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Food catalog
CREATE TABLE public.food_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'docinhos',
  hunger_value INTEGER NOT NULL DEFAULT 0,
  happiness_value INTEGER NOT NULL DEFAULT 0,
  energy_value INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Interactions (history)
CREATE TABLE public.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  food_id UUID REFERENCES public.food_items(id) ON DELETE SET NULL,
  food_name TEXT,
  food_emoji TEXT,
  hunger_delta INTEGER NOT NULL DEFAULT 0,
  happiness_delta INTEGER NOT NULL DEFAULT 0,
  energy_delta INTEGER NOT NULL DEFAULT 0,
  xp_delta INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_interactions_created_at ON public.interactions(created_at DESC);

-- Seed singletons
INSERT INTO public.couple_settings (id) VALUES (1);
INSERT INTO public.pet_state (id) VALUES (1);

-- Seed food catalog
INSERT INTO public.food_items (name, emoji, category, hunger_value, happiness_value, energy_value, rarity) VALUES
  ('Morango', '🍓', 'frutinhas', 12, 4, 0, 'common'),
  ('Mirtilo', '🫐', 'frutinhas', 8, 6, 2, 'common'),
  ('Banana', '🍌', 'frutinhas', 15, 3, 4, 'common'),
  ('Cookie', '🍪', 'docinhos', 8, 10, 0, 'common'),
  ('Bolinho', '🧁', 'docinhos', 10, 15, 0, 'uncommon'),
  ('Pirulito', '🍭', 'docinhos', 4, 12, 2, 'common'),
  ('Chazinho', '🍵', 'bebidas', 5, 6, 12, 'common'),
  ('Leitinho', '🥛', 'bebidas', 8, 8, 8, 'common'),
  ('Suquinho', '🧃', 'bebidas', 6, 10, 6, 'common'),
  ('Sushi', '🍣', 'especiais', 18, 12, 6, 'uncommon'),
  ('Bolo de festa', '🎂', 'especiais', 20, 25, 0, 'rare'),
  ('Pudim mágico', '🍮', 'raras', 25, 30, 15, 'special');

-- Open access: secret code is the gatekeeper at the app level (intentional for 2-person private app)
ALTER TABLE public.couple_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read couple_settings" ON public.couple_settings FOR SELECT USING (true);
CREATE POLICY "public update couple_settings" ON public.couple_settings FOR UPDATE USING (true);

CREATE POLICY "public read pet_state" ON public.pet_state FOR SELECT USING (true);
CREATE POLICY "public update pet_state" ON public.pet_state FOR UPDATE USING (true);

CREATE POLICY "public read food_items" ON public.food_items FOR SELECT USING (true);

CREATE POLICY "public read interactions" ON public.interactions FOR SELECT USING (true);
CREATE POLICY "public insert interactions" ON public.interactions FOR INSERT WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pet_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
ALTER TABLE public.pet_state REPLICA IDENTITY FULL;
ALTER TABLE public.interactions REPLICA IDENTITY FULL;