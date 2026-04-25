-- Feature #4: Cartinhas de Amor (love_notes)
-- Feature #11: Conquistas do Casal (achievements)

-- ============================================
-- Feature #4: tabela love_notes
-- ============================================
CREATE TABLE IF NOT EXISTS public.love_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_partner TEXT NOT NULL,
  to_partner TEXT NOT NULL,
  message TEXT NOT NULL CHECK (char_length(message) <= 500),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: acesso público (mesma política das outras tabelas do mochi)
ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "love_notes_select" ON public.love_notes FOR SELECT USING (true);
CREATE POLICY "love_notes_insert" ON public.love_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "love_notes_update" ON public.love_notes FOR UPDATE USING (true) WITH CHECK (true);

-- Índice para buscar notas não lidas do parceiro
CREATE INDEX IF NOT EXISTS idx_love_notes_unread
  ON public.love_notes (to_partner, read)
  WHERE read = false;

-- ============================================
-- Feature #11: tabela achievements
-- ============================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_key TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  partner_name TEXT,
  UNIQUE (achievement_key)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert" ON public.achievements FOR INSERT WITH CHECK (true);
