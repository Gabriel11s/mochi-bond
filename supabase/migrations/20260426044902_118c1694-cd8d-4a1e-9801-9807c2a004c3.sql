CREATE TABLE public.word_game_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL,
  game_date date NOT NULL,
  word text NOT NULL,
  attempts text[] NOT NULL DEFAULT '{}',
  attempts_count integer NOT NULL DEFAULT 0,
  won boolean NOT NULL DEFAULT false,
  finished boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  received_hint_letter text,
  gave_hint boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_name, game_date)
);

CREATE INDEX idx_word_game_daily_date ON public.word_game_daily (game_date);

ALTER TABLE public.word_game_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read word_game_daily"
  ON public.word_game_daily FOR SELECT
  USING (true);

CREATE POLICY "public insert word_game_daily"
  ON public.word_game_daily FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public update word_game_daily"
  ON public.word_game_daily FOR UPDATE
  USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.word_game_daily;
ALTER TABLE public.word_game_daily REPLICA IDENTITY FULL;