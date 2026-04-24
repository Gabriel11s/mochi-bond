
-- 1. food_items: marca todas como desbloqueáveis, depois libera 4 starters
ALTER TABLE public.food_items
  ADD COLUMN IF NOT EXISTS is_unlockable boolean NOT NULL DEFAULT true;

UPDATE public.food_items SET is_unlockable = true;

-- liberta 4 starters (os 4 primeiros nomes que existirem)
UPDATE public.food_items SET is_unlockable = false
WHERE name IN ('Maçã', 'Banana', 'Água', 'Bolinho de arroz', 'Morango', 'Cenoura', 'Cookie', 'Leite');

-- 2. quests
CREATE TABLE IF NOT EXISTS public.quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  hint text NOT NULL,
  emoji text NOT NULL DEFAULT '🎯',
  proof_type text NOT NULL DEFAULT 'photo',
  proof_target text NOT NULL,
  category text NOT NULL DEFAULT 'casa',
  reward_food_rarity text NOT NULL DEFAULT 'common',
  reward_food_count integer NOT NULL DEFAULT 1,
  reward_xp integer NOT NULL DEFAULT 5,
  cooldown_minutes integer NOT NULL DEFAULT 1200, -- 20h por padrão
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read quests" ON public.quests FOR SELECT USING (true);

-- 3. quest_completions (log + cooldown)
CREATE TABLE IF NOT EXISTS public.quest_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quest_id uuid NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  photo_id uuid REFERENCES public.photos(id) ON DELETE SET NULL,
  photo_path text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  ai_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quest_completions_partner_quest
  ON public.quest_completions(partner_name, quest_id, created_at DESC);

ALTER TABLE public.quest_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read quest_completions" ON public.quest_completions FOR SELECT USING (true);
CREATE POLICY "public insert quest_completions" ON public.quest_completions FOR INSERT WITH CHECK (true);
CREATE POLICY "public update quest_completions" ON public.quest_completions FOR UPDATE USING (true);

-- 4. pantry_items
CREATE TABLE IF NOT EXISTS public.pantry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  food_id uuid NOT NULL REFERENCES public.food_items(id) ON DELETE CASCADE,
  source_quest_id uuid REFERENCES public.quests(id) ON DELETE SET NULL,
  consumed boolean NOT NULL DEFAULT false,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pantry_partner_consumed
  ON public.pantry_items(partner_name, consumed);

ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read pantry_items" ON public.pantry_items FOR SELECT USING (true);
CREATE POLICY "public insert pantry_items" ON public.pantry_items FOR INSERT WITH CHECK (true);
CREATE POLICY "public update pantry_items" ON public.pantry_items FOR UPDATE USING (true);

-- realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pantry_items;
ALTER TABLE public.quest_completions REPLICA IDENTITY FULL;
ALTER TABLE public.pantry_items REPLICA IDENTITY FULL;

