// Feature #11: Conquistas do Casal — drawer com grid de medalhas
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACHIEVEMENTS, loadUnlocked, type UnlockedAchievement } from "@/lib/mochi-achievements";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AchievementsDrawer({ open, onOpenChange }: Props) {
  const [unlocked, setUnlocked] = useState<Map<string, UnlockedAchievement>>(new Map());

  useEffect(() => {
    if (!open) return;
    loadUnlocked().then(setUnlocked);
  }, [open]);

  if (!open) return null;

  const unlockedCount = unlocked.size;
  const total = ACHIEVEMENTS.length;

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
            <h2 className="font-display text-xl font-bold">🏅 Conquistas</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{unlockedCount}/{total}</span>
              <button onClick={() => onOpenChange(false)} className="text-muted-foreground text-lg">✕</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {ACHIEVEMENTS.map((ach) => {
              const isUnlocked = unlocked.has(ach.key);
              const info = unlocked.get(ach.key);
              return (
                <div
                  key={ach.key}
                  className={`relative flex flex-col items-center rounded-2xl p-3 text-center transition-all ${
                    isUnlocked
                      ? "bg-gradient-to-b from-pink/15 to-lilac/10 ring-1 ring-pink/20 shadow-[0_0_20px_oklch(0.78_0.14_350_/_0.15)]"
                      : "bg-white/5 opacity-40 grayscale"
                  }`}
                >
                  <span className="text-3xl">{ach.emoji}</span>
                  <p className="mt-1 text-[10px] font-semibold leading-tight">{ach.label}</p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground">{ach.description}</p>
                  {isUnlocked && info && (
                    <p className="mt-1 text-[8px] text-pink">
                      ✓ {new Date(info.unlocked_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
