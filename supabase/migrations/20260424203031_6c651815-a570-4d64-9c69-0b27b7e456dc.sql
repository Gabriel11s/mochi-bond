
ALTER TABLE public.pet_state
  ADD COLUMN IF NOT EXISTS equipped_skin text NOT NULL DEFAULT 'cream',
  ADD COLUMN IF NOT EXISTS equipped_accessory text NOT NULL DEFAULT 'none';

CREATE TABLE IF NOT EXISTS public.photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,
  caption text,
  uploaded_by text NOT NULL,
  happiness_boost integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read photos" ON public.photos FOR SELECT USING (true);
CREATE POLICY "public insert photos" ON public.photos FOR INSERT WITH CHECK (true);
CREATE POLICY "public delete photos" ON public.photos FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;

INSERT INTO storage.buckets (id, name, public)
VALUES ('mochi-photos', 'mochi-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read mochi photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'mochi-photos');

CREATE POLICY "public upload mochi photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mochi-photos');

CREATE POLICY "public delete mochi photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'mochi-photos');
