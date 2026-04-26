// Cartinhas de Amor — schema do Lovable: sender_name, message, emoji, read_at.
// Não tem to_partner: bilhete é "direcionado" implicitamente — quem NÃO mandou
// é quem deve ler. Marcar como lido = setar read_at = now().
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface LoveNote {
  id: string;
  sender_name: string;
  message: string;
  emoji: string;
  read_at: string | null;
  created_at: string;
}

interface Props {
  partnerName: string;
  /** Nome do outro membro do casal — vem de couple_settings via PetRoom. */
  otherPartnerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewNote?: () => void;
}

const EMOJI_PALETTE = ["💗", "💌", "💕", "🌸", "✨", "🥰", "🌷", "💞"];

export function LoveNotesDrawer({ partnerName, otherPartnerName, open, onOpenChange, onNewNote }: Props) {
  const [notes, setNotes] = useState<LoveNote[]>([]);
  const [draft, setDraft] = useState("");
  const [emoji, setEmoji] = useState<string>("💗");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"inbox" | "write">("inbox");
  const [sendError, setSendError] = useState<string | null>(null);

  const otherPartner = otherPartnerName.toLowerCase();

  useEffect(() => {
    if (!open) return;
    loadNotes();
  }, [open]);

  const loadNotes = async () => {
    const { data, error } = await supabase
      .from("love_notes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error) {
      console.error("[love_notes] load falhou:", error);
      return;
    }
    if (data) setNotes(data as LoveNote[]);
  };

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("love_notes").update({ read_at: now }).eq("id", id);
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, read_at: now } : n));
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from("love_notes").insert({
      sender_name: partnerName,
      message: text,
      emoji,
    });
    setSending(false);
    if (error) {
      console.error("[love_notes] insert falhou:", error);
      setSendError(`erro: ${error.message ?? "desconhecido"}`);
      return;
    }
    setDraft("");
    setTab("inbox");
    onNewNote?.();
    loadNotes();
  };

  // "Recebidos" = bilhetes que NÃO fui eu que mandei (o outro mandou pra mim)
  const myInbox = notes.filter(
    (n) => n.sender_name.toLowerCase() !== partnerName.toLowerCase(),
  );
  const unreadCount = myInbox.filter((n) => !n.read_at).length;

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
          className="w-full max-w-md rounded-t-3xl glass-strong p-5 pb-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">💌 Bilhetinhos</h2>
            <button onClick={() => onOpenChange(false)} className="text-muted-foreground text-lg">✕</button>
          </div>

          {/* Tabs */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setTab("inbox")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                tab === "inbox" ? "bg-pink/20 text-pink" : "text-muted-foreground"
              }`}
            >
              Recebidos {unreadCount > 0 && (
                <span className="ml-1 rounded-full bg-pink px-1.5 text-[10px] text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("write")}
              className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-colors ${
                tab === "write" ? "bg-pink/20 text-pink" : "text-muted-foreground"
              }`}
            >
              ✍️ Escrever
            </button>
          </div>

          {tab === "inbox" ? (
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {myInbox.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  nenhum bilhetinho ainda 💌
                  <br />
                  <span className="text-xs">peça pro {otherPartner} te mandar um!</span>
                </p>
              ) : (
                myInbox.map((note) => {
                  const isUnread = !note.read_at;
                  return (
                    <button
                      key={note.id}
                      onClick={() => isUnread && markRead(note.id)}
                      className={`w-full rounded-2xl p-3 text-left transition-all ${
                        isUnread
                          ? "bg-pink/10 ring-1 ring-pink/30 animate-pulse"
                          : "bg-white/5"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-lg">{note.emoji || "💗"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm break-words">{note.message}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">
                            de {note.sender_name.toLowerCase()} ·{" "}
                            {new Date(note.created_at).toLocaleDateString("pt-BR")}
                            {isUnread && " · 💌 novo!"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                escreva algo fofo pro {otherPartner} 💗
              </p>

              {/* Picker de emoji do bilhete */}
              <div className="flex flex-wrap gap-1">
                {EMOJI_PALETTE.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all active:scale-90 ${
                      emoji === e ? "bg-pink/20 ring-2 ring-pink" : "bg-white/5"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>

              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 500))}
                placeholder="ei, eu tava pensando em você agora..."
                className="h-28 w-full resize-none rounded-2xl bg-white/5 p-3 text-sm outline-none ring-1 ring-white/10 focus:ring-pink/40"
                maxLength={500}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{draft.length}/500</span>
                <button
                  onClick={send}
                  disabled={!draft.trim() || sending}
                  className="rounded-full bg-gradient-to-r from-pink to-lilac px-5 py-2 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-all disabled:opacity-40 active:scale-95"
                >
                  {sending ? "enviando..." : `${emoji} enviar`}
                </button>
              </div>
              {sendError && (
                <p className="rounded-lg bg-danger-soft/15 px-3 py-2 text-[11px] text-danger-soft">
                  {sendError}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
