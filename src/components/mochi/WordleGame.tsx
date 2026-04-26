// Página dedicada do caça-palavras — Termo-style.
// Layout: header → mochi mascote pequeno no canto + área de status →
// grid centralizada → teclado fixo no rodapé. Mochi NÃO sobrepõe a grid.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_ATTEMPTS,
  WORD_LENGTH,
  WORD_POOL,
  getDailyWord,
  getTodayKey,
  normalize,
  evaluateGuess,
  aggregateKeyboardStatus,
  rewardForAttempts,
  pickHintLetter,
  type EvaluatedGuess,
  type CellStatus,
} from "@/lib/mochi-wordle";
import { Mochi } from "./Mochi";
import type { Mood, PetState } from "@/lib/mochi-types";
import { applyDecay, clamp } from "@/lib/mochi-types";

interface Props {
  partnerName: string;
}

interface SavedState {
  attempts: string[];
  finished: boolean;
  won: boolean;
  hintLetter?: string;
  gaveHint?: boolean;
}

const KB_ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const KB_ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const KB_ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

const todayKey = () => getTodayKey();
const lsKeyDaily = (date: string) => `mochi-wordle:daily-${date}`;
const lsKeyPractice = (word: string) => `mochi-wordle:practice-${word}`;

function pickRandomPracticeWord(exclude: string): string {
  let attempts = 0;
  while (attempts < 20) {
    const w = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
    if (w !== exclude && w.length === WORD_LENGTH) return w;
    attempts++;
  }
  return WORD_POOL[0];
}

function loadLocal(key: string): SavedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as SavedState;
  } catch { return null; }
}

function saveLocal(key: string, state: SavedState) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(state)); }
  catch { /* quota */ }
}

let burstId = 0;

