// Caça-palavras com 3 modos (Termo / Dueto / Quarteto) — replica do
// term.ooo. Cada palpite é avaliado contra TODAS as palavras-alvo.
// Layout adapta cell size por modo pra caber bem em mobile.
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  WORD_LENGTH,
  WORD_POOL,
  MODE_CONFIG,
  getDailyWords,
  getRandomWords,
  getTodayKey,
  normalize,
  evaluateGuess,
  aggregateKeyboardStatus,
  rewardForGame,
  pickHintLetter,
  type GameMode,
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
  words?: string[]; // pra modo treino multi-palavra
}

const KB_ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const KB_ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const KB_ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

const todayKey = () => getTodayKey();

// localStorage keys distintas por (mode, daily/practice, key)
const lsKey = (mode: GameMode, kind: "daily" | "practice", key: string) =>
  `mochi-wordle:${mode}:${kind}-${key}`;

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

  // -------- modo + palavras --------
  const [mode, setMode] = useState<GameMode>("single");
  const [kind, setKind] = useState<"daily" | "practice">("daily");
  const [practiceKey, setPracticeKey] = useState<string>("0");
  const [practiceWords, setPracticeWords] = useState<string[]>([]);

  const dailyWords = useMemo(
    () => getDailyWords(MODE_CONFIG[mode].wordCount, new Date()),
    [mode],
  );
  const words = kind === "daily" ? dailyWords : practiceWords;
  const cfg = MODE_CONFIG[mode];
  const maxAttempts = cfg.maxAttempts;
  const lsK = lsKey(mode, kind, kind === "daily" ? today : practiceKey);

  // -------- estado do jogo --------
  const [attempts, setAttempts] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [hintLetter, setHintLetter] = useState<string | undefined>();
  const [gaveHint, setGaveHint] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otherPartnerName, setOtherPartnerName] = useState<string>("");
  const [otherStatus, setOtherStatus] = useState<{ finished: boolean; won: boolean; attempts: number } | null>(null);

  const [mochiMood, setMochiMood] = useState<Mood>("idle");
  const [mochiAppearance, setMochiAppearance] = useState<{ skin: string; accessory: string; hunger: number; happiness: number; energy: number } | null>(null);
  const [emojiBursts, setEmojiBursts] = useState<Array<{ id: number; char: string; x: number }>>([]);

  const triggerBurst = (char: string) => {
    const id = ++burstId;
    const x = -20 + Math.random() * 40; // dispersa horizontalmente
    setEmojiBursts((prev) => [...prev, { id, char, x }]);
    window.setTimeout(() => {
      setEmojiBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1100);
  };

  // -------- carrega estado local --------
  useEffect(() => {
    if (words.length === 0) return;
    const saved = loadLocal(lsK);
    if (saved) {
      setAttempts(saved.attempts ?? []);
      setFinished(saved.finished ?? false);
      setWon(saved.won ?? false);
      setHintLetter(saved.hintLetter);
      setGaveHint(saved.gaveHint ?? false);
      // No modo treino, recupera as palavras do save
      if (kind === "practice" && saved.words?.length) {
        setPracticeWords(saved.words);
      }
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
  }, [lsK, words.length, kind]);

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

  // -------- avaliações por palavra --------
  // evaluations[wordIdx][attemptIdx]
  const allEvaluations: EvaluatedGuess[][] = useMemo(
    () => words.map((w) => attempts.map((a) => evaluateGuess(a, w))),
    [attempts, words],
  );

  // Quais palavras foram resolvidas (algum palpite acertou)
  const solvedFlags: boolean[] = useMemo(
    () => allEvaluations.map((evs) => evs.some((e) => e.isCorrect)),
    [allEvaluations],
  );
  const solvedCount = solvedFlags.filter(Boolean).length;

  // Status do teclado: agrega de TODAS as palavras
  const keyboardStatus = useMemo(() => {
    const all = allEvaluations.flat();
    return aggregateKeyboardStatus(all);
  }, [allEvaluations]);

  // -------- recompensa do pet (modo diário ganhou) --------
  const rewardPet = async (attemptsCount: number) => {
    if (kind !== "daily") return;
    const reward = rewardForGame(mode, attemptsCount);
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
    const newAttempts = [...attempts, guess];
    // Verifica se TODAS resolvidas após esse palpite
    const newSolved = words.map((w) => newAttempts.some((a) => normalize(a) === normalize(w)));
    const allSolved = newSolved.every(Boolean);
    const isFinished = allSolved || newAttempts.length >= maxAttempts;
    const isWon = allSolved;

    setAttempts(newAttempts);
    setCurrent("");
    setFinished(isFinished);
    setWon(isWon);

    if (isWon) { setMochiMood("smitten"); triggerBurst("🎉"); triggerBurst("✨"); triggerBurst("💗"); }
    else if (isFinished) { setMochiMood("sad"); triggerBurst("💔"); }
    else if (newSolved.filter(Boolean).length > solvedCount) {
      // Acabou de resolver alguma (em modo multi): celebra parcial
      setMochiMood("happy"); triggerBurst("✨");
    } else {
      setMochiMood("happy"); triggerBurst("💗");
    }

    saveLocal(lsK, {
      attempts: newAttempts,
      finished: isFinished,
      won: isWon,
      hintLetter,
      gaveHint,
      words: kind === "practice" ? words : undefined,
    });

    try {
      if (isWon && kind === "daily") await rewardPet(newAttempts.length);
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

  // -------- modo treino: gera novas palavras --------
  const switchToPractice = () => {
    const newKey = String(Date.now());
    const newWords = getRandomWords(cfg.wordCount, dailyWords);
    setPracticeWords(newWords);
    setPracticeKey(newKey);
    setKind("practice");
    // Salva imediato pra recuperar as palavras se sair antes de jogar
    saveLocal(lsKey(mode, "practice", newKey), {
      attempts: [],
      finished: false,
      won: false,
      words: newWords,
    });
  };
  const switchToDaily = () => setKind("daily");

  // -------- troca de modo --------
  const changeMode = (m: GameMode) => {
    setMode(m);
    setKind("daily");
  };

  // -------- dica entre o casal (só single + daily) --------
  const giveHint = async () => {
    if (gaveHint || !won || mode !== "single" || kind !== "daily" || !otherPartnerName) return;
    setGaveHint(true);
    saveLocal(lsK, { attempts, finished, won, hintLetter, gaveHint: true });
    const target = words[0];
    const known = new Set<string>();
    for (const a of attempts) {
      const ev = evaluateGuess(a, target);
      for (const cell of ev.letters) {
        if (cell.status !== "absent") known.add(cell.char);
      }
    }
    const letter = pickHintLetter(target, known);
    if (!letter) return;
    triggerBurst("💡");
    // (persistência DB do word_game_daily fica pra quando Lovable criar a tabela)
  };

  const otherCopy =
    kind === "practice"
      ? "modo treino · sem reward"
      : `${otherPartnerName ? otherPartnerName.toLowerCase() : "parceiro"} · ainda jogando`;

  // -------- cell sizing por modo --------
  // Calcula tamanho da célula de forma responsiva
  const cellSize: number = mode === "single" ? 44 : mode === "duo" ? 30 : 22;
  const cellGap: number = mode === "single" ? 4 : mode === "duo" ? 3 : 2;
  const fontSize = mode === "single" ? "clamp(16px, 5vw, 22px)" : mode === "duo" ? "clamp(11px, 3.5vw, 14px)" : "clamp(9px, 2.8vw, 11px)";

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background">
      {/* HEADER + MOCHI compacto centralizado */}
      <header className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 px-2 py-1.5">
        <Link to="/" className="glass flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs" aria-label="voltar">←</Link>

        {/* Mochi pill — circulinho compacto entre os dois botões */}
        <div className="relative flex flex-1 items-center justify-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink/20 to-lilac/10 ring-1 ring-pink/30">
            <div style={{ transform: "scale(0.26)", transformOrigin: "center" }}>
              <Mochi
                mood={mochiMood}
                skinId={mochiAppearance?.skin}
                accessoryId={mochiAppearance?.accessory}
                hunger={mochiAppearance?.hunger}
                happiness={mochiAppearance?.happiness}
                energy={mochiAppearance?.energy}
              />
            </div>
            {/* Bursts saindo de cima do Mochi */}
            <AnimatePresence>
              {emojiBursts.map((b) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 1, y: 0, scale: 0.6 }}
                  animate={{ opacity: 0, y: -30, scale: 1.1, x: b.x * 0.5 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="pointer-events-none absolute left-1/2 -top-1 -translate-x-1/2 text-base"
                >
                  {b.char}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {/* Label modo + status à direita do Mochi */}
          <div className="ml-2 text-left">
            <p className="text-[10px] font-semibold uppercase leading-tight tracking-wider text-foreground/90">
              {kind === "daily" ? cfg.label : `${cfg.label} · treino`}
            </p>
            <p className="text-[9px] leading-tight text-muted-foreground/80">
              {otherCopy}
            </p>
          </div>
        </div>

        <button
          onClick={kind === "daily" ? switchToPractice : switchToDaily}
          className="glass flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          title={kind === "daily" ? "outra (treino)" : "voltar pra do dia"}
        >
          {kind === "daily" ? "🎲" : "📅"}
        </button>
      </header>

      {/* MODE PICKER — 3 abas compactas */}
      <div className="flex flex-shrink-0 gap-1 px-2 pt-1">
        {(Object.keys(MODE_CONFIG) as GameMode[]).map((m) => {
          const c = MODE_CONFIG[m];
          const active = m === mode;
          return (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={`flex-1 rounded-md py-0.5 text-[10px] font-semibold transition-all active:scale-95 ${
                active
                  ? "bg-pink/20 text-pink ring-1 ring-pink/40"
                  : "bg-white/5 text-muted-foreground"
              }`}
            >
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

      {/* HINT BANNER (só no Termo single) */}
      {hintLetter && mode === "single" && (
        <div className="mx-2 mt-1 flex-shrink-0 rounded-lg bg-pink/10 p-1 text-center text-[10px] ring-1 ring-pink/30">
          💡 letra <span className="font-bold text-pink">{hintLetter.toUpperCase()}</span> tá na palavra
        </div>
      )}

      {/* GRIDS — 1, 2 (lado-a-lado) ou 4 (2x2) */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-2 py-2 min-h-0">
        <div
          className={`flex flex-wrap justify-center gap-3 ${shake ? "animate-shake" : ""}`}
          style={{ maxWidth: "100%" }}
        >
          {words.map((w, wi) => (
            <WordGrid
              key={wi}
              word={w}
              attempts={attempts}
              evaluations={allEvaluations[wi]}
              solved={solvedFlags[wi]}
              maxAttempts={maxAttempts}
              current={!finished && !solvedFlags[wi] ? current : ""}
              cellSize={cellSize}
              cellGap={cellGap}
              fontSize={fontSize}
              showCurrentRow={!solvedFlags[wi]}
            />
          ))}
        </div>
      </div>

      {/* ERROR */}
      <div className="flex-shrink-0 px-2" style={{ minHeight: 18 }}>
        {error && (
          <p className="text-center text-[11px] text-pink animate-pulse">{error}</p>
        )}
      </div>

      {/* ESTADO FINAL */}
      {finished && (
        <div className="mx-2 mb-1.5 flex-shrink-0 rounded-xl bg-white/5 p-2 text-center">
          {won ? (
            <p className="text-xs font-semibold text-emerald-400">
              🎉 acertou {cfg.wordCount > 1 ? `as ${cfg.wordCount} palavras` : ""} em {attempts.length} {attempts.length === 1 ? "tentativa" : "tentativas"}!
              {kind === "daily" && (
                <span className="ml-1 text-[10px] text-muted-foreground">
                  +{rewardForGame(mode, attempts.length).xp} XP
                </span>
              )}
            </p>
          ) : (
            <div className="text-xs">
              💔 acabaram as tentativas — {solvedCount}/{cfg.wordCount} resolvidas
              {!won && words.some((_, i) => !solvedFlags[i]) && (
                <p className="mt-1 text-[10px] text-pink">
                  era: {words.filter((_, i) => !solvedFlags[i]).map((w) => w.toUpperCase()).join(", ")}
                </p>
              )}
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
            {won && mode === "single" && kind === "daily" && !gaveHint && otherPartnerName && (
              <button
                onClick={giveHint}
                className="rounded-full bg-pink/20 px-3 py-1 text-[10px] font-semibold text-pink active:scale-95"
              >
                💡 dar dica
              </button>
            )}
            <button
              onClick={switchToPractice}
              className="rounded-full bg-gradient-to-r from-pink to-lilac px-3 py-1 text-[10px] font-bold text-white shadow-md active:scale-95"
            >
              🎲 outra (treino)
            </button>
          </div>
        </div>
      )}

      {/* TECLADO */}
      {!finished && (
        <div className="flex-shrink-0 space-y-1 px-1 pb-1.5">
          <KbRow keys={KB_ROW1} status={keyboardStatus} onPress={onKeyPress} />
          <KbRow keys={KB_ROW2} status={keyboardStatus} onPress={onKeyPress} />
          <div className="flex w-full justify-center gap-1">
            <SpecialKey label="ENTER" onPress={() => onKeyPress("ENTER")} />
            {KB_ROW3.map((k) => (
              <Key key={k} k={k} status={keyboardStatus[k]} onPress={() => onKeyPress(k)} />
            ))}
            <SpecialKey label="⌫" onPress={() => onKeyPress("BACK")} />
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------ WordGrid (1 grid por palavra) ------------------
function WordGrid({
  attempts,
  evaluations,
  solved,
  maxAttempts,
  current,
  cellSize,
  cellGap,
  fontSize,
  showCurrentRow,
}: {
  word: string;
  attempts: string[];
  evaluations: EvaluatedGuess[];
  solved: boolean;
  maxAttempts: number;
  current: string;
  cellSize: number;
  cellGap: number;
  fontSize: string;
  showCurrentRow: boolean;
}) {
  return (
    <div
      className={`relative flex flex-col rounded-md p-1 ${solved ? "ring-1 ring-emerald-500/40 bg-emerald-500/5" : ""}`}
      style={{ gap: cellGap }}
    >
      {Array.from({ length: maxAttempts }).map((_, row) => {
        const ev = evaluations[row];
        const isCurrentRow = showCurrentRow && row === attempts.length;
        return (
          <div key={row} className="flex" style={{ gap: cellGap }}>
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
                  delay={col * 0.06}
                  pop={isLastTyped}
                  size={cellSize}
                  fontSize={fontSize}
                />
              );
            })}
          </div>
        );
      })}
      {solved && (
        <div className="pointer-events-none absolute -top-2 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
          ✓
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
  size,
  fontSize,
}: {
  char: string;
  status: CellStatus;
  revealing: boolean;
  delay: number;
  pop: boolean;
  size: number;
  fontSize: string;
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
          ? { duration: 0.4, delay, times: [0, 0.5, 1] }
          : pop
            ? { duration: 0.16, ease: "easeOut" }
            : {}
      }
      className={`flex items-center justify-center rounded-sm border font-display font-bold uppercase ${colors[status]}`}
      style={{ width: size, height: size, fontSize }}
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
    empty: "bg-white/10 text-foreground active:bg-white/20",
  };
  const cls = status ? colors[status] : colors.empty;
  return (
    <button
      onClick={onPress}
      className={`flex-1 rounded-md font-bold uppercase transition-all active:scale-90 ${cls}`}
      style={{ height: 44, fontSize: "clamp(13px, 3.8vw, 16px)", minWidth: 0 }}
    >
      {k}
    </button>
  );
}

function SpecialKey({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <button
      onClick={onPress}
      className="rounded-md bg-pink/15 font-bold text-pink transition-all active:bg-pink/25 active:scale-90"
      style={{ height: 44, fontSize: 11, padding: "0 8px", flexBasis: "14%", flexShrink: 0 }}
    >
      {label}
    </button>
  );
}
