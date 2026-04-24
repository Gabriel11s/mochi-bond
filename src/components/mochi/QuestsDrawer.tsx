import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Quest, QuestCompletion, QuestCategory, Rarity, QuestVibe } from "@/lib/mochi-types";

const CATEGORY_LABEL: Record<QuestCategory, { label: string; emoji: string }> = {
  casa: { label: "Pela casa", emoji: "🏠" },
  casal: { label: "Dupla", emoji: "👥" },
  dupla: { label: "Dupla", emoji: "👥" },
  romantico: { label: "Lá fora", emoji: "🌤️" },
  mundo: { label: "Lá fora", emoji: "🌤️" },
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "comidinha comum",
  uncommon: "comidinha incomum",
  rare: "comidinha rara",
  special: "super-comidinha mágica",
};

const RARITY_GRADIENT: Record<Rarity, string> = {
  common: "from-white/20 to-white/5",
  uncommon: "from-mint/40 to-mint/10",
  rare: "from-pink/50 to-pink/10",
  special: "from-lilac/60 to-pink/20",
};

const VIBE_META: Record<QuestVibe, { emoji: string; label: string; color: string }> = {
  bonitinho: { emoji: "👌", label: "curtiu", color: "bg-mint/25 text-foreground" },
  meh: { emoji: "🙂", label: "achou ok", color: "bg-white/10 text-foreground" },
  feio: { emoji: "🥲", label: "torceu o nariz", color: "bg-danger-soft/20 text-foreground" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  partnerName: string;
  onCompleted: (msg: string) => void;
}

const BUCKET = "mochi-photos";

interface QuestStatus {
  state: "available" | "cooldown";
  cooldownUntil?: number;
}

type Tab = "quests" | "gallery";

interface CompletionWithQuest extends QuestCompletion {
  quest_title?: string;
  quest_emoji?: string;
}

export function QuestsDrawer({ open, onClose, partnerName, onCompleted }: Props) {
  const [tab, setTab] = useState<Tab>("quests");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [myCompletions, setMyCompletions] = useState<QuestCompletion[]>([]);
  const [allCompletions, setAllCompletions] = useState<CompletionWithQuest[]>([]);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{
    kind: "ok" | "no" | "wait";
    text: string;
    cuteness?: number;
    vibe?: QuestVibe;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const questById = useMemo(() => {
    const m = new Map<string, Quest>();
    quests.forEach((q) => m.set(q.id, q));
    return m;
  }, [quests]);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [{ data: q }, { data: mine }, { data: all }] = await Promise.all([
        supabase.from("quests").select("*").eq("is_active", true).order("category"),
        supabase
          .from("quest_completions")
          .select("*")
          .eq("partner_name", partnerName)
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
        supabase
          .from("quest_completions")
          .select("*")
          .in("status", ["approved", "rejected"])
          .order("created_at", { ascending: false })
          .limit(40),
      ]);
      setQuests((q ?? []) as Quest[]);
      setMyCompletions((mine ?? []) as QuestCompletion[]);
      setAllCompletions((all ?? []) as CompletionWithQuest[]);
    };
    load();
  }, [open, partnerName]);

  const refreshGallery = async () => {
    const { data: all } = await supabase
      .from("quest_completions")
      .select("*")
      .in("status", ["approved", "rejected"])
      .order("created_at", { ascending: false })
      .limit(40);
    setAllCompletions((all ?? []) as CompletionWithQuest[]);
  };

  const statusFor = (quest: Quest): QuestStatus => {
    const lastApproved = myCompletions.find((c) => c.quest_id === quest.id);
    if (!lastApproved) return { state: "available" };
    const until = new Date(lastApproved.created_at).getTime() + quest.cooldown_minutes * 60_000;
    if (Date.now() < until) return { state: "cooldown", cooldownUntil: until };
    return { state: "available" };
  };

  const formatCooldown = (until: number) => {
    const ms = until - Date.now();
    if (ms <= 0) return "agora";
    const h = Math.floor(ms / 3600_000);
    const m = Math.floor((ms % 3600_000) / 60_000);
    if (h > 0) return `em ${h}h${m > 0 ? ` ${m}m` : ""}`;
    return `em ${m}min`;
  };

  const timeShort = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "agora";
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const d = Math.floor(h / 24);
    return `${d}d`;
  };

  const photoUrl = (path: string | null) =>
    path ? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl : null;

  const submitProof = async (file: File) => {
    if (!activeQuest) return;
    setSubmitting(true);
    setResultMsg(null);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `quest-${activeQuest.slug}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { data: photoRow } = await supabase
        .from("photos")
        .insert({
          storage_path: path,
          uploaded_by: partnerName,
          caption: `📸 missão: ${activeQuest.title}`,
          happiness_boost: 12,
        })
        .select("id")
        .single();

      const { data, error } = await supabase.functions.invoke("verify-quest", {
        body: {
          quest_id: activeQuest.id,
          partner_name: partnerName,
          photo_path: path,
          photo_id: photoRow?.id ?? null,
        },
      });

      if (error) {
        setResultMsg({ kind: "no", text: "Mochi teve problema pra olhar 🥺" });
        return;
      }

      const payload = data as {
        status?: string;
        reason?: string;
        rewards?: Array<{ emoji: string }>;
        cuteness?: number;
        vibe?: QuestVibe;
        message?: string;
      };

      if (payload.status === "approved") {
        const emojis = (payload.rewards ?? []).map((r) => r.emoji).join("");
        const vibeEmoji = payload.vibe ? VIBE_META[payload.vibe].emoji : "✨";
        setResultMsg({
          kind: "ok",
          text: `${vibeEmoji} ${payload.reason ?? "missão cumprida!"} ${emojis ? `→ ${emojis}` : ""}`,
          cuteness: payload.cuteness,
          vibe: payload.vibe,
        });
        onCompleted(`missão "${activeQuest.title}" cumprida! ${emojis}`);
        const { data: c } = await supabase
          .from("quest_completions")
          .select("*")
          .eq("partner_name", partnerName)
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        setMyCompletions((c ?? []) as QuestCompletion[]);
        refreshGallery();
      } else if (payload.status === "cooldown") {
        setResultMsg({ kind: "wait", text: payload.message ?? "espera um pouquinho" });
      } else {
        setResultMsg({
          kind: "no",
          text: payload.reason ?? "Mochi não conseguiu ver 🥺",
          cuteness: payload.cuteness,
          vibe: payload.vibe,
        });
        refreshGallery();
      }
    } catch (e) {
      console.error(e);
      setResultMsg({ kind: "no", text: "deu probleminha pra enviar 🥺" });
    } finally {
      setSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  // normaliza categorias antigas pra novas (casal→dupla, romantico→mundo)
  const normalizeCat = (c: string): QuestCategory => {
    if (c === "casal") return "dupla";
    if (c === "romantico") return "mundo";
    return c as QuestCategory;
  };
  const grouped = quests.reduce<Record<"casa" | "dupla" | "mundo", Quest[]>>(
    (acc, q) => {
      const k = normalizeCat(q.category);
      const bucket = k === "casa" ? "casa" : k === "dupla" || k === "casal" ? "dupla" : "mundo";
      acc[bucket].push(q);
      return acc;
    },
    { casa: [], dupla: [], mundo: [] },
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!submitting) {
                setActiveQuest(null);
                setResultMsg(null);
                onClose();
              }
            }}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col overflow-hidden rounded-t-3xl pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pt-3 pb-2">
              <h3 className="font-display text-2xl font-bold">Missões do Mochi 🎯</h3>
              <p className="text-sm text-muted-foreground">
                {tab === "quests"
                  ? "Cumpra tarefinhas e ganhe comidinhas pra despensa"
                  : "Veja como o Mochi julgou as fotos enviadas"}
              </p>
            </div>

            {/* Tabs (esconde quando uma quest está ativa) */}
            {!activeQuest && (
              <div className="mx-6 mt-1 inline-flex shrink-0 rounded-full bg-white/5 p-1">
                <button
                  onClick={() => setTab("quests")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    tab === "quests" ? "bg-pink/80 text-white shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  🎯 missões
                </button>
                <button
                  onClick={() => setTab("gallery")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    tab === "gallery" ? "bg-pink/80 text-white shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  🖼️ galeria
                </button>
              </div>
            )}

            {/* QUESTS TAB */}
            {!activeQuest && tab === "quests" && (
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
                {(Object.keys(grouped) as Array<"casa" | "dupla" | "mundo">).map((cat) =>
                  grouped[cat].length === 0 ? null : (
                    <div key={cat} className="mb-5">
                      <h4 className="mb-2 px-1 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                        {CATEGORY_LABEL[cat].emoji} {CATEGORY_LABEL[cat].label}
                      </h4>
                      <div className="flex flex-col gap-2">
                        {grouped[cat].map((q) => {
                          const st = statusFor(q);
                          const locked = st.state === "cooldown";
                          return (
                            <motion.button
                              key={q.id}
                              whileTap={{ scale: 0.98 }}
                              disabled={locked}
                              onClick={() => {
                                setActiveQuest(q);
                                setResultMsg(null);
                              }}
                              className={`glass relative flex items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-inset transition-all disabled:opacity-50 ${
                                locked ? "ring-white/5" : "ring-white/10 hover:ring-pink/40"
                              }`}
                            >
                              <span className="text-3xl">{q.emoji}</span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-display text-sm font-bold">
                                  {q.title}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {locked
                                    ? `disponível ${formatCooldown(st.cooldownUntil!)}`
                                    : q.hint}
                                </p>
                              </div>
                              <div
                                className={`shrink-0 rounded-full bg-gradient-to-br ${
                                  RARITY_GRADIENT[q.reward_food_rarity]
                                } px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider`}
                              >
                                {q.reward_food_count > 1 ? `${q.reward_food_count}× ` : ""}
                                {RARITY_LABEL[q.reward_food_rarity]}
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}

            {/* GALLERY TAB */}
            {!activeQuest && tab === "gallery" && (
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-3">
                {allCompletions.length === 0 && (
                  <p className="mt-10 text-center text-sm text-muted-foreground">
                    nenhuma prova ainda — sejam os primeiros 📸
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {allCompletions.map((c) => {
                    const url = photoUrl(c.photo_path);
                    const quest = c.quest_id ? questById.get(c.quest_id) : undefined;
                    const isApproved = c.status === "approved";
                    const vibe = (c.vibe ?? null) as QuestVibe | null;
                    const vibeMeta = vibe ? VIBE_META[vibe] : null;
                    return (
                      <div
                        key={c.id}
                        className="glass overflow-hidden rounded-2xl ring-1 ring-inset ring-white/10"
                      >
                        <div className="relative aspect-square bg-black/30">
                          {url ? (
                            <img
                              src={url}
                              alt={quest?.title ?? "prova"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-3xl opacity-40">
                              📷
                            </div>
                          )}
                          <div
                            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              isApproved
                                ? "bg-mint/80 text-zinc-900"
                                : "bg-danger-soft/80 text-zinc-900"
                            }`}
                          >
                            {isApproved ? "✓ aprovada" : "✗ rejeitada"}
                          </div>
                          {vibeMeta && (
                            <div className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-base">
                              {vibeMeta.emoji}
                            </div>
                          )}
                        </div>
                        <div className="p-2.5">
                          <p className="truncate font-display text-xs font-bold">
                            {quest?.emoji ?? "🎯"} {quest?.title ?? "missão"}
                          </p>
                          <div className="mt-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
                            <span className="truncate">
                              por <span className="text-foreground/80">{c.partner_name}</span>
                            </span>
                            <span>{timeShort(c.created_at)}</span>
                          </div>
                          {c.ai_reason && (
                            <p
                              className={`mt-1.5 line-clamp-2 rounded-lg px-2 py-1 text-[10px] italic ${
                                vibeMeta?.color ?? "bg-white/5 text-muted-foreground"
                              }`}
                            >
                              "{c.ai_reason}"
                              {typeof c.cuteness === "number" && (
                                <span className="ml-1 not-italic font-bold">
                                  · nota {c.cuteness}/10
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* QUEST DETAIL */}
            {activeQuest && (
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
                <button
                  onClick={() => {
                    setActiveQuest(null);
                    setResultMsg(null);
                  }}
                  className="mb-4 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  ← voltar pras missões
                </button>

                <div className="glass rounded-2xl p-5 text-center">
                  <div className="text-5xl">{activeQuest.emoji}</div>
                  <h4 className="mt-2 font-display text-xl font-bold">{activeQuest.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">{activeQuest.hint}</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs">
                    <span>recompensa:</span>
                    <span className="font-bold">
                      {activeQuest.reward_food_count > 1
                        ? `${activeQuest.reward_food_count}× `
                        : ""}
                      {RARITY_LABEL[activeQuest.reward_food_rarity]}
                    </span>
                    <span className="text-muted-foreground">+ {activeQuest.reward_xp} XP</span>
                  </div>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    💡 capricha na foto — Mochi também avalia se ficou fofa
                  </p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && submitProof(e.target.files[0])}
                />

                {!resultMsg && !submitting && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="mt-5 w-full rounded-2xl bg-gradient-to-r from-pink to-lilac py-4 font-display text-base font-bold text-white shadow-[var(--shadow-glow)]"
                  >
                    📸 tirar a foto da prova
                  </button>
                )}

                {submitting && (
                  <div className="mt-5 flex flex-col items-center gap-3 rounded-2xl bg-white/5 py-6">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-pink/30 border-t-pink" />
                    <p className="text-sm text-muted-foreground">
                      Mochi tá conferindo pra você… 🔍
                    </p>
                  </div>
                )}

                {resultMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-5 rounded-2xl p-4 text-center text-sm font-medium ${
                      resultMsg.kind === "ok"
                        ? "bg-mint/15 text-foreground"
                        : resultMsg.kind === "wait"
                          ? "bg-cream/15 text-foreground"
                          : "bg-danger-soft/15 text-foreground"
                    }`}
                  >
                    <div className="text-3xl">
                      {resultMsg.kind === "wait"
                        ? "🌙"
                        : resultMsg.vibe
                          ? VIBE_META[resultMsg.vibe].emoji
                          : resultMsg.kind === "ok"
                            ? "✨"
                            : "🥺"}
                    </div>
                    <p className="mt-1">{resultMsg.text}</p>
                    {typeof resultMsg.cuteness === "number" && (
                      <p className="mt-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        fofura: <span className="font-bold text-foreground">{resultMsg.cuteness}/10</span>
                      </p>
                    )}
                    {resultMsg.kind !== "ok" && (
                      <button
                        onClick={() => {
                          setResultMsg(null);
                          fileRef.current?.click();
                        }}
                        className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold"
                      >
                        tentar de novo
                      </button>
                    )}
                    {resultMsg.kind === "ok" && (
                      <button
                        onClick={() => {
                          setActiveQuest(null);
                          setResultMsg(null);
                        }}
                        className="mt-3 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold"
                      >
                        voltar pras missões
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
