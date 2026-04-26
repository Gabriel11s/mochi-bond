// Caça-palavras com 3 modos (Termo / Dueto / Quarteto) — replica do
// term.ooo. Cada palpite é avaliado contra TODAS as palavras-alvo.
// Layout adapta cell size por modo pra caber bem em mobile.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getSkin } from "@/lib/mochi-cosmetics";
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
  // evaluations[wordIdx][attemptIdx], mas truncadas no momento que cada
  // palavra foi resolvida — assim o grid "congela" no acerto e não fica
  // preenchendo linhas absent/yellow depois (bug do quarteto).
  const allEvaluations: EvaluatedGuess[][] = useMemo(() => {
    return words.map((w) => {
      const evs = attempts.map((a) => evaluateGuess(a, w));
      const solvedAt = evs.findIndex((e) => e.isCorrect);
      return solvedAt === -1 ? evs : evs.slice(0, solvedAt + 1);
    });
  }, [attempts, words]);

  const solvedFlags: boolean[] = useMemo(
    () => allEvaluations.map((evs) => evs.length > 0 && evs[evs.length - 1].isCorrect),
    [allEvaluations],
  );
  const solvedCount = solvedFlags.filter(Boolean).length;

  // Status do teclado (informativo) — usado pra dar dica visual no campo
  const keyboardStatus = useMemo(() => {
    const all = allEvaluations.flat();
    return aggregateKeyboardStatus(all);
  }, [allEvaluations]);
  // letras que com certeza não estão em nenhuma palavra (todas as grids)
  const absentLetters = useMemo(() => {
    const set = new Set<string>();
    for (const [letter, status] of Object.entries(keyboardStatus)) {
      if (status === "absent") set.add(letter);
    }
    return set;
  }, [keyboardStatus]);

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

  // -------- input nativo (teclado do celular) --------
  const inputRef = useRef<HTMLInputElement | null>(null);
  const focusInput = () => {
    // Foca o input invisível pra fazer o teclado nativo aparecer no mobile
    inputRef.current?.focus();
  };
  // Auto-foco no início e quando troca o jogo
  useEffect(() => {
    if (!finished) {
      // Pequeno delay porque mobile às vezes ignora focus se vier no mount
      const t = window.setTimeout(() => inputRef.current?.focus(), 200);
      return () => window.clearTimeout(t);
    }
  }, [finished, lsK]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (finished || busy) return;
    const raw = e.target.value;
    const norm = normalize(raw).slice(0, WORD_LENGTH);
    setCurrent(norm);
    if (norm.length > 0) setMochiMood("happy");
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitGuess();
    }
  };

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
  // Sem teclado custom (usa nativo) → mais espaço pro grid → cells maiores
  const cellSize: number = mode === "single" ? 52 : mode === "duo" ? 36 : 28;
  const cellGap: number = mode === "single" ? 4 : mode === "duo" ? 3 : 2;
  const fontSize = mode === "single" ? "clamp(18px, 5.5vw, 26px)" : mode === "duo" ? "clamp(13px, 4vw, 16px)" : "clamp(11px, 3vw, 14px)";

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden bg-background">
      {/* HEADER + MOCHI compacto centralizado */}
      <header className="flex flex-shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2">
        <Link to="/" className="glass flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs" aria-label="voltar">←</Link>

        {/* Label modo + status (sem pet) */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center leading-tight">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/90">
            {kind === "daily" ? cfg.label : `${cfg.label} · treino`}
          </p>
          <p className="text-[10px] text-muted-foreground/80">
            {otherCopy}
          </p>
          {/* Bursts de emoji no centro do header */}
          <AnimatePresence>
            {emojiBursts.map((b) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 1, y: 0, scale: 0.6 }}
                animate={{ opacity: 0, y: -24, scale: 1.1, x: b.x * 0.5 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 text-sm"
              >
                {b.char}
              </motion.div>
            ))}
          </AnimatePresence>
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

      {/* GRIDS — 1, 2 (lado-a-lado) ou 4 (2x2). Quarteto: scroll vertical
          se necessário em telas pequenas (cells 28px ainda passam de 470px). */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto px-2 py-2 min-h-0">
        <div
          className={`grid w-full justify-center gap-3 ${shake ? "animate-shake" : ""}`}
          style={{
            gridTemplateColumns:
              mode === "single" ? "1fr" : "repeat(2, max-content)",
            justifyItems: "center",
          }}
        >
          {words.map((w, wi) => (
            <WordGrid
              key={wi}
              word={w}
              index={wi}
              total={words.length}
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

      {/* INPUT NATIVO + BOTÃO ENTER — usa teclado do celular */}
      {!finished && (
        <div className="flex-shrink-0 px-2 pb-3 pt-1">
          {/* Input invisível que captura o teclado nativo */}
          <input
            ref={inputRef}
            type="text"
            value={current}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            inputMode="text"
            autoCapitalize="characters"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            maxLength={WORD_LENGTH}
            aria-label="digite a palavra"
            className="absolute h-px w-px opacity-0 -z-10"
            style={{ left: "-9999px" }}
          />

          {/* Pill clicável que mostra a letra digitada e abre o teclado */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={focusInput}
              className="flex flex-1 items-center justify-between gap-2 rounded-2xl bg-white/10 px-4 py-3 text-left ring-1 ring-white/20 transition-all active:scale-[0.98]"
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {current.length === 0 ? "tocar pra digitar" : `${current.length}/${WORD_LENGTH}`}
              </span>
              <span className="font-display text-lg font-bold uppercase tracking-[0.3em] text-foreground">
                {current.padEnd(WORD_LENGTH, "·").split("").map((c, i) => (
                  <span key={i} className={c === "·" ? "text-muted-foreground/30" : ""}>{c}</span>
                ))}
              </span>
            </button>
            <button
              type="button"
              onClick={submitGuess}
              disabled={current.length !== WORD_LENGTH}
              className="rounded-2xl bg-gradient-to-r from-pink to-lilac px-4 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-40"
            >
              ↵
            </button>
          </div>

          {absentLetters.size > 0 && (
            <p className="mt-1.5 text-center text-[9px] text-muted-foreground/60">
              fora: {[...absentLetters].sort().join(" ").toUpperCase()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------ WordGrid (1 grid por palavra) ------------------
function WordGrid({
  index,
  total,
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
  index: number;
  total: number;
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
  // Como evaluations agora é truncado quando resolved, attempts.length pode ser
  // maior — usamos o length real das evaluations pra detectar a current row.
  const evCount = evaluations.length;
  return (
    <div
      className={`relative flex flex-col rounded-lg p-1.5 transition-all ${
        solved
          ? "bg-emerald-500/10 ring-1 ring-emerald-500/40"
          : total > 1
            ? "bg-white/5 ring-1 ring-white/10"
            : ""
      }`}
      style={{ gap: cellGap }}
    >
      {/* Label do grid (só em modo multi) */}
      {total > 1 && (
        <p className="mb-0.5 text-center text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          palavra {index + 1}/{total} {solved && "✓"}
        </p>
      )}
      {Array.from({ length: maxAttempts }).map((_, row) => {
        const ev = evaluations[row];
        const isCurrentRow = showCurrentRow && !solved && row === attempts.length;
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
                  revealing={ev !== undefined && row === evCount - 1}
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

