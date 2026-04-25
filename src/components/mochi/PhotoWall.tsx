import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface PhotoRow {
  id: string;
  storage_path: string;
}

const BUCKET = "mochi-photos";

// Disposição em "polaroid" pseudo-aleatória mas determinística (por índice)
// para cada foto ficar num lugar bonito do painel.
const SLOTS: Array<{ top: string; left?: string; right?: string; rotate: number; size: number }> = [
  { top: "4%", left: "3%", rotate: -8, size: 64 },
  { top: "8%", right: "4%", rotate: 6, size: 72 },
  { top: "18%", left: "10%", rotate: 4, size: 56 },
  { top: "22%", right: "12%", rotate: -7, size: 60 },
  { top: "32%", left: "2%", rotate: -3, size: 70 },
  { top: "36%", right: "3%", rotate: 9, size: 64 },
  { top: "48%", left: "12%", rotate: -10, size: 54 },
  { top: "52%", right: "10%", rotate: 5, size: 58 },
  { top: "62%", left: "4%", rotate: 7, size: 66 },
  { top: "66%", right: "6%", rotate: -6, size: 62 },
  { top: "78%", left: "10%", rotate: -4, size: 56 },
  { top: "82%", right: "12%", rotate: 8, size: 60 },
  { top: "90%", left: "3%", rotate: 3, size: 52 },
  { top: "92%", right: "4%", rotate: -9, size: 56 },
];

export function PhotoWall() {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("photos")
        .select("id, storage_path")
        .order("created_at", { ascending: false })
        .limit(SLOTS.length);
      if (active && data) setPhotos(data as PhotoRow[]);
    };
    load();

    const ch = supabase
      .channel("mochi-photo-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "photos" },
        () => load(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, []);

  if (photos.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* leve vinheta translúcida pra legibilidade — não cobre o cenário */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_oklch(0_0_0/0.25)_85%)]" />

      {photos.map((photo, i) => {
        const slot = SLOTS[i % SLOTS.length];
        const url = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path).data
          .publicUrl;
        return (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, scale: 0.6, rotate: slot.rotate * 1.5 }}
            animate={{ opacity: 0.55, scale: 1, rotate: slot.rotate }}
            transition={{
              duration: 0.7,
              delay: i * 0.04,
              type: "spring",
              stiffness: 110,
              damping: 14,
            }}
            style={{
              top: slot.top,
              left: slot.left,
              right: slot.right,
              width: slot.size,
            }}
            className="absolute"
          >
            <div className="rounded-md bg-white/95 p-1 shadow-[0_6px_18px_-8px_rgba(0,0,0,0.5)] ring-1 ring-black/5 dark:bg-white/85">
              <img
                src={url}
                alt=""
                loading="lazy"
                className="aspect-square w-full rounded-sm object-cover"
                style={{ filter: "saturate(0.9)" }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
