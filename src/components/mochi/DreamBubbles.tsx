// Feature #10: Sonhos do Mochi — bolhas de sonho flutuando quando dorme
import { memo, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

const DREAM_EMOJIS = ["💗", "✨", "🍙", "🌙", "⭐", "🎵", "🌸", "🍓", "☁️", "💤"];
const BUCKET = "mochi-photos";

interface Bubble {
  id: number;
  content: string;
  isPhoto: boolean;
  x: number;
  delay: number;
}

let dreamId = 0;

function DreamBubblesInner({ active }: { active: boolean }) {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  // Carrega 4 fotos do casal pra usar nos sonhos
  useEffect(() => {
    if (!active) return;
    supabase
      .from("photos")
      .select("storage_path")
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (data) {
          const urls = data.map((p) =>
            supabase.storage.from(BUCKET).getPublicUrl(p.storage_path, {
              transform: { width: 64, height: 64, resize: "cover", quality: 50 },
            }).data.publicUrl
          );
          setPhotoUrls(urls);
        }
      });
  }, [active]);

  // Gera bolhas a cada 3s
  useEffect(() => {
    if (!active) {
      setBubbles([]);
      return;
    }

    const spawn = () => {
      const usePhoto = photoUrls.length > 0 && Math.random() < 0.3;
      const content = usePhoto
        ? photoUrls[Math.floor(Math.random() * photoUrls.length)]
        : DREAM_EMOJIS[Math.floor(Math.random() * DREAM_EMOJIS.length)];

      const bubble: Bubble = {
        id: ++dreamId,
        content,
        isPhoto: usePhoto,
        x: 30 + Math.random() * 40, // 30-70% da largura
        delay: Math.random() * 0.5,
      };

      setBubbles((prev) => [...prev.slice(-5), bubble]); // max 6 bolhas
    };

    spawn(); // primeira imediata
    const t = setInterval(spawn, 3500);
    return () => clearInterval(t);
  }, [active, photoUrls]);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 20, scale: 0.3 }}
            animate={{ opacity: 0.8, y: -120, scale: 1 }}
            exit={{ opacity: 0, y: -180, scale: 0.5 }}
            transition={{ duration: 4, delay: b.delay, ease: "easeOut" }}
            className="absolute"
            style={{ left: `${b.x}%`, bottom: "55%" }}
            onAnimationComplete={() =>
              setBubbles((prev) => prev.filter((x) => x.id !== b.id))
            }
          >
            {/* Bolha com formato de balão de pensamento */}
            <div className="relative">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-3 py-2 shadow-lg ring-1 ring-white/10">
                {b.isPhoto ? (
                  <img
                    src={b.content}
                    alt=""
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                ) : (
                  <span className="text-2xl">{b.content}</span>
                )}
              </div>
              {/* Bolinhas do balão de pensamento */}
              <div className="absolute -bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white/10" />
              <div className="absolute -bottom-4 left-1/2 h-1.5 w-1.5 translate-x-0 rounded-full bg-white/8" />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export const DreamBubbles = memo(DreamBubblesInner);