-- 5. seed de quests (18)
INSERT INTO public.quests (slug, title, hint, emoji, proof_target, category, reward_food_rarity, reward_food_count, reward_xp, cooldown_minutes) VALUES
  -- casa (cooldown curto: 4h, repetível várias vezes ao dia)
  ('foto-garfo', 'Mostra um garfo!', 'Vai na cozinha e tira foto de um garfo', '🍴', 'um garfo ou talher de mesa visível e em foco', 'casa', 'common', 1, 6, 240),
  ('foto-colher', 'E uma colherzinha?', 'Tira foto de uma colher', '🥄', 'uma colher visível e em foco', 'casa', 'common', 1, 6, 240),
  ('foto-faca', 'Cadê a faca?', 'Foto de uma faca de mesa', '🔪', 'uma faca de mesa ou cozinha', 'casa', 'common', 1, 6, 240),
  ('foto-caneca', 'Tua caneca favorita', 'Mostra a caneca que você mais usa', '☕', 'uma caneca, xícara ou copo', 'casa', 'common', 1, 6, 240),
  ('foto-televisao', 'O que tá passando?', 'Foto da televisão (ligada ou desligada)', '📺', 'uma televisão ou monitor', 'casa', 'uncommon', 1, 10, 360),
  ('foto-geladeira', 'Mostra a geladeira aberta', 'Foto da geladeira aberta com algo dentro', '🧊', 'uma geladeira aberta com itens visíveis', 'casa', 'uncommon', 2, 12, 720),
  ('foto-janela', 'A vista da janela', 'Foto da paisagem da sua janela', '🪟', 'vista de uma janela, céu ou paisagem externa', 'casa', 'uncommon', 1, 10, 360),
  ('foto-livro', 'Um livro qualquer', 'Foto de um livro', '📚', 'um livro físico, fechado ou aberto', 'casa', 'common', 1, 6, 240),
  ('foto-planta', 'Uma plantinha', 'Foto de uma planta de casa', '🪴', 'uma planta verde ou flor', 'casa', 'uncommon', 1, 10, 360),
  ('foto-tenis', 'Teus tênis', 'Foto dos seus tênis ou sapatos', '👟', 'tênis ou sapatos', 'casa', 'common', 1, 6, 240),
  ('foto-pelucia', 'Algo fofinho', 'Foto de uma pelúcia, pet ou objeto fofo', '🧸', 'um bichinho de pelúcia, animal de estimação ou objeto considerado fofo', 'casa', 'uncommon', 1, 12, 360),
  ('foto-celular', 'Tua tela de bloqueio', 'Foto da sua tela de bloqueio do celular', '📱', 'tela de celular ligado, com hora ou app visível', 'casa', 'common', 1, 6, 240),

  -- casal (cooldown longo, recompensa alta)
  ('selfie-juntos', 'Selfie de vocês dois! 💑', 'Tira uma selfie com a outra pessoa do lado', '🤳', 'uma selfie com duas pessoas próximas no enquadramento', 'casal', 'rare', 1, 25, 1200),
  ('foto-do-par', 'Foto do/a parceiro/a', 'Tira uma foto da outra pessoa (não selfie)', '💞', 'uma foto de UMA pessoa real, não uma selfie, mostrando rosto ou corpo de alguém que claramente não é quem está tirando', 'casal', 'special', 1, 35, 1200),
  ('maos-dadas', 'Mãos dadas', 'Foto das mãos de vocês juntas', '🤝', 'duas mãos próximas ou entrelaçadas', 'casal', 'rare', 1, 20, 1200),
  ('cafe-juntos', 'Café da manhã pros dois', 'Foto de duas xícaras ou dois pratos juntos', '☕', 'duas xícaras, dois pratos ou duas porções de comida lado a lado', 'casal', 'rare', 1, 20, 1200),

  -- romantico
  ('por-do-sol', 'O céu de hoje', 'Foto de um pôr-do-sol, nascer-do-sol ou céu colorido', '🌅', 'pôr-do-sol, nascer-do-sol ou céu com cores quentes (laranja, rosa, roxo)', 'romantico', 'special', 1, 30, 1440),
  ('momento-especial', 'Um momento bonito', 'Foto de algo que tá te marcando hoje', '✨', 'qualquer cena ao ar livre, paisagem, restaurante, evento ou ambiente especial (não uma selfie nem objeto comum de casa)', 'romantico', 'rare', 1, 25, 1440)
ON CONFLICT (slug) DO NOTHING;

-- 6. starter pantry: 4 itens iniciais pra cada parceiro do casal
DO $$
DECLARE
  starter_ids uuid[];
  partner record;
BEGIN
  SELECT array_agg(id) INTO starter_ids
  FROM (SELECT id FROM public.food_items WHERE is_unlockable = false LIMIT 4) s;

  IF starter_ids IS NULL OR array_length(starter_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  FOR partner IN
    SELECT partner_one_name AS name FROM public.couple_settings WHERE id = 1
    UNION
    SELECT partner_two_name FROM public.couple_settings WHERE id = 1
  LOOP
    -- só insere se o parceiro ainda não tem nada na pantry
    IF NOT EXISTS (SELECT 1 FROM public.pantry_items WHERE partner_name = partner.name) THEN
      INSERT INTO public.pantry_items (partner_name, food_id)
      SELECT partner.name, unnest(starter_ids);
    END IF;
  END LOOP;
END $$;
