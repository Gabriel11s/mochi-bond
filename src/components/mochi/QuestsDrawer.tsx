import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Quest, QuestCompletion, QuestCategory, Rarity } from "@/lib/mochi-types";

const CATEGORY_LABEL: Record<QuestCategory, { label: string; emoji: string }> = {
  casa: { label: "Pela casa", emoji: "🏠" },
  casal: { label: "De vocês dois", emoji: "💑" },
  romantico: { label: "Romântico", emoji: "✨" },
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

export function QuestsDrawer({ open, onClose, partnerName, onCompleted }: Props) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [completions, setCompletions] = useState<QuestCompletion[]>([]);
  const [activeQuest, setActiveQuest] = useState<Quest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ kind: "ok" | "no" | "wait"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const [{ data: q }, { data: c }] = await Promise.all([
        supabase.from("quests").select("*").eq("is_active", true).order("category"),
        supabase
          .from("quest_completions")
          .select("*")
          .eq("partner_name", partnerName)
          .eq("status", "approved")
          .order("created_at", { ascending: false }),
      ]);
      setQuests((q ?? []) as Quest[]);
      setCompletions((c ?? []) as QuestCompletion[]);
    };
    load();
  }, [open, partnerName]);

  const statusFor = (quest: Quest): QuestStatus => {
    const lastApproved = completions.find((c) => c.quest_id === quest.id);
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

  const submitProof = async (file: File) => {
    if (!activeQuest) return;
    setSubmitting(true);
    setResultMsg(null);
    try {
      // 1. upload photo
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `quest-${activeQuest.slug}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      // 2. registra como foto pública (aparece na galeria também)
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

      // 3. chama edge function
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

      const status = (data as { status?: string; reason?: string; rewards?: Array<{ emoji: string }> })
        ?.status;

      if (status === "approved") {
        const emojis = (
          (data as { rewards?: Array<{ emoji: string }> }).rewards ?? []
        )
          .map((r) => r.emoji)
          .join("");
        setResultMsg({
          kind: "ok",
          text: `missão cumprida! ganhou ${emojis || "comidinhas"} ✨`,
        });
        onCompleted(`missão "${activeQuest.title}" cumprida! ${emojis}`);
        // refresh completions
        const { data: c } = await supabase
          .from("quest_completions")
          .select("*")
          .eq("partner_name", partnerName)
          .eq("status", "approved")
          .order("created_at", { ascending: false });
        setCompletions((c ?? []) as QuestCompletion[]);
      } else if (status === "cooldown") {
        setResultMsg({ kind: "wait", text: (data as { message?: string }).message ?? "espera um pouquinho" });
      } else {
        setResultMsg({
          kind: "no",
          text: (data as { reason?: string }).reason ?? "Mochi não conseguiu ver 🥺",
        });
      }
    } catch (e) {
      console.error(e);
      setResultMsg({ kind: "no", text: "deu probleminha pra enviar 🥺" });
    } finally {
      setSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const grouped = quests.reduce<Record<QuestCategory, Quest[]>>(
    (acc, q) => {
      const k = q.category as QuestCategory;
      if (!acc[k]) acc[k] = [];
      acc[k].push(q);
      return acc;
    },
    { casa: [], casal: [], romantico: [] },
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
                Cumpra tarefinhas e ganhe comidinhas pra despensa
              </p>
            </div>

            {/* lista de quests */}
            {!activeQuest && (
              <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2">
                {(Object.keys(grouped) as QuestCategory[]).map((cat) =>
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

            {/* detalhe da quest selecionada */}
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
                    {resultMsg.kind === "ok" && <div className="text-2xl">✨</div>}
                    {resultMsg.kind === "no" && <div className="text-2xl">🥺</div>}
                    {resultMsg.kind === "wait" && <div className="text-2xl">🌙</div>}
                    <p className="mt-1">{resultMsg.text}</p>
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
