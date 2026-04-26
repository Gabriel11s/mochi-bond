// Palavrinha do Bichinho — Wordle/Termo do casal seguindo spec.
// Single mode: 5 letras × 6 tentativas, teclado virtual QWERTY,
// modal de resultado, animações pop/flip/shake, recompensa pro pet.
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  WORD_LENGTH,
  MAX_ATTEMPTS,
  WORD_POOL,
  getDailyWord,
  getTodayKey,
  normalize,
  evaluateGuess,
  aggregateKeyboardStatus,
  calculateReward,
  pickHintLetter,
  type EvaluatedGuess,
  type CellStatus,
} from "@/lib/mochi-wordle";
import type { PetState } from "@/lib/mochi-types";
import { clamp } from "@/lib/mochi-types";

interface Props {
  partnerName: string;
}

interface SavedState {
  word?: string;
  attempts: string[];
  status: "playing" | "won" | "lost";
  hintLetter?: string;
  gaveHint?: boolean;
}

const KB_ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const KB_ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const KB_ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

const lsKey = (kind: "daily" | "practice", k: string) =>
  `mochi-palavrinha:${kind}-${k}`;

function loadLocal(key: string): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as SavedState) : null;
  } catch { return null; }
}
function saveLocal(key: string, state: SavedState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(state)); } catch {}
}

let burstId = 0;

