import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// PhotoWall agora mostra só as fotos em "spotlight" — aquelas que foram
// mostradas pro Mochi nas últimas 24h (featured_until > now). Antes ficava
// poluído com 14 fotos espalhadas; agora é 1-2 polaroids em destaque.
// Quando expira, a foto sai do mural e vira histórico na Galeria.

interface FeaturedPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  featured_until: string | null;
}

const BUCKET = "mochi-photos";
const MAX_FEATURED = 2;

// Posições fixas, fofas — esquerda e direita do topo, fora do caminho do Mochi
const SLOTS = [
  { top: "8%", left: "4%", rotate: -7 },
  { top: "10%", right: "4%", rotate: 6 },
];

export function PhotoWall() {
  const [photos, setPhotos] = useState<FeaturedPhoto[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const nowIso = new Date().toISOString();
      // Cast as any: campos novos ainda não regenerados nos types
      const { data } = await (supabase as any)
        .from("photos")
        .select("id, storage_path, caption, featured_until")
        .gt("featured_until", nowIso)
        .order("featured_until", { ascending: false })
        .limit(MAX_FEATURED);
      if (active && data) setPhotos(data as FeaturedPhoto[]);
    };
    load();

    // Recarrega quando uma foto nova é mostrada (insert ou update do
    // featured_until). Realtime cobre os dois eventos.
    const ch = supabase
      .channel("mochi-photo-wall")
      .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, () => load())
      .subscribe();

    // Atualiza quando o featured_until vence (sem realtime — só timer)
    const t = window.setInterval(load, 5 * 60_000); // 5 min

    return () => {
      active = false;
      supabase.removeChannel(ch);
      window.clearInterval(t);
    };
  }, []);

  if (photos.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-0 overflow-hidden"
      style={{ height: "30%" }}
    >
      {photos.map((photo, i) => {
        const slot = SLOTS[i] ?? SLOTS[0];
        const url = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path, {
          transform: { width: 240, height: 240, resize: "cover", quality: 75 },
        }).data.publicUrl;
        return (
          <div
            key={photo.id}
            style={{
              top: slot.top,
              left: slot.left,
              right: slot.right,
              transform: `rotate(${slot.rotate}deg)`,
              animation: `photo-fade-in 0.7s ${i * 0.1}s both ease-out`,
            }}
            className="absolute w-24"
          >
            {/* Polaroid em destaque — opacidade alta porque tá em "spotlight" */}
            <div className="rounded-md bg-white p-1.5 pb-3 shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] ring-1 ring-black/10">
              <img
                src={url}
                alt=""
                loading="lazy"
                decoding="async"
                className="aspect-square w-full rounded-sm object-cover"
              />
              {photo.caption && (
                <p className="mt-1 px-0.5 text-center text-[8px] font-medium leading-tight text-zinc-700 line-clamp-1">
                  {photo.caption}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
