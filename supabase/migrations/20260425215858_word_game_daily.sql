-- Caça-palavras diário (estilo Termo) — 1 row por partner por dia.
-- Competitivo: ambos jogam a mesma palavra, vê quem termina primeiro
-- e em quantas tentativas. Cooperativo só na dica: o vencedor pode
-- "soprar" 1 letra pro outro (received_hint_letter).

CREATE TABLE IF NOT EXISTS public.word_game_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name TEXT NOT NULL,
  game_date DATE NOT NULL,
  word TEXT NOT NULL,
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,  -- array de strings (palpites)
  attempts_count INT NOT NULL DEFAULT 0,
  won BOOLEAN NOT NULL DEFAULT false,
  finished BOOLEAN NOT NULL DEFAULT false,      -- true se won OU 6 tentativas usadas
  received_hint_letter TEXT,                    -- letra dada pelo parceiro
  gave_hint BOOLEAN NOT NULL DEFAULT false,     -- já deu dica pro outro?
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_name, game_date)
);

ALTER TABLE public.word_game_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "word_game_select" ON public.word_game_daily FOR SELECT USING (true);
CREATE POLICY "word_game_insert" ON public.word_game_daily FOR INSERT WITH CHECK (true);
CREATE POLICY "word_game_update" ON public.word_game_daily FOR UPDATE USING (true) WITH CHECK (true);

-- Índice pra buscar progresso do dia atual rápido
CREATE INDEX IF NOT EXISTS idx_word_game_today
  ON public.word_game_daily (game_date DESC, partner_name);