export function WordleGame({ partnerName }: Props) {
  const today = useMemo(() => getTodayKey(), []);

  const [kind, setKind] = useState<"daily" | "practice">("daily");
  const [practiceWord, setPracticeWord] = useState<string>("");
  const [practiceKey, setPracticeKey] = useState<string>("0");

  const dailyWord = useMemo(() => getDailyWord(), []);
  const word = kind === "daily" ? dailyWord : practiceWord;
  const lsK = kind === "daily" ? lsKey("daily", today) : lsKey("practice", practiceKey);

  const [attempts, setAttempts] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [status, setStatus] = useState<"playing" | "won" | "lost">("playing");
  const [hintLetter, setHintLetter] = useState<string | undefined>();
  const [gaveHint, setGaveHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otherPartnerName, setOtherPartnerName] = useState<string>("");
  const [otherStatus, setOtherStatus] = useState<{ status: string; attempts: number } | null>(null);

  const [bursts, setBursts] = useState<Array<{ id: number; emoji: string; x: number }>>([]);
  const triggerBurst = (emoji: string) => {
    const id = ++burstId;
    const x = -25 + Math.random() * 50;
    setBursts((p) => [...p, { id, emoji, x }]);
    window.setTimeout(() => setBursts((p) => p.filter((b) => b.id !== id)), 900);
  };

  // ---------- carrega estado salvo ----------
  useEffect(() => {
    if (!word) return;
    const saved = loadLocal(lsK);
    if (saved) {
      setAttempts(saved.attempts ?? []);
      setStatus(saved.status ?? "playing");
      setHintLetter(saved.hintLetter);
      setGaveHint(saved.gaveHint ?? false);
      if (kind === "practice" && saved.word && !practiceWord) {
        setPracticeWord(saved.word);
      }
    } else {
      setAttempts([]);
      setStatus("playing");
      setHintLetter(undefined);
      setGaveHint(false);
    }
    setCurrent("");
    setMessage(null);
  }, [lsK, word]); // eslint-disable-line react-hooks/exhaustive-deps

  // Outro partner
  useEffect(() => {
    supabase.from("couple_settings")
      .select("partner_one_name, partner_two_name")
      .eq("id", 1).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const me = partnerName.toLowerCase();
        const other = data.partner_one_name?.toLowerCase() === me
          ? data.partner_two_name : data.partner_one_name;
        setOtherPartnerName(other ?? "");
      });
  }, [partnerName]);

  // Status do parceiro + dica recebida (modo diário) + realtime
  useEffect(() => {
    if (kind !== "daily" || !otherPartnerName) return;
    let cancelled = false;
    (async () => {
      const { data: other } = await supabase
        .from("word_game_daily")
        .select("attempts_count, won, finished")
        .eq("game_date", today)
        .ilike("partner_name", otherPartnerName)
        .maybeSingle();
      if (!cancelled && other) {
        setOtherStatus({
          status: other.finished ? (other.won ? "won" : "lost") : "playing",
          attempts: other.attempts_count ?? 0,
        });
      }
      const { data: mine } = await supabase
        .from("word_game_daily")
        .select("received_hint_letter, gave_hint")
        .eq("game_date", today)
        .ilike("partner_name", partnerName)
        .maybeSingle();
      if (cancelled || !mine) return;
      if (mine.received_hint_letter && !hintLetter) {
        setHintLetter(mine.received_hint_letter);
      }
      if (mine.gave_hint) setGaveHint(true);
    })();

    const ch = supabase
      .channel("palavrinha-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "word_game_daily" }, (payload) => {
        const row = payload.new as {
          partner_name?: string; game_date?: string; finished?: boolean; won?: boolean;
          attempts_count?: number; received_hint_letter?: string;
        };
        if (!row || row.game_date !== today) return;
        if (row.partner_name?.toLowerCase() === otherPartnerName.toLowerCase()) {
          setOtherStatus({
            status: row.finished ? (row.won ? "won" : "lost") : "playing",
            attempts: row.attempts_count ?? 0,
          });
        }
        if (row.partner_name?.toLowerCase() === partnerName.toLowerCase() && row.received_hint_letter && !hintLetter) {
          setHintLetter(row.received_hint_letter);
          triggerBurst("💡");
        }
      })
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [kind, today, partnerName, otherPartnerName]); // eslint-disable-line react-hooks/exhaustive-deps

  const evaluations: EvaluatedGuess[] = useMemo(
    () => attempts.map((a) => evaluateGuess(a, word)),
    [attempts, word],
  );
  const keyboardStatus = useMemo(() => aggregateKeyboardStatus(evaluations), [evaluations]);

  const showMessage = useCallback((msg: string, duration = 1800) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), duration);
  }, []);
  const triggerShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 350);
  }, []);

  const rewardPet = async (attemptsCount: number, finalStatus: "won" | "lost") => {
    if (kind !== "daily") return;
    const reward = calculateReward(attemptsCount, finalStatus);
    const { data: pet } = await supabase.from("pet_state").select("*").eq("id", 1).single();
    if (!pet) return;
    const p = pet as PetState;
    const newHappiness = Math.round(clamp(p.happiness + reward.happiness));
    const newXp = Math.round(p.xp + reward.xp);
    const newLevel = Math.floor(newXp / 100) + 1;
    await supabase.from("pet_state").update({
      happiness: newHappiness, xp: newXp, level: newLevel,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
  };

  const persistRemote = async (newAttempts: string[], finalStatus: "playing" | "won" | "lost") => {
    if (kind !== "daily") return;
    const { error: e } = await supabase.from("word_game_daily").upsert({
      partner_name: partnerName.toLowerCase(),
      game_date: today,
      word,
      attempts: newAttempts,
      attempts_count: newAttempts.length,
      won: finalStatus === "won",
      finished: finalStatus !== "playing",
      completed_at: finalStatus !== "playing" ? new Date().toISOString() : null,
    }, { onConflict: "partner_name,game_date" });
    if (e) console.warn("[wordle] persist falhou:", e.message);
  };

  const handleSubmit = async () => {
    if (status !== "playing" || busy) return;
    const guess = normalize(current);
    if (guess.length < WORD_LENGTH) {
      showMessage(`digite uma palavra com ${WORD_LENGTH} letras`);
      triggerShake();
      return;
    }
    setBusy(true);
    const newAttempts = [...attempts, guess];
    const isWon = guess === normalize(word);
    const isLost = !isWon && newAttempts.length >= MAX_ATTEMPTS;
    const newStatus: "playing" | "won" | "lost" = isWon ? "won" : isLost ? "lost" : "playing";

    setAttempts(newAttempts);
    setCurrent("");
    setStatus(newStatus);

    if (isWon) { triggerBurst("🎉"); triggerBurst("✨"); triggerBurst("💗"); }
    else if (isLost) triggerBurst("💔");
    else triggerBurst("💗");

    saveLocal(lsK, {
      word: kind === "practice" ? word : undefined,
      attempts: newAttempts,
      status: newStatus,
      hintLetter, gaveHint,
    });

    try {
      await persistRemote(newAttempts, newStatus);
      if (newStatus !== "playing") await rewardPet(newAttempts.length, newStatus);
    } catch (e) {
      console.warn("[wordle] submit error:", e);
    }
    setBusy(false);
  };

  const handleLetter = (raw: string) => {
    if (status !== "playing") return;
    const ch = normalize(raw);
    if (!/^[a-z]$/.test(ch)) return;
    if (current.length >= WORD_LENGTH) return;
    setCurrent((c) => c + ch);
  };
  const handleBackspace = () => {
    if (status !== "playing") return;
    setCurrent((c) => c.slice(0, -1));
  };

  // teclado físico (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Enter") { e.preventDefault(); return handleSubmit(); }
      if (e.key === "Backspace") { e.preventDefault(); return handleBackspace(); }
      if (e.key.length === 1 && /^[a-zA-Zà-ú]$/.test(e.key)) {
        e.preventDefault();
        handleLetter(e.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, busy, current, attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  const startNewPractice = () => {
    const pool = WORD_POOL.filter((w) => w !== dailyWord);
    const w = pool[Math.floor(Math.random() * pool.length)];
    const k = String(Date.now());
    setPracticeWord(w);
    setPracticeKey(k);
    setKind("practice");
    saveLocal(lsKey("practice", k), { word: w, attempts: [], status: "playing" });
  };
  const backToDaily = () => setKind("daily");

  const giveHint = async () => {
    if (gaveHint || status !== "won" || kind !== "daily" || !otherPartnerName) return;
    setGaveHint(true);
    saveLocal(lsK, { attempts, status, hintLetter, gaveHint: true });
    const known = new Set<string>();
    for (const a of attempts) {
      const ev = evaluateGuess(a, word);
      for (const cell of ev.letters) {
        if (cell.status !== "absent") known.add(cell.char);
      }
    }
    const letter = pickHintLetter(word, known);
    if (!letter) return;
    triggerBurst("💡");
    showMessage(`💡 dica enviada pro ${otherPartnerName.toLowerCase()}`);
    await Promise.all([
      supabase.from("word_game_daily")
        .update({ gave_hint: true })
        .eq("game_date", today)
        .ilike("partner_name", partnerName.toLowerCase()),
      supabase.from("word_game_daily").upsert({
        partner_name: otherPartnerName.toLowerCase(),
        game_date: today,
        word,
        received_hint_letter: letter,
      }, { onConflict: "partner_name,game_date" }),
    ]);
  };

  const otherCopy =
    kind === "practice"
      ? "modo treino · sem reward"
      : `${otherPartnerName ? otherPartnerName.toLowerCase() : "parceiro"}: ${
          otherStatus?.status === "won"
            ? `acertou em ${otherStatus.attempts}!`
            : otherStatus?.status === "lost"
              ? "não conseguiu"
              : "ainda jogando"
        }`;

  return (
    <div className="game-container relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-gradient-to-b from-[#1C2638] to-[#0E1117] text-foreground">
      {/* HEADER */}
      <header className="relative flex flex-shrink-0 items-center justify-between border-b border-white/10 px-3 py-2.5">
        <Link to="/" className="glass flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs" aria-label="voltar">←</Link>

        <div className="text-center">
          <p className="font-display text-sm font-extrabold tracking-wide text-foreground">
            🌸 palavrinha
          </p>
          <p className="text-[10px] leading-tight text-muted-foreground/80">
            {otherCopy}
          </p>
        </div>

        <button
          onClick={kind === "daily" ? startNewPractice : backToDaily}
          className="glass flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          title={kind === "daily" ? "modo treino" : "voltar pra do dia"}
        >
          {kind === "daily" ? "🎲" : "📅"}
        </button>

        {/* Bursts flutuando do centro do header */}
        <div className="pointer-events-none absolute left-1/2 top-full z-20 -translate-x-1/2">
          <AnimatePresence>
            {bursts.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 1, y: 0, scale: 0.6, x: 0 }}
                animate={{ opacity: 0, y: -38, scale: 1.2, x: b.x }}
                transition={{ duration: 0.95, ease: "easeOut" }}
                className="absolute -top-2 left-0 -translate-x-1/2 text-xl"
              >
                {b.emoji}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </header>

      {/* MENSAGEM TEMPORÁRIA */}
      <div className="flex-shrink-0 px-2" style={{ minHeight: 24 }}>
        <AnimatePresence>
          {message && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-1 text-center text-[11px] font-semibold text-pink"
            >
              {message}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* HINT */}
      {hintLetter && status === "playing" && (
        <div className="mx-3 mb-1 flex-shrink-0 rounded-lg bg-pink/10 p-1.5 text-center text-[11px] ring-1 ring-pink/30">
          💡 dica do {(otherPartnerName || "parceiro").toLowerCase()}: letra{" "}
          <span className="font-bold text-pink">{hintLetter.toUpperCase()}</span>
        </div>
      )}

      {/* BOARD */}
      <main className="game-main flex flex-1 items-center justify-center px-3 py-2 min-h-0">
        <div
          className="grid w-full"
          style={{
            maxWidth: "min(94vw, 360px)",
            gridTemplateRows: `repeat(${MAX_ATTEMPTS}, 1fr)`,
            gap: "8px",
          }}
        >
          {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
            const ev = evaluations[row];
            const isCurrent = row === attempts.length && status === "playing";
            const rowShake = isCurrent && shake;
            return (
              <div
                key={row}
                className={`grid ${rowShake ? "animate-shake" : ""}`}
                style={{ gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}
              >
                {Array.from({ length: WORD_LENGTH }).map((_, col) => {
                  const ch = ev
                    ? ev.letters[col].char
                    : isCurrent
                      ? current[col] ?? ""
                      : "";
                  const cellStatus: CellStatus = ev ? ev.letters[col].status : "empty";
                  const isLastTyped = isCurrent && col === current.length - 1;
                  return (
                    <Tile
                      key={col}
                      char={ch}
                      status={cellStatus}
                      filled={!!ch && !ev}
                      revealing={ev !== undefined && row === attempts.length - 1}
                      delay={col * 0.12}
                      pop={isLastTyped}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </main>

      {/* TECLADO VIRTUAL */}
      <Keyboard
        status={keyboardStatus}
        onLetter={handleLetter}
        onEnter={handleSubmit}
        onBackspace={handleBackspace}
        disabled={status !== "playing" || busy}
      />

      {/* MODAL */}
      <AnimatePresence>
        {status !== "playing" && (
          <ResultModal
            status={status}
            word={word}
            attempts={attempts.length}
            kind={kind}
            otherPartnerName={otherPartnerName}
            gaveHint={gaveHint}
            onPlayAgain={startNewPractice}
            onGiveHint={giveHint}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================
function Tile({
  char, status, filled, revealing, delay, pop,
}: {
  char: string; status: CellStatus; filled: boolean;
  revealing: boolean; delay: number; pop: boolean;
}) {
  const colorByStatus: Record<CellStatus, string> = {
    correct: "bg-[#36A269] border-[#36A269] text-white",
    present: "bg-[#D6A23D] border-[#D6A23D] text-white",
    absent:  "bg-[#3F4550] border-[#3F4550] text-white",
    empty:   filled
      ? "bg-white/5 border-white/45 text-foreground"
      : "bg-white/5 border-white/15 text-foreground",
  };
  return (
    <motion.div
      key={revealing ? `rev-${delay}` : undefined}
      initial={revealing ? { rotateX: 0 } : pop ? { scale: 1 } : false}
      animate={
        revealing ? { rotateX: [0, 90, 0] }
        : pop ? { scale: [1, 1.08, 1] }
        : {}
      }
      transition={
        revealing ? { duration: 0.45, delay, times: [0, 0.5, 1] }
        : pop ? { duration: 0.18, ease: "easeOut" }
        : {}
      }
      className={`flex aspect-square items-center justify-center rounded-xl border-2 font-display font-extrabold uppercase shadow-sm ${colorByStatus[status]}`}
      style={{ fontSize: "clamp(1.2rem, 5.5vw, 1.9rem)" }}
    >
      {char}
    </motion.div>
  );
}

// ============================================================
function Keyboard({
  status, onLetter, onEnter, onBackspace, disabled,
}: {
  status: Record<string, CellStatus>;
  onLetter: (l: string) => void;
  onEnter: () => void;
  onBackspace: () => void;
  disabled: boolean;
}) {
  return (
    <div
      className="keyboard flex-shrink-0 px-1.5 pb-2 pt-1"
      style={{ marginInline: "auto", width: "min(96vw, 520px)" }}
    >
      <KbRow keys={KB_ROW1} status={status} onPress={onLetter} disabled={disabled} />
      <KbRow keys={KB_ROW2} status={status} onPress={onLetter} disabled={disabled} />
      <div className="flex justify-center gap-1.5 pt-1.5">
        <SpecialKey label="ENTER" onClick={onEnter} disabled={disabled} />
        {KB_ROW3.map((k) => (
          <Key key={k} k={k} status={status[k]} onClick={() => onLetter(k)} disabled={disabled} />
        ))}
        <SpecialKey label="⌫" onClick={onBackspace} disabled={disabled} />
      </div>
    </div>
  );
}

function KbRow({
  keys, status, onPress, disabled,
}: {
  keys: string[]; status: Record<string, CellStatus>;
  onPress: (k: string) => void; disabled: boolean;
}) {
  return (
    <div className="flex justify-center gap-1.5 pt-1.5">
      {keys.map((k) => (
        <Key key={k} k={k} status={status[k]} onClick={() => onPress(k)} disabled={disabled} />
      ))}
    </div>
  );
}

function Key({
  k, status, onClick, disabled,
}: {
  k: string; status?: CellStatus; onClick: () => void; disabled: boolean;
}) {
  const colors: Record<CellStatus, string> = {
    correct: "bg-[#36A269] text-white",
    present: "bg-[#D6A23D] text-white",
    absent:  "bg-[#3F4550] text-zinc-400 opacity-75",
    empty:   "bg-[#2E3542] text-white active:bg-white/15",
  };
  const cls = status ? colors[status] : colors.empty;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 select-none rounded-md font-bold uppercase transition-all active:scale-90 ${cls}`}
      style={{ height: 46, fontSize: "clamp(0.85rem, 3.5vw, 1rem)", minWidth: 0 }}
    >
      {k}
    </button>
  );
}

function SpecialKey({
  label, onClick, disabled,
}: {
  label: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="select-none rounded-md bg-pink/15 font-extrabold text-pink transition-all active:bg-pink/25 active:scale-90"
      style={{ height: 46, fontSize: "clamp(0.7rem, 2.6vw, 0.85rem)", padding: "0 10px", minWidth: 56 }}
    >
      {label}
    </button>
  );
}

// ============================================================
function ResultModal({
  status, word, attempts, kind, otherPartnerName, gaveHint, onPlayAgain, onGiveHint,
}: {
  status: "won" | "lost"; word: string; attempts: number;
  kind: "daily" | "practice"; otherPartnerName: string; gaveHint: boolean;
  onPlayAgain: () => void; onGiveHint: () => void;
}) {
  const reward = calculateReward(attempts, status);
  const isWon = status === "won";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="result-modal fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-6"
    >
      <motion.div
        initial={{ y: 30, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="result-card w-full max-w-sm rounded-3xl border border-white/15 bg-[#151B26] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-2 text-3xl">{isWon ? "💗" : "🥺"}</div>
        <h2 className="font-display text-xl font-extrabold">
          {isWon ? "você acertou!" : "fim de jogo"}
        </h2>
        {isWon ? (
          <p className="mt-2 text-sm text-muted-foreground">
            tentativas: <span className="font-bold text-foreground">{attempts}/{MAX_ATTEMPTS}</span>
            <br />
            o bichinho ganhou carinho extra hoje 💗
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            a palavra era <span className="font-bold text-pink">{word.toUpperCase()}</span>
            <br />
            o bichinho quer tentar de novo 🥺
          </p>
        )}
        {kind === "daily" && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-pink/15 px-3 py-1 text-xs font-semibold text-pink">
            +{reward.xp} XP · +{reward.happiness} carinho
          </div>
        )}
        {kind === "practice" && (
          <p className="mt-3 text-[10px] text-muted-foreground">modo treino · sem reward</p>
        )}

        <div className="mt-5 flex flex-col gap-2">
          {isWon && kind === "daily" && otherPartnerName && !gaveHint && (
            <button
              onClick={onGiveHint}
              className="h-11 w-full rounded-2xl bg-pink/20 font-bold text-pink transition-all active:bg-pink/30 active:scale-[0.98]"
            >
              💡 dar dica pro {otherPartnerName.toLowerCase()}
            </button>
          )}
          <button
            onClick={onPlayAgain}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-pink to-lilac font-extrabold text-white shadow-lg transition-all active:scale-[0.98]"
          >
            🎲 jogar outra (treino)
          </button>
          <Link
            to="/"
            className="text-center text-xs text-muted-foreground hover:text-foreground"
          >
            voltar pro quartinho
          </Link>
        </div>
      </motion.div>
    </motion.div>
  );
}