export function WordleGame({ partnerName }: Props) {
  const today = useMemo(() => todayKey(), []);
  const dailyWord = useMemo(() => getDailyWord(), []);

  const [mode, setMode] = useState<"daily" | "practice">("daily");
  const [practiceWord, setPracticeWord] = useState<string>("");
  const word = mode === "daily" ? dailyWord : practiceWord;
  const lsKey = mode === "daily" ? lsKeyDaily(today) : lsKeyPractice(practiceWord);

  const [attempts, setAttempts] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [hintLetter, setHintLetter] = useState<string | undefined>(undefined);
  const [gaveHint, setGaveHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otherPartnerName, setOtherPartnerName] = useState<string>("");
  const [otherStatus, setOtherStatus] = useState<{ finished: boolean; won: boolean; attempts: number } | null>(null);

  const [mochiMood, setMochiMood] = useState<Mood>("idle");
  const [mochiAppearance, setMochiAppearance] = useState<{ skin: string; accessory: string; hunger: number; happiness: number; energy: number } | null>(null);
  // Bursts de emoji que sobem da Mochi sem cobrir o grid
  const [emojiBursts, setEmojiBursts] = useState<Array<{ id: number; char: string }>>([]);

  const triggerBurst = (char: string) => {
    const id = ++burstId;
    setEmojiBursts((prev) => [...prev, { id, char }]);
    window.setTimeout(() => {
      setEmojiBursts((prev) => prev.filter((b) => b.id !== id));
    }, 900);
  };

  // Carrega estado local ao trocar palavra/modo
  useEffect(() => {
    if (!word) return;
    const saved = loadLocal(lsKey);
    if (saved) {
      setAttempts(saved.attempts ?? []);
      setFinished(saved.finished ?? false);
      setWon(saved.won ?? false);
      setHintLetter(saved.hintLetter);
      setGaveHint(saved.gaveHint ?? false);
    } else {
      setAttempts([]);
      setFinished(false);
      setWon(false);
      setHintLetter(undefined);
      setGaveHint(false);
    }
    setCurrent("");
    setError(null);
    setMochiMood("idle");
  }, [lsKey, word]);

  // Aparência atual do Mochi
  useEffect(() => {
    supabase.from("pet_state").select("*").eq("id", 1).single().then(({ data }) => {
      if (!data) return;
      const decayed = applyDecay(data as PetState);
      setMochiAppearance({
        skin: decayed.equipped_skin,
        accessory: decayed.equipped_accessory,
        hunger: decayed.hunger,
        happiness: decayed.happiness,
        energy: decayed.energy,
      });
    });
  }, []);

  // Outro partner
  useEffect(() => {
    supabase
      .from("couple_settings")
      .select("partner_one_name, partner_two_name")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const me = partnerName.toLowerCase();
        const other = data.partner_one_name?.toLowerCase() === me
          ? data.partner_two_name
          : data.partner_one_name;
        setOtherPartnerName(other ?? "");
      });
  }, [partnerName]);

  // Sync DB no modo diário (estado próprio + competidor)
  useEffect(() => {
    if (mode !== "daily" || !otherPartnerName) return;
    let cancelled = false;
    (async () => {
      const { data, error: e } = await (supabase as any)
        .from("word_game_daily")
        .select("*")
        .eq("game_date", today)
        .in("partner_name", [partnerName.toLowerCase(), otherPartnerName.toLowerCase(), partnerName, otherPartnerName]);
      if (cancelled || e || !data) return;
      const mine = (data as any[]).find((r) => r.partner_name?.toLowerCase() === partnerName.toLowerCase());
      const other = (data as any[]).find((r) => r.partner_name?.toLowerCase() === otherPartnerName.toLowerCase());
      if (mine && (mine.attempts?.length ?? 0) > attempts.length) {
        setAttempts(mine.attempts);
        setFinished(mine.finished);
        setWon(mine.won);
        setHintLetter(mine.received_hint_letter ?? undefined);
        setGaveHint(mine.gave_hint ?? false);
      }
      if (other) {
        setOtherStatus({
          finished: other.finished,
          won: other.won,
          attempts: other.attempts_count,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [mode, today, partnerName, otherPartnerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Realtime competidor (modo diário)
  useEffect(() => {
    if (mode !== "daily" || !otherPartnerName) return;
    const ch = supabase
      .channel("wordle-page-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "word_game_daily" }, (payload) => {
        const row = payload.new as any;
        if (!row || row.game_date !== today) return;
        if (row.partner_name?.toLowerCase() === otherPartnerName.toLowerCase()) {
          setOtherStatus({ finished: row.finished, won: row.won, attempts: row.attempts_count });
        }
        if (row.partner_name?.toLowerCase() === partnerName.toLowerCase() && row.received_hint_letter && !hintLetter) {
          setHintLetter(row.received_hint_letter);
          triggerBurst("💡");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mode, today, partnerName, otherPartnerName, hintLetter]);

  const evaluations: EvaluatedGuess[] = useMemo(
    () => attempts.map((a) => evaluateGuess(a, word)),
    [attempts, word],
  );
  const keyboardStatus = useMemo(() => aggregateKeyboardStatus(evaluations), [evaluations]);

  // Recompensa pet (modo diário ganhou)
  const rewardPet = async (attemptsCount: number) => {
    if (mode !== "daily") return;
    const reward = rewardForAttempts(attemptsCount);
    const { data: pet } = await supabase.from("pet_state").select("*").eq("id", 1).single();
    if (!pet) return;
    const p = pet as PetState;
    const newHappiness = Math.round(clamp(p.happiness + reward.happiness));
    const newXp = Math.round(p.xp + reward.xp);
    const newLevel = Math.floor(newXp / 100) + 1;
    await supabase
      .from("pet_state")
      .update({ happiness: newHappiness, xp: newXp, level: newLevel, updated_at: new Date().toISOString() })
      .eq("id", 1);
  };

  const persistRemote = async (nextAttempts: string[], isWon: boolean, isFinished: boolean) => {
    if (mode !== "daily") return;
    const { error: e } = await (supabase as any)
      .from("word_game_daily")
      .upsert(
        {
          partner_name: partnerName.toLowerCase(),
          game_date: today,
          word,
          attempts: nextAttempts,
          attempts_count: nextAttempts.length,
          won: isWon,
          finished: isFinished,
          completed_at: isFinished ? new Date().toISOString() : null,
        },
        { onConflict: "partner_name,game_date" },
      );
    if (e) console.warn("[wordle] persist falhou:", e.message);
  };

  const flashError = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    setMochiMood("sad");
    triggerBurst("❌");
    window.setTimeout(() => setShake(false), 350);
    window.setTimeout(() => { setError(null); setMochiMood("idle"); }, 1600);
  }, []);

  const submitGuess = async () => {
    if (busy || finished) return;
    const guess = normalize(current);
    if (guess.length !== WORD_LENGTH) {
      flashError(`palavra precisa ter ${WORD_LENGTH} letras`);
      return;
    }
    setBusy(true);
    const ev = evaluateGuess(guess, word);
    const newAttempts = [...attempts, guess];
    const isWon = ev.isCorrect;
    const isFinished = isWon || newAttempts.length >= MAX_ATTEMPTS;

    setAttempts(newAttempts);
    setCurrent("");
    setFinished(isFinished);
    setWon(isWon);

    if (isWon) { setMochiMood("smitten"); triggerBurst("🎉"); triggerBurst("✨"); }
    else if (isFinished) { setMochiMood("sad"); triggerBurst("💔"); }
    else { setMochiMood("happy"); triggerBurst("💗"); }

    saveLocal(lsKey, { attempts: newAttempts, finished: isFinished, won: isWon, hintLetter, gaveHint });

    try {
      if (isWon && mode === "daily") await rewardPet(newAttempts.length);
      await persistRemote(newAttempts, isWon, isFinished);
    } catch (e) {
      console.error("[wordle] submit error:", e);
    } finally {
      setBusy(false);
    }
  };

  const onKeyPress = (key: string) => {
    if (finished || busy) return;
    if (key === "ENTER") return submitGuess();
    if (key === "BACK") {
      setCurrent((c) => c.slice(0, -1));
      setMochiMood("idle");
      return;
    }
    if (current.length >= WORD_LENGTH) return;
    if (!/^[a-z]$/.test(key)) return;
    setCurrent((c) => c + key);
    setMochiMood("happy");
  };

  // teclado físico
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Não interfere se o usuário tá digitando em input/textarea
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.key === "Enter") { e.preventDefault(); return onKeyPress("ENTER"); }
      if (e.key === "Backspace") { e.preventDefault(); return onKeyPress("BACK"); }
      if (e.key.length === 1 && /^[a-zA-Zà-ú]$/.test(e.key)) {
        e.preventDefault();
        const norm = normalize(e.key);
        if (norm) onKeyPress(norm);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finished, busy, current, attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  const giveHint = async () => {
    if (gaveHint || !won || mode !== "daily" || !otherPartnerName) return;
    setGaveHint(true);
    saveLocal(lsKey, { attempts, finished, won, hintLetter, gaveHint: true });

    const { data: otherRow } = await (supabase as any)
      .from("word_game_daily")
      .select("attempts")
      .eq("game_date", today)
      .ilike("partner_name", otherPartnerName)
      .maybeSingle();
    const otherAttempts: string[] = otherRow?.attempts ?? [];
    const known = new Set<string>();
    for (const a of otherAttempts) {
      const ev = evaluateGuess(a, word);
      for (const cell of ev.letters) {
        if (cell.status !== "absent") known.add(cell.char);
      }
    }
    const letter = pickHintLetter(word, known);
    if (!letter) return;
    await Promise.all([
      (supabase as any).from("word_game_daily")
        .update({ gave_hint: true })
        .eq("game_date", today)
        .ilike("partner_name", partnerName.toLowerCase()),
      (supabase as any).from("word_game_daily").upsert(
        {
          partner_name: otherPartnerName.toLowerCase(),
          game_date: today,
          word,
          received_hint_letter: letter,
        },
        { onConflict: "partner_name,game_date" },
      ),
    ]);
    triggerBurst("💡");
  };

  const switchToPractice = () => {
    setMode("practice");
    setPracticeWord(pickRandomPracticeWord(dailyWord));
  };
  const switchToDaily = () => setMode("daily");

  const otherCopy =
    mode === "practice"
      ? "modo treino · sem reward"
      : otherStatus
        ? otherStatus.finished
          ? otherStatus.won
            ? `${otherPartnerName.toLowerCase()} acertou em ${otherStatus.attempts}! 🎉`
            : `${otherPartnerName.toLowerCase()} não conseguiu hoje 💔`
          : otherStatus.attempts > 0
            ? `${otherPartnerName.toLowerCase()} jogando — ${otherStatus.attempts}/6`
            : `${otherPartnerName.toLowerCase()} ainda não jogou`
        : `${otherPartnerName ? otherPartnerName.toLowerCase() : "parceiro"} ainda não jogou`;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-background pb-3">
      {/* HEADER */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <Link
          to="/"
          className="glass flex h-9 w-9 items-center justify-center rounded-full text-sm"
          aria-label="voltar"
        >
          ←
        </Link>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {mode === "daily" ? "palavra do dia" : "🎲 modo treino"}
          </p>
          <p className="text-[11px] text-muted-foreground/80">{otherCopy}</p>
        </div>
        <button
          onClick={mode === "daily" ? switchToPractice : switchToDaily}
          className="glass rounded-full px-3 py-1.5 text-[11px] font-semibold"
          title={mode === "daily" ? "outra palavra (treino)" : "voltar pra palavra do dia"}
        >
          {mode === "daily" ? "🎲" : "📅"}
        </button>
      </header>

      {/* MOCHI MASCOTE no canto superior direito — bem pequeno, NÃO tampa nada */}
      <div className="pointer-events-none absolute right-3 top-12 z-10" style={{ width: 64, height: 64 }}>
        <div style={{ transform: "scale(0.32)", transformOrigin: "top right" }}>
          <Mochi
            mood={mochiMood}
            skinId={mochiAppearance?.skin}
            accessoryId={mochiAppearance?.accessory}
            hunger={mochiAppearance?.hunger}
            happiness={mochiAppearance?.happiness}
            energy={mochiAppearance?.energy}
          />
        </div>
        {/* Bursts de emoji subindo do mascote */}
        <AnimatePresence>
          {emojiBursts.map((b) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 1, y: 0, scale: 0.6 }}
              animate={{ opacity: 0, y: -36, scale: 1.2 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="absolute right-2 top-2 text-lg"
            >
              {b.char}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* HINT BANNER */}
      {hintLetter && (
        <div className="mx-3 mt-2 rounded-xl bg-pink/10 p-2 text-center text-xs ring-1 ring-pink/30">
          💡 {(otherPartnerName || "parceiro").toLowerCase()} te deu uma dica: a letra{" "}
          <span className="font-bold text-pink">{hintLetter.toUpperCase()}</span>{" "}
          tá na palavra
        </div>
      )}

      {/* GRID — protagonista, centralizada, espaçada */}
      <div className="flex flex-1 items-center justify-center py-4">
        <div
          className={`flex flex-col gap-1.5 ${shake ? "animate-shake" : ""}`}
          style={{ width: "fit-content" }}
        >
          {Array.from({ length: MAX_ATTEMPTS }).map((_, row) => {
            const ev = evaluations[row];
            const isCurrentRow = row === attempts.length && !finished;
            return (
              <div key={row} className="flex gap-1.5">
                {Array.from({ length: WORD_LENGTH }).map((_, col) => {
                  const cellChar = ev
                    ? ev.letters[col].char
                    : isCurrentRow
                      ? current[col] ?? ""
                      : "";
                  const status: CellStatus = ev ? ev.letters[col].status : "empty";
                  const isLastTyped = isCurrentRow && col === current.length - 1;
                  return (
                    <Cell
                      key={col}
                      char={cellChar}
                      status={status}
                      revealing={ev !== undefined && row === attempts.length - 1}
                      delay={col * 0.08}
                      pop={isLastTyped}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <p className="mx-3 -mt-2 mb-2 text-center text-xs text-pink animate-pulse">{error}</p>
      )}

      {/* ESTADO FINAL */}
      {finished && (
        <div className="mx-3 mb-3 rounded-2xl bg-white/5 p-3 text-center">
          {won ? (
            <p className="text-sm font-semibold text-emerald-400">
              🎉 acertou em {attempts.length} {attempts.length === 1 ? "tentativa" : "tentativas"}!
              {mode === "daily" && (
                <span className="ml-1 text-[11px] text-muted-foreground">
                  · +{rewardForAttempts(attempts.length).xp} XP
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm">
              💔 a palavra era{" "}
              <span className="font-bold text-pink">{word.toUpperCase()}</span>
            </p>
          )}
          {won && mode === "daily" && !gaveHint && otherStatus && !otherStatus.finished && (
            <button
              onClick={giveHint}
              className="mt-2 rounded-full bg-pink/20 px-4 py-1.5 text-xs font-semibold text-pink transition-all hover:bg-pink/30 active:scale-95"
            >
              💡 dar dica pro {otherPartnerName.toLowerCase()}
            </button>
          )}
          {gaveHint && (
            <p className="mt-1 text-[10px] text-muted-foreground">✓ dica enviada</p>
          )}
          <button
            onClick={switchToPractice}
            className="mt-3 inline-block rounded-full bg-gradient-to-r from-pink to-lilac px-5 py-2 text-xs font-bold text-white shadow-md transition-all active:scale-95"
          >
            🎲 jogar outra (treino)
          </button>
        </div>
      )}

      {/* TECLADO — fixo no fundo */}
      {!finished && (
        <div className="space-y-1.5 px-2 pb-2">
          <KbRow keys={KB_ROW1} status={keyboardStatus} onPress={onKeyPress} />
          <KbRow keys={KB_ROW2} status={keyboardStatus} onPress={onKeyPress} />
          <div className="flex justify-center gap-1">
            <SpecialKey label="ENTER" onPress={() => onKeyPress("ENTER")} wide />
            {KB_ROW3.map((k) => (
              <Key key={k} k={k} status={keyboardStatus[k]} onPress={() => onKeyPress(k)} />
            ))}
            <SpecialKey label="⌫" onPress={() => onKeyPress("BACK")} wide />
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------ Cell ------------------
function Cell({
  char,
  status,
  revealing,
  delay,
  pop,
}: {
  char: string;
  status: CellStatus;
  revealing: boolean;
  delay: number;
  pop: boolean;
}) {
  const colors: Record<CellStatus, string> = {
    correct: "bg-emerald-500 text-white border-emerald-500",
    present: "bg-yellow-500 text-white border-yellow-500",
    absent: "bg-zinc-700/80 text-zinc-300 border-zinc-700",
    empty: char ? "bg-white/10 border-pink/50 text-foreground" : "bg-white/5 border-white/15 text-foreground",
  };
  return (
    <motion.div
      initial={revealing ? { rotateX: 0 } : false}
      animate={
        revealing
          ? { rotateX: [0, 90, 0] }
          : pop
            ? { scale: [1, 1.18, 1] }
            : {}
      }
      transition={
        revealing
          ? { duration: 0.5, delay, times: [0, 0.5, 1] }
          : pop
            ? { duration: 0.16, ease: "easeOut" }
            : {}
      }
      className={`flex h-13 w-13 items-center justify-center rounded-md border-2 font-display text-2xl font-bold uppercase ${colors[status]}`}
      style={{ width: 52, height: 52 }}
    >
      {char}
    </motion.div>
  );
}

// ------------------ Keyboard ------------------
function KbRow({
  keys,
  status,
  onPress,
}: {
  keys: string[];
  status: Record<string, CellStatus>;
  onPress: (k: string) => void;
}) {
  return (
    <div className="flex justify-center gap-1">
      {keys.map((k) => (
        <Key key={k} k={k} status={status[k]} onPress={() => onPress(k)} />
      ))}
    </div>
  );
}

function Key({
  k,
  status,
  onPress,
}: {
  k: string;
  status?: CellStatus;
  onPress: () => void;
}) {
  const colors: Record<CellStatus, string> = {
    correct: "bg-emerald-500 text-white",
    present: "bg-yellow-500 text-white",
    absent: "bg-zinc-800 text-zinc-500",
    empty: "bg-white/10 text-foreground hover:bg-white/15",
  };
  const cls = status ? colors[status] : colors.empty;
  return (
    <button
      onClick={onPress}
      className={`h-12 flex-1 rounded-md font-bold uppercase text-base transition-all active:scale-90 ${cls}`}
      style={{ minWidth: 28, maxWidth: 38 }}
    >
      {k}
    </button>
  );
}

function SpecialKey({
  label,
  onPress,
  wide,
}: {
  label: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onPress}
      className={`h-12 rounded-md bg-pink/15 px-3 text-[11px] font-bold text-pink transition-all hover:bg-pink/25 active:scale-90 ${wide ? "min-w-14" : ""}`}
    >
      {label}
    </button>
  );
}
