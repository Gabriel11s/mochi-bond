// Palavrinha — Wordle/Termo do casal seguindo spec.
// 3 modos (single / duo / quartet). Cells string[5] com activeColumn —
// tap em tile da row atual seta a coluna pra digitar ali.
import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  WORD_LENGTH,
  WORD_POOL,
  MODE_CONFIG,
  getDailyWord,
  getDailyWords,
  getRandomWords,
  getTodayKey,
  normalize,
  evaluateGuess,
  aggregateKeyboardStatus,
  calculateReward,
  rewardForGame,
  pickHintLetter,
  isValidGuess,
  type GameMode,
  type EvaluatedGuess,
  type CellStatus,
} from "@/lib/mochi-wordle";
import type { PetState } from "@/lib/mochi-types";
import { clamp } from "@/lib/mochi-types";

interface Props {
  partnerName: string;
}

interface SavedState {
  words?: string[]; // pra modo treino
  attempts: string[];
  status: "playing" | "won" | "lost";
  hintLetter?: string;
  gaveHint?: boolean;
}

const KB_ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const KB_ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const KB_ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

const lsKey = (mode: GameMode, kind: "daily" | "practice", k: string) =>
  `mochi-palavrinha:${mode}:${kind}-${k}`;

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

const emptyCells = (): string[] => Array(WORD_LENGTH).fill("");
let burstId = 0;

