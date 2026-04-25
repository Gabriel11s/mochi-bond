import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Photo {
  id: string;
  storage_path: string;
  caption: string | null;
  uploaded_by: string;
  happiness_boost: number;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  partnerName: string;
  onShowToMochi: (photo: Photo) => void | Promise<void>;
  onError?: (msg: string) => void;
}

const BUCKET = "mochi-photos";

export function PhotosDrawer({ open, onClose, partnerName, onShowToMochi, onError }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("photos")
        .select("*")
        .order("created_at", { ascending: false });
      setPhotos((data ?? []) as Photo[]);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("mochi-photos")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "photos" }, (p) => {
        setPhotos((prev) => [p.new as Photo, ...prev]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "photos" }, (p) => {
        setPhotos((prev) => prev.filter((x) => x.id !== (p.old as Photo).id));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [open]);

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const handleUpload = async (file: File) => {
    if (!file) return;
    // Fix #4: validação de tamanho antes de enviar
    if (file.size > 10 * 1024 * 1024) {
      onError?.("foto muito grande — máximo 10MB 📸");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type });
    if (!upErr) {
      const { error: insertErr } = await supabase.from("photos").insert({
        storage_path: path,
        caption: caption.trim() || null,
        uploaded_by: partnerName,
        happiness_boost: 18,
      });
      if (insertErr) {
        console.error("photo insert error:", insertErr);
        onError?.("não conseguiu salvar a foto 🥺");
      }
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
    } else {
      console.error("upload error:", upErr);
      // Fix #4: feedback visível de erro no upload
      const msg = upErr.message?.includes("Payload too large")
        ? "foto muito pesada — tenta uma menor 📸"
        : upErr.message?.includes("storage")
          ? "problema no armazenamento 🥺 tenta de novo"
          : `erro ao enviar foto 🥺 (${upErr.message ?? "desconhecido"})`;
      onError?.(msg);
    }
    setUploading(false);
  };

  const handleDelete = async (photo: Photo) => {
    await supabase.storage.from(BUCKET).remove([photo.storage_path]);
    await supabase.from("photos").delete().eq("id", photo.id);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-hidden rounded-t-3xl pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="flex flex-col">
              <div className="flex justify-center pt-3">
                <div className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              <div className="px-6 pt-4 pb-3">
                <h3 className="font-display text-2xl font-bold">Fotinhos de vocês</h3>
                <p className="text-sm text-muted-foreground">
                  Mostre uma foto e veja ele ficar todo derretido 💗
                </p>
              </div>

              {/* upload */}
              <div className="mx-6 mb-4 rounded-2xl bg-white/5 p-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
                />
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="legenda fofa (opcional)"
                  maxLength={80}
                  className="w-full bg-transparent text-sm placeholder:text-muted-foreground/70 focus:outline-none"
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="mt-2 w-full rounded-xl bg-gradient-to-r from-pink to-lilac py-2.5 font-display text-sm font-bold text-white shadow-[var(--shadow-glow)] disabled:opacity-50"
                >
                  {uploading ? "enviando…" : "📸 adicionar fotinho"}
                </button>
              </div>

              <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto px-6 pb-8 sm:grid-cols-3">
                {loading && photos.length === 0 && (
                  <p className="col-span-full text-center text-sm text-muted-foreground">
                    carregando…
                  </p>
                )}
                {!loading && photos.length === 0 && (
                  <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
                    ainda não tem fotinhos. envie a primeira ✨
                  </p>
                )}
                {photos.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass group relative overflow-hidden rounded-2xl"
                  >
                    <button
                      onClick={() => {
                        onShowToMochi(p);
                        onClose();
                      }}
                      className="block w-full"
                    >
                      <img
                        src={publicUrl(p.storage_path)}
                        alt={p.caption ?? "fotinho"}
                        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </button>
                    <div className="p-2">
                      {p.caption && (
                        <p className="line-clamp-1 text-xs font-medium">{p.caption}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        por {p.uploaded_by.toLowerCase()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(p)}
                      className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-80 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="apagar"
                    >
                      ✕
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
