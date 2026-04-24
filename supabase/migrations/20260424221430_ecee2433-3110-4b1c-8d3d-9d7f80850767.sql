ALTER TABLE public.quest_completions
  ADD COLUMN IF NOT EXISTS cuteness integer,
  ADD COLUMN IF NOT EXISTS vibe text;