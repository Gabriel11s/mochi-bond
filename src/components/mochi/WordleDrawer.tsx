// Caça-palavras diário (estilo Termo) — competitivo entre o casal,
// cooperativo só na dica que o vencedor pode dar pro outro.
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  MAX_ATTEMPTS,
  WORD_LENGTH,
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

interface WordGameRow {
  partner_name: string;
  game_date: string;
  word: string;
  attempts: string[];
  attempts_count: number;
  won: boolean;
  finished: boolean;
  received_hint_letter: string | null;
  gave_hint: boolean;
  completed_at: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  otherPartnerName: string;
  /** Recompensa quando o jogador acerta — chamado uma vez. */
  onWin?: (xp: number, happiness: number) => void;
}

const KB_ROW1 = ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"];
const KB_ROW2 = ["a", "s", "d", "f", "g", "h", "j", "k", "l"];
const KB_ROW3 = ["z", "x", "c", "v", "b", "n", "m"];

export function WordleDrawer({
  open,
  onOpenChange,
  partnerName,
  otherPartnerName,
  onWin,
}: Props) {
  const today = useMemo(() => getTodayKey(), []);
  const dailyWord = useMemo(() => getDailyWord(), []);

  const [attempts, setAttempts] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [hintLetter, setHintLetter] = useState<string | null>(null);
  const [gaveHint, setGaveHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otherStatus, setOtherStatus] = useState<{
    finished: boolean;
    won: boolean;
    attempts: number;
  } | null>(null);

  // Carrega estado salvo (se já jogou hoje) + estado do parceiro
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("word_game_daily")
        .select("*")
        .eq("game_date", today)
        .in("partner_name", [partnerName, otherPartnerName]);
      if (cancelled || !data) return;
      const mine = (data as WordGameRow[]).find(
        (r) => r.partner_name.toLowerCase() === partnerName.toLowerCase(),
      );
      const other = (data as WordGameRow[]).find(
        (r) => r.partner_name.toLowerCase() === otherPartnerName.toLowerCase(),
      );
      if (mine) {
        setAttempts(mine.attempts ?? []);
        setFinished(mine.finished);
        setWon(mine.won);
        setHintLetter(mine.received_hint_letter ?? null);
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
  }, [open, today, partnerName, otherPartnerName]);

  // Realtime: parceiro completou ou recebi uma dica
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel("word-game-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "word_game_daily" },
        (payload) => {
          const row = payload.new as WordGameRow;
          if (!row || row.game_date !== today) return;
          if (row.partner_name.toLowerCase() === otherPartnerName.toLowerCase()) {
            setOtherStatus({
              finished: row.finished,
              won: row.won,
              attempts: row.attempts_count,
            });
          }
          if (row.partner_name.toLowerCase() === partnerName.toLowerCase()) {
            // Pode ter recebido uma dica
            if (row.received_hint_letter && !hintLetter) {
              setHintLetter(row.received_hint_letter);
            }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, today, partnerName, otherPartnerName, hintLetter]);

  // Avaliações de todas as tentativas (cores das células)
  const evaluations: EvaluatedGuess[] = useMemo(
    () => attempts.map((a) => evaluateGuess(a, dailyWord)),
    [attempts, dailyWord],
  );
  const keyboardStatus = useMemo(() => aggregateKeyboardStatus(evaluations), [evaluations]);

  const flashError = useCallback((msg: string) => {
    setError(msg);
    setShake(true);
    window.setTimeout(() => setShake(false), 350);
    window.setTimeout(() => setError(null), 1800);
  }, []);

  // Persiste no banco — UPSERT por (partner_name, game_date)
  const persist = async (
    nextAttempts: string[],
    isWon: boolean,
    isFinished: boolean,
  ) => {
    await (supabase as any)
      .from("word_game_daily")
      .upsert(
        {
          partner_name: partnerName,
          game_date: today,
          word: dailyWord,
          attempts: nextAttempts,
          attempts_count: nextAttempts.length,
          won: isWon,
          finished: isFinished,
          completed_at: isFinished ? new Date().toISOString() : null,
        },
        { onConflict: "partner_name,game_date" },
      );
  };

  const submitGuess = async () => {
    if (busy || finished) return;
    if (current.length !== WORD_LENGTH) {
      flashError(`a palavra tem ${WORD_LENGTH} letras`);
      return;
    }
    setBusy(true);
    const guess = normalize(current);
    const ev = evaluateGuess(guess, dailyWord);
    const newAttempts = [...attempts, guess];
    const isWon = ev.isCorrect;
    const isFinished = isWon || newAttempts.length >= MAX_ATTEMPTS;

    setAttempts(newAttempts);
    setCurrent("");
    setFinished(isFinished);
    setWon(isWon);

    try {
      await persist(newAttempts, isWon, isFinished);
      if (isWon) {
        const reward = rewardForAttempts(newAttempts.length);
        onWin?.(reward.xp, reward.happiness);
      }
    } catch (e) {
      console.error("word_game persist error:", e);
    } finally {
      setBusy(false);
    }
  };

  const onKeyPress = (key: string) => {
    if (finished || busy) return;
    if (key === "ENTER") return submitGuess();
    if (key === "BACK") return setCurrent((c) => c.slice(0, -1));
    if (current.length >= WORD_LENGTH) return;
    if (!/^[a-z]$/.test(key)) return;
    setCurrent((c) => c + key);
  };

  // Teclado físico também
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") return onKeyPress("ENTER");
      if (e.key === "Backspace") return onKeyPress("BACK");
      if (e.key.length === 1) return onKeyPress(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finished, busy, current, attempts]); // eslint-disable-line react-hooks/exhaustive-deps

  const giveHint = async () => {
    if (gaveHint || !won) return;
    setGaveHint(true);
    // Letras já descobertas pelo parceiro — pra não dar uma que ele já tem
    const { data: otherRow } = await (supabase as any)
      .from("word_game_daily")
      .select("attempts")
      .eq("game_date", today)
      .ilike("partner_name", otherPartnerName)
      .maybeSingle();
    const otherAttempts: string[] = otherRow?.attempts ?? [];
    const known = new Set<string>();
    for (const a of otherAttempts) {
      const ev = evaluateGuess(a, dailyWord);
      for (const cell of ev.letters) {
        if (cell.status !== "absent") known.add(cell.char);
      }
    }
    const letter = pickHintLetter(dailyWord, known);
    if (!letter) return;

    // Marca minha row como "gave_hint" e cria/atualiza a do parceiro
    await Promise.all([
      (supabase as any)
        .from("word_game_daily")
        .update({ gave_hint: true })
        .eq("game_date", today)
        .ilike("partner_name", partnerName),
      (supabase as any)
        .from("word_game_daily")
        .upsert(
          {
            partner_name: otherPartnerName,
            game_date: today,
            word: dailyWord,
            received_hint_letter: letter,
          },
          { onConflict: "partner_name,game_date" },
        ),
    ]);
  };

  if (!open) return null;

  const otherCopy = otherStatus
    ? otherStatus.finished
      ? otherStatus.won
        ? `${otherPartnerName.toLowerCase()} acertou em ${otherStatus.attempts}! 🎉`
        : `${otherPartnerName.toLowerCase()} não conseguiu hoje 💔`
      : otherStatus.attempts > 0
        ? `${otherPartnerName.toLowerCase()} tá tentando — ${otherStatus.attempts}/6`
        : `${otherPartnerName.toLowerCase()} ainda não jogou`
    : `${otherPartnerName.toLowerCase()} ainda não jogou`;

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
          className="glass-strong w-full max-w-md rounded-t-3xl p-4 pb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">🔤 palavra do dia</h2>
            <button
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground text-lg"
            >
              ✕
            </button>
          </div>

          <p className="mb-2 text-center text-[11px] text-muted-foreground">
            {otherCopy}
          </p>

          {hintLetter && (
            <div className="mb-2 rounded-xl bg-pink/10 p-2 text-center text-xs ring-1 ring-pink/30">
              💡 {otherPartnerName.toLowerCase()} te deu uma dica: a letra{" "}
              <span className="font-bold text-pink">{hintLetter.toUpperCase()}</span>{" "}
              tá na palavra
            </div>
          )}

          {/* Grid de tentativas */}
          <div
            className={`mx-auto my-3 flex flex-col gap-1.5 ${shake ? "animate-shake" : ""}`}
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
                    const status: CellStatus = ev
                      ? ev.letters[col].status
                      : "empty";
                    return (
                      <Cell
                        key={col}
                        char={cellChar}
                        status={status}
                        revealing={ev !== undefined && row === attempts.length - 1}
                        delay={col * 0.08}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mb-2 text-center text-xs text-pink">{error}</p>
          )}

          {/* Estado final */}
          {finished && (
            <div className="mb-3 rounded-2xl bg-white/5 p-3 text-center">
              {won ? (
                <p className="text-sm font-semibold text-emerald-400">
                  🎉 acertou em {attempts.length} tentativa{attempts.length > 1 ? "s" : ""}!
                </p>
              ) : (
                <p className="text-sm">
                  💔 a palavra era{" "}
                  <span className="font-bold text-pink">{dailyWord.toUpperCase()}</span>
                </p>
              )}
              {won && !gaveHint && otherStatus && !otherStatus.finished && (
                <button
                  onClick={giveHint}
                  className="mt-2 rounded-full bg-pink/20 px-4 py-1.5 text-xs font-semibold text-pink transition-all hover:bg-pink/30 active:scale-95"
                >
                  💡 dar dica pro {otherPartnerName.toLowerCase()}
                </button>
              )}
              {gaveHint && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  ✓ dica enviada
                </p>
              )}
            </div>
          )}

          {/* Teclado virtual */}
          {!finished && (
            <div className="space-y-1.5">
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Cell({
  char,
  status,
  revealing,
  delay,
}: {
  char: string;
  status: CellStatus;
  revealing: boolean;
  delay: number;
}) {
  const colors: Record<CellStatus, string> = {
    correct: "bg-emerald-500/90 text-white border-emerald-500",
    present: "bg-yellow-500/90 text-white border-yellow-500",
    absent: "bg-zinc-700/80 text-zinc-300 border-zinc-700",
    empty: char ? "bg-white/5 border-white/30" : "bg-white/5 border-white/15",
  };
  return (
    <motion.div
      initial={revealing ? { rotateX: 0 } : false}
      animate={revealing ? { rotateX: [0, 90, 0] } : {}}
      transition={revealing ? { duration: 0.5, delay, times: [0, 0.5, 1] } : {}}
      className={`flex h-12 w-12 items-center justify-center rounded-md border-2 font-display text-xl font-bold uppercase ${colors[status]}`}
    >
      {char}
    </motion.div>
  );
}

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
    correct: "bg-emerald-500/90 text-white",
    present: "bg-yellow-500/90 text-white",
    absent: "bg-zinc-800 text-zinc-500",
    empty: "bg-white/10 text-foreground hover:bg-white/15",
  };
  const cls = status ? colors[status] : colors.empty;
  return (
    <button
      onClick={onPress}
      className={`h-10 min-w-7 flex-1 rounded-md font-semibold uppercase text-sm transition-colors active:scale-95 ${cls}`}
      style={{ maxWidth: 36 }}
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
      className={`h-10 rounded-md bg-white/10 px-2 text-[11px] font-bold transition-colors hover:bg-white/15 active:scale-95 ${wide ? "min-w-12" : ""}`}
    >
      {label}
    </button>
  );
}
