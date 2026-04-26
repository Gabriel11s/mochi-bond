// Galeria do casal — polaroids com pin do Mochi (skin/mood do momento)
// e trilha sonora sugerida no topo. Mostra todas as fotos já vistas pelo
// Mochi (das mais recentes pras mais antigas).
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getSkin, getAccessory } from "@/lib/mochi-cosmetics";
import type { Mood } from "@/lib/mochi-types";

interface GalleryPhoto {
  id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  shown_skin: string | null;
  shown_accessory: string | null;
  shown_mood: string | null;
  suggested_track_name: string | null;
  suggested_track_artist: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Per decisão do casal: fotos sem snapshot caem no skin/accessory/mood ATUAL
  fallbackSkin: string;
  fallbackAccessory: string;
  fallbackMood: Mood;
}

const BUCKET = "mochi-photos";

const MOOD_EMOJI: Record<string, string> = {
  happy: "😊",
  hungry: "😋",
  sleepy: "😴",
  excited: "✨",
  sad: "🥺",
  smitten: "🥰",
  eating: "😋",
  idle: "☺️",
};

export function GalleryDrawer({
  open,
  onOpenChange,
  fallbackSkin,
  fallbackAccessory,
  fallbackMood,
}: Props) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      // Galeria SEMPRE mostra todas as fotos. Tenta com snapshot primeiro;
      // se as colunas novas não existirem (migration pendente), cai pro
      // select básico — o pin usa skin/mood ATUAL via fallback props.
      let data: GalleryPhoto[] | null = null;
      try {
        const r = await (supabase as any)
          .from("photos")
          .select(
            "id, storage_path, caption, created_at, shown_skin, shown_accessory, shown_mood, suggested_track_name, suggested_track_artist"
          )
          .order("created_at", { ascending: false })
          .limit(100);
        if (!r.error) data = r.data as GalleryPhoto[];
      } catch (_e) { /* colunas novas não existem ainda */ }

      if (!data) {
        const { data: basic } = await supabase
          .from("photos")
          .select("id, storage_path, caption, created_at")
          .order("created_at", { ascending: false })
          .limit(100);
        data = (basic ?? []).map((p) => ({
          ...p,
          shown_skin: null,
          shown_accessory: null,
          shown_mood: null,
          suggested_track_name: null,
          suggested_track_artist: null,
        })) as GalleryPhoto[];
      }

      setPhotos(data);
      setLoading(false);
    })();
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="glass-strong w-full max-w-md rounded-t-3xl p-5 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">📷 galeria</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{photos.length}</span>
              <button
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground text-lg"
              >
                ✕
              </button>
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              carregando lembranças…
            </p>
          ) : photos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              nenhuma foto ainda 📷
              <br />
              <span className="text-xs">
                mostra uma fotinho pro pet pra começar a galeria!
              </span>
            </p>
          ) : (
            <div className="grid max-h-[70vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {photos.map((p) => (
                <Polaroid
                  key={p.id}
                  photo={p}
                  fallbackSkin={fallbackSkin}
                  fallbackAccessory={fallbackAccessory}
                  fallbackMood={fallbackMood}
                />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Polaroid({
  photo,
  fallbackSkin,
  fallbackAccessory,
  fallbackMood,
}: {
  photo: GalleryPhoto;
  fallbackSkin: string;
  fallbackAccessory: string;
  fallbackMood: Mood;
}) {
  const skinId = photo.shown_skin ?? fallbackSkin;
  const accessoryId = photo.shown_accessory ?? fallbackAccessory;
  const mood = (photo.shown_mood ?? fallbackMood) as Mood;
  const skin = getSkin(skinId);
  // Acessórios podem vir como "tophat,sunglasses" — pega o primeiro emoji
  const firstAccessory = accessoryId.split(",")[0]?.trim() ?? "none";
  const accessory = getAccessory(firstAccessory);
  const moodEmoji = MOOD_EMOJI[mood] ?? "💗";

  const url = supabase.storage.from(BUCKET).getPublicUrl(photo.storage_path, {
    transform: { width: 240, height: 240, resize: "cover", quality: 75 },
  }).data.publicUrl;

  return (
    <div className="rotate-[-1deg] rounded-md bg-white p-1.5 pb-3 shadow-[0_8px_20px_-10px_rgba(0,0,0,0.6)] ring-1 ring-black/10 transition-transform hover:rotate-0 hover:scale-[1.02]">
      {/* Header: trilha sonora sugerida */}
      {photo.suggested_track_name && (
        <p className="mb-1 truncate px-1 text-[8px] font-semibold uppercase tracking-wider text-pink/90">
          🎵 {photo.suggested_track_name}
          {photo.suggested_track_artist && (
            <span className="font-normal text-zinc-500"> · {photo.suggested_track_artist}</span>
          )}
        </p>
      )}

      <div className="relative">
        <img
          src={url}
          alt=""
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-sm object-cover"
        />

        {/* Pin do Mochi: bolinha com cor da skin + emoji do mood
            + acessório sobreposto se houver. Indica como ele tava nesse dia. */}
        <div
          className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full text-base shadow-md ring-2 ring-white"
          style={{
            background: `linear-gradient(135deg, ${skin.body}, ${skin.bodyMid})`,
          }}
          title={`${skin.label} · ${mood}`}
        >
          <span>{moodEmoji}</span>
          {accessory.id !== "none" && (
            <span className="absolute -top-1.5 -right-1 text-[9px]">
              {accessory.emoji}
            </span>
          )}
        </div>
      </div>

      {photo.caption && (
        <p className="mt-1 line-clamp-1 px-0.5 text-center text-[10px] font-medium leading-tight text-zinc-700">
          {photo.caption}
        </p>
      )}
      <p className="mt-0.5 text-center text-[8px] text-zinc-400">
        {new Date(photo.created_at).toLocaleDateString("pt-BR")}
      </p>
    </div>
  );
}