export function WordleGame({ partnerName }: Props) {
  const today = useMemo(() => getTodayKey(), []);

  // ---------- modo + palavras ----------
  const [mode, setMode] = useState<GameMode>("single");
  const [kind, setKind] = useState<"daily" | "practice">("daily");
  const [practiceWords, setPracticeWords] = useState<string[]>([]);
  const [practiceKey, setPracticeKey] = useState<string>("0");

  const cfg = MODE_CONFIG[mode];
  const dailyWords = useMemo(
    () => (mode === "single" ? [getDailyWord()] : getDailyWords(cfg.wordCount)),
    [mode], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const words = kind === "daily" ? dailyWords : practiceWords;
  const lsK = lsKey(mode, kind, kind === "daily" ? today : practiceKey);
  const maxAttempts = cfg.maxAttempts;

  // ---------- estado do jogo ----------
  const [attempts, setAttempts] = useState<string[]>([]);
  const [cells, setCells] = useState<string[]>(emptyCells);
  const [activeColumn, setActiveColumn] = useState(0);
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
    if (words.length === 0) return;
    const saved = loadLocal(lsK);
    if (saved) {
      setAttempts(saved.attempts ?? []);
      setStatus(saved.status ?? "playing");
      setHintLetter(saved.hintLetter);
      setGaveHint(saved.gaveHint ?? false);
      if (kind === "practice" && saved.words?.length && practiceWords.length === 0) {
        setPracticeWords(saved.words);
      }
    } else {
      setAttempts([]);
      setStatus("playing");
      setHintLetter(undefined);
      setGaveHint(false);
    }
    setCells(emptyCells());
    setActiveColumn(0);
    setMessage(null);
  }, [lsK]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- outro partner ----------
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

  // ---------- sync DB (single + daily só, pra não complicar) ----------
  useEffect(() => {
    if (mode !== "single" || kind !== "daily" || !otherPartnerName) return;
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
      if (mine.received_hint_letter && !hintLetter) setHintLetter(mine.received_hint_letter);
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
  }, [mode, kind, today, partnerName, otherPartnerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- evaluations por palavra (truncadas no acerto) ----------
  const allEvaluations: EvaluatedGuess[][] = useMemo(() => {
    return words.map((w) => {
      const evs = attempts.map((a) => evaluateGuess(a, w));
      const solvedAt = evs.findIndex((e) => e.isCorrect);
      return solvedAt === -1 ? evs : evs.slice(0, solvedAt + 1);
    });
  }, [attempts, words]);
  const solvedFlags = useMemo(
    () => allEvaluations.map((evs) => evs.length > 0 && evs[evs.length - 1].isCorrect),
    [allEvaluations],
  );
  const solvedCount = solvedFlags.filter(Boolean).length;
  const keyboardStatus = useMemo(
    () => aggregateKeyboardStatus(allEvaluations.flat()),
    [allEvaluations],
  );

  // ---------- mensagens / shake ----------
  const showMessage = useCallback((msg: string, duration = 1800) => {
    setMessage(msg);
    window.setTimeout(() => setMessage(null), duration);
  }, []);
  const triggerShake = useCallback(() => {
    setShake(true);
    window.setTimeout(() => setShake(false), 350);
  }, []);

  // ---------- recompensa ----------
  const rewardPet = async (attemptsCount: number, finalStatus: "won" | "lost") => {
    if (kind !== "daily") return;
    const reward = mode === "single"
      ? calculateReward(attemptsCount, finalStatus)
      : finalStatus === "won"
        ? rewardForGame(mode, attemptsCount)
        : { xp: 3, happiness: 3 };
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

  // ---------- persist remote (single+daily) ----------
  const persistRemote = async (newAttempts: string[], finalStatus: "playing" | "won" | "lost") => {
    if (mode !== "single" || kind !== "daily") return;
    const { error: e } = await supabase.from("word_game_daily").upsert({
      partner_name: partnerName.toLowerCase(),
      game_date: today,
      word: words[0],
      attempts: newAttempts,
      attempts_count: newAttempts.length,
      won: finalStatus === "won",
      finished: finalStatus !== "playing",
      completed_at: finalStatus !== "playing" ? new Date().toISOString() : null,
    }, { onConflict: "partner_name,game_date" });
    if (e) console.warn("[wordle] persist falhou:", e.message);
  };

  // ---------- input ----------
  const currentString = cells.join("");

  const handleSubmit = async () => {
    if (status !== "playing" || busy) return;
    const guess = normalize(currentString);
    if (guess.length < WORD_LENGTH) {
      showMessage(`digite uma palavra com ${WORD_LENGTH} letras`);
      triggerShake();
      return;
    }
    if (!isValidGuess(guess)) {
      showMessage("palavra não reconhecida");
      triggerShake();
      return;
    }
    setBusy(true);
    const newAttempts = [...attempts, guess];
    const newSolved = words.map((w) => newAttempts.some((a) => normalize(a) === normalize(w)));
    const allSolved = newSolved.every(Boolean);
    const isLost = !allSolved && newAttempts.length >= maxAttempts;
    const newStatus: "playing" | "won" | "lost" = allSolved ? "won" : isLost ? "lost" : "playing";

    setAttempts(newAttempts);
    setCells(emptyCells());
    setActiveColumn(0);
    setStatus(newStatus);

    if (allSolved) { triggerBurst("🎉"); triggerBurst("✨"); triggerBurst("💗"); }
    else if (isLost) triggerBurst("💔");
    else if (newSolved.filter(Boolean).length > solvedCount) triggerBurst("✨");
    else triggerBurst("💗");

    saveLocal(lsK, {
      words: kind === "practice" ? words : undefined,
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

  // Coloca letra na activeColumn; pula slots já cheios pra avançar
  const handleLetter = (raw: string) => {
    if (status !== "playing") return;
    const ch = normalize(raw);
    if (!/^[a-z]$/.test(ch)) return;
    setCells((prev) => {
      const next = [...prev];
      next[activeColumn] = ch;
      return next;
    });
    // Avança pro próximo slot vazio (ou stay no último)
    setActiveColumn((c) => {
      let next = c + 1;
      while (next < WORD_LENGTH && cells[next] !== "") next++;
      return Math.min(next, WORD_LENGTH - 1);
    });
  };

  // Backspace inteligente: se a célula atual tem letra → apaga ela.
  // Senão, anda pra trás, apaga a célula anterior, foca nela.
  const handleBackspace = () => {
    if (status !== "playing") return;
    setCells((prev) => {
      const next = [...prev];
      if (next[activeColumn] !== "") {
        next[activeColumn] = "";
      } else if (activeColumn > 0) {
        next[activeColumn - 1] = "";
      }
      return next;
    });
    setActiveColumn((c) => {
      if (cells[c] !== "") return c;
      return Math.max(0, c - 1);
    });
  };

  const handleTileTap = (col: number) => {
    if (status !== "playing") return;
    setActiveColumn(col);
  };

  // ---------- teclado físico ----------
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
  }, [status, busy, cells, activeColumn, attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- ações ----------
  const startNewPractice = () => {
    const newWords = getRandomWords(cfg.wordCount, dailyWords);
    const k = String(Date.now());
    setPracticeWords(newWords);
    setPracticeKey(k);
    setKind("practice");
    saveLocal(lsKey(mode, "practice", k), {
      words: newWords, attempts: [], status: "playing",
    });
  };
  const backToDaily = () => setKind("daily");
  const changeMode = (m: GameMode) => {
    setMode(m);
    setKind("daily");
  };

  const giveHint = async () => {
    if (gaveHint || status !== "won" || mode !== "single" || kind !== "daily" || !otherPartnerName) return;
    setGaveHint(true);
    saveLocal(lsK, { attempts, status, hintLetter, gaveHint: true });
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
    showMessage(`💡 dica enviada pro ${otherPartnerName.toLowerCase()}`);
    await Promise.all([
      supabase.from("word_game_daily")
        .update({ gave_hint: true })
        .eq("game_date", today)
        .ilike("partner_name", partnerName.toLowerCase()),
      supabase.from("word_game_daily").upsert({
        partner_name: otherPartnerName.toLowerCase(),
        game_date: today,
        word: target,
        received_hint_letter: letter,
      }, { onConflict: "partner_name,game_date" }),
    ]);
  };

  const otherCopy =
    kind === "practice"
      ? "modo treino"
      : mode !== "single"
        ? "modo competitivo só na palavrinha"
        : `${otherPartnerName ? otherPartnerName.toLowerCase() : "parceiro"}: ${
            otherStatus?.status === "won" ? `acertou em ${otherStatus.attempts}!`
            : otherStatus?.status === "lost" ? "não conseguiu"
            : "ainda jogando"
          }`;

  // ---------- cell sizing fluido — adaptativo mobile ↔ desktop ----------
  // Estratégia: width do grid via min(vw,px) E altura do main controla via clamp.
  // Quarteto precisa caber 9 rows × 2 grids verticalmente — limito o grid pelo MENOR
  // entre largura disponível e altura disponível.
  const gridConfig = mode === "single"
    ? {
        // single: 1 grid, 6 rows. Altura é folgada → escala pela largura.
        gridWidth: "min(86vw, 360px)",
        gap: 6,
        fontSize: "clamp(1.4rem, 5vw, 2.2rem)",
      }
    : mode === "duo"
      ? {
          // duo: 2 grids lado a lado, 7 rows. Largura é o gargalo.
          gridWidth: "min(44vw, 240px)",
          gap: 5,
          fontSize: "clamp(0.95rem, 3vw, 1.5rem)",
        }
      : {
          // quarteto: 2x2 grids, 9 rows. ALTURA é o gargalo no mobile.
          // Limito por min() entre largura (44vw) e altura disponível por linha.
          // ~9 rows + 8 gaps + padding precisa caber em ~50% da altura disponível.
          // 5vh por row * 9 = 45vh; cell width = 5vh; total grid width = 25vh + 4 gaps.
          gridWidth: "min(44vw, 22vh, 200px)",
          gap: 3,
          fontSize: "clamp(0.7rem, min(2.4vw, 2.2vh), 1.2rem)",
        };
  const cellGap = gridConfig.gap;
  const fontSize = gridConfig.fontSize;
  const gridWidth = gridConfig.gridWidth;

  // título grande — nomenclatura própria do casal
  const modeTitle = mode === "single" ? "PALAVRINHA" : mode === "duo" ? "DUPLINHA" : "QUADRINHA";

  // Container adaptativo: mobile fullscreen / desktop até ~960px (cabem 4 grids confortáveis)
  return (
    <div className="game-container relative mx-auto flex h-[100dvh] w-full max-w-[960px] flex-col overflow-hidden bg-gradient-to-b from-[#1C2638] to-[#0E1117] text-foreground">
      {/* HEADER — minimal: voltar | título grande | toggle treino */}
      <header className="relative flex flex-shrink-0 items-center justify-between px-3 pt-3 pb-1">
        <Link
          to="/"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/5 text-sm text-muted-foreground ring-1 ring-white/10 transition active:scale-95"
          aria-label="voltar"
        >
          ←
        </Link>

        <h1 className="font-display text-lg font-black tracking-[0.06em] text-foreground sm:text-2xl">
          {modeTitle}
        </h1>

        <button
          onClick={kind === "daily" ? startNewPractice : backToDaily}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-white/5 text-sm ring-1 ring-white/10 transition active:scale-95"
          title={kind === "daily" ? "modo treino" : "voltar pra do dia"}
          aria-label={kind === "daily" ? "modo treino" : "voltar pra do dia"}
        >
          {kind === "daily" ? "🎲" : "📅"}
        </button>

        {/* Bursts */}
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

      {/* MODE PICKER — tabs discretas abaixo do título */}
      <div className="flex flex-shrink-0 items-center justify-center gap-1 px-3 pt-1">
        {(Object.keys(MODE_CONFIG) as GameMode[]).map((m) => {
          const c = MODE_CONFIG[m];
          const active = m === mode;
          return (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                active
                  ? "bg-pink/20 text-pink ring-1 ring-pink/40"
                  : "text-muted-foreground/60 hover:text-muted-foreground"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* SUBTITLE — status do parceiro */}
      <p className="flex-shrink-0 px-3 pt-1 text-center text-[10px] leading-tight text-muted-foreground/70">
        {otherCopy}
      </p>

      {/* MENSAGEM TEMPORÁRIA */}
      <div className="flex-shrink-0 px-2" style={{ minHeight: 18 }}>
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
      {hintLetter && status === "playing" && mode === "single" && (
        <div className="mx-3 mb-1 flex-shrink-0 rounded-lg bg-pink/10 p-1.5 text-center text-[11px] ring-1 ring-pink/30">
          💡 dica do {(otherPartnerName || "parceiro").toLowerCase()}: letra{" "}
          <span className="font-bold text-pink">{hintLetter.toUpperCase()}</span>
        </div>
      )}

      {/* GRIDS — single: 1 col centralizado | duo: 2 lado a lado | quarteto: 2x2 */}
      <main className="game-main flex flex-1 items-start justify-center overflow-y-auto px-2 py-2 min-h-0">
        <div
          className={`grid w-full justify-center ${shake ? "animate-shake" : ""}`}
          style={{
            gridTemplateColumns:
              mode === "single" ? "1fr" : "repeat(2, max-content)",
            gap: mode === "quartet" ? 16 : 12,
            justifyItems: "center",
          }}
        >
          {words.map((w, wi) => (
            <WordGrid
              key={wi}
              wordIndex={wi}
              total={words.length}
              attempts={attempts}
              evaluations={allEvaluations[wi]}
              solved={solvedFlags[wi]}
              maxAttempts={maxAttempts}
              cells={cells}
              activeColumn={activeColumn}
              isPlaying={status === "playing"}
              gridWidth={gridWidth}
              cellGap={cellGap}
              fontSize={fontSize}
              onTileTap={handleTileTap}
            />
          ))}
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
            words={words}
            solvedFlags={solvedFlags}
            attempts={attempts.length}
            mode={mode}
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
// WordGrid — uma palavra (5 cols × maxAttempts rows)
// Largura fixa via gridWidth → tiles dividem o espaço uniformemente.
// ============================================================
function WordGrid({
  wordIndex, total, attempts, evaluations, solved, maxAttempts,
  cells, activeColumn, isPlaying, gridWidth, cellGap, fontSize, onTileTap,
}: {
  wordIndex: number; total: number;
  attempts: string[]; evaluations: EvaluatedGuess[]; solved: boolean;
  maxAttempts: number;
  cells: string[]; activeColumn: number; isPlaying: boolean;
  gridWidth: string; cellGap: number; fontSize: string;
  onTileTap: (col: number) => void;
}) {
  const evCount = evaluations.length;
  return (
    <div
      className={`relative flex flex-col rounded-md p-1 transition-all ${
        solved ? "bg-emerald-500/10 ring-1 ring-emerald-500/30" : ""
      }`}
      style={{ gap: cellGap, width: gridWidth }}
    >
      {Array.from({ length: maxAttempts }).map((_, row) => {
        const ev = evaluations[row];
        const isCurrentRow = isPlaying && !solved && row === attempts.length;
        return (
          <div key={row} className="flex w-full" style={{ gap: cellGap }}>
            {Array.from({ length: WORD_LENGTH }).map((_, col) => {
              const ch = ev
                ? ev.letters[col].char
                : isCurrentRow
                  ? cells[col] ?? ""
                  : "";
              const cellStatus: CellStatus = ev ? ev.letters[col].status : "empty";
              const isActive = isCurrentRow && col === activeColumn;
              return (
                <Tile
                  key={col}
                  char={ch}
                  status={cellStatus}
                  filled={!!ch && !ev}
                  active={isActive}
                  revealing={ev !== undefined && row === evCount - 1}
                  delay={col * 0.1}
                  fontSize={fontSize}
                  clickable={isCurrentRow}
                  onClick={isCurrentRow ? () => onTileTap(col) : undefined}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
function Tile({
  char, status, filled, active, revealing, delay, fontSize, clickable, onClick,
}: {
  char: string; status: CellStatus; filled: boolean; active: boolean;
  revealing: boolean; delay: number; fontSize: string;
  clickable: boolean; onClick?: () => void;
}) {
  const colorByStatus: Record<CellStatus, string> = {
    correct: "bg-[#36A269] border-[#36A269] text-white",
    present: "bg-[#D6A23D] border-[#D6A23D] text-white",
    absent:  "bg-[#3F4550] border-[#3F4550] text-white",
    empty:   filled
      ? "bg-white/5 border-white/45 text-foreground"
      : "bg-white/5 border-white/15 text-foreground",
  };
  const activeRing = active ? "ring-2 ring-pink ring-offset-1 ring-offset-[#0E1117]" : "";
  const cls = `${colorByStatus[status]} ${activeRing} ${clickable ? "cursor-pointer" : ""}`;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      key={revealing ? `rev-${delay}` : undefined}
      initial={revealing ? { rotateX: 0 } : filled ? { scale: 1 } : false}
      animate={
        revealing ? { rotateX: [0, 90, 0] }
        : filled ? { scale: [1, 1.06, 1] }
        : {}
      }
      transition={
        revealing ? { duration: 0.45, delay, times: [0, 0.5, 1] }
        : filled ? { duration: 0.16, ease: "easeOut" }
        : {}
      }
      className={`flex flex-1 min-w-0 aspect-square items-center justify-center rounded-lg border-2 font-display font-extrabold uppercase shadow-sm transition-all ${cls}`}
      style={{ fontSize }}
      tabIndex={-1}
    >
      {char}
    </motion.button>
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
      style={{ marginInline: "auto", width: "min(96vw, 720px)" }}
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
      style={{ height: 44, fontSize: "clamp(0.8rem, 3.2vw, 0.95rem)", minWidth: 0 }}
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
      style={{ height: 44, fontSize: "clamp(0.65rem, 2.4vw, 0.8rem)", padding: "0 8px", minWidth: 52 }}
    >
      {label}
    </button>
  );
}

// ============================================================
function ResultModal({
  status, words, solvedFlags, attempts, mode, kind, otherPartnerName, gaveHint, onPlayAgain, onGiveHint,
}: {
  status: "won" | "lost"; words: string[]; solvedFlags: boolean[];
  attempts: number; mode: GameMode; kind: "daily" | "practice";
  otherPartnerName: string; gaveHint: boolean;
  onPlayAgain: () => void; onGiveHint: () => void;
}) {
  const isWon = status === "won";
  const cfg = MODE_CONFIG[mode];
  const reward = mode === "single"
    ? calculateReward(attempts, status)
    : isWon ? rewardForGame(mode, attempts) : { xp: 3, happiness: 3 };
  const unsolvedWords = words.filter((_, i) => !solvedFlags[i]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-6"
    >
      <motion.div
        initial={{ y: 30, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className="w-full max-w-sm rounded-3xl border border-white/15 bg-[#151B26] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
      >
        <div className="mb-2 text-3xl">{isWon ? "💗" : "🥺"}</div>
        <h2 className="font-display text-xl font-extrabold">
          {isWon ? "você acertou!" : "fim de jogo"}
        </h2>
        {isWon ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {cfg.wordCount > 1 ? `as ${cfg.wordCount} palavras` : "tentativas"}: <span className="font-bold text-foreground">{attempts}/{cfg.maxAttempts}</span>
            <br />
            o pet ganhou carinho extra hoje 💗
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            {unsolvedWords.length === 1 ? "a palavra era " : "faltavam "}
            <span className="font-bold text-pink">{unsolvedWords.map((w) => w.toUpperCase()).join(", ")}</span>
            <br />
            o pet quer tentar de novo 🥺
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
          {isWon && mode === "single" && kind === "daily" && otherPartnerName && !gaveHint && (
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
