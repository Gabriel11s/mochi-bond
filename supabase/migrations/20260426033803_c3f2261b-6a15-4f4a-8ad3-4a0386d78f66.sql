-- achievements: conquistas desbloqueadas
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  achievement_key text NOT NULL UNIQUE,
  partner_name text,
  unlocked_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "public insert achievements" ON public.achievements FOR INSERT WITH CHECK (true);

-- love_notes: bilhetinhos do casal
CREATE TABLE IF NOT EXISTS public.love_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name text NOT NULL,
  message text NOT NULL,
  emoji text NOT NULL DEFAULT '💌',
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read love_notes" ON public.love_notes FOR SELECT USING (true);
CREATE POLICY "public insert love_notes" ON public.love_notes FOR INSERT WITH CHECK (true);
CREATE POLICY "public update love_notes" ON public.love_notes FOR UPDATE USING (true);