-- Photo metadata: 24h spotlight + snapshot do Mochi + sugestão musical.
-- Serve a Galeria (polaroids) e o PhotoWall (só featured aparece).

ALTER TABLE public.photos
  ADD COLUMN IF NOT EXISTS featured_until        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS shown_skin            TEXT,
  ADD COLUMN IF NOT EXISTS shown_accessory       TEXT,
  ADD COLUMN IF NOT EXISTS shown_mood            TEXT,
  ADD COLUMN IF NOT EXISTS suggested_track_id    TEXT,
  ADD COLUMN IF NOT EXISTS suggested_track_name  TEXT,
  ADD COLUMN IF NOT EXISTS suggested_track_artist TEXT;

-- Índice pra buscar rápido as fotos em destaque (PhotoWall + GalleryDrawer)
CREATE INDEX IF NOT EXISTS idx_photos_featured
  ON public.photos (featured_until DESC NULLS LAST)
  WHERE featured_until IS NOT NULL;
