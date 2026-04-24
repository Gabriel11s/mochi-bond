
ALTER TABLE public.pet_state
  ADD COLUMN IF NOT EXISTS last_fed_by_gab TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_fed_by_tita TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS died_at TIMESTAMPTZ;

UPDATE public.pet_state
SET last_fed_by_gab = COALESCE(last_fed_by_gab, now()),
    last_fed_by_tita = COALESCE(last_fed_by_tita, now())
WHERE id = 1;
