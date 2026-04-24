import { motion, AnimatePresence } from "framer-motion";
import { BACKGROUNDS, type BackgroundId, getBackground } from "@/lib/mochi-backgrounds";

interface Props {
  open: boolean;
  onClose: () => void;
  current: BackgroundId;
  onSelect: (id: BackgroundId) => void;
}

export function BackgroundDrawer({ open, onClose, current, onSelect }: Props) {
  const currentBg = getBackground(current);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="glass-strong fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[80vh] w-full max-w-md overflow-y-auto rounded-t-3xl px-5 pb-8 pt-4"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="text-center">
              <h2 className="font-display text-xl font-bold">cenários</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                escolha um cantinho pro seu pet — atual: {currentBg.label} {currentBg.emoji}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {BACKGROUNDS.map((bg) => {
                const selected = bg.id === current;
                return (
                  <button
                    key={bg.id}
                    onClick={() => {
                      onSelect(bg.id);
                    }}
                    className={`group relative overflow-hidden rounded-2xl border-2 p-3 text-left transition-all active:scale-[0.97] ${
                      selected
                        ? "border-pink shadow-[var(--shadow-glow)]"
                        : "border-white/10 hover:border-white/30"
                    }`}
                    style={{ background: bg.sky }}
                  >
                    {/* mini chão */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-1/3"
                      style={{ background: bg.floor }}
                    />
                    <div className="relative flex flex-col items-start gap-1">
                      <span className="text-3xl drop-shadow-md">{bg.emoji}</span>
                      <span className="font-display text-sm font-bold text-white drop-shadow-md">
                        {bg.label}
                      </span>
                      <span className="text-[10px] leading-tight text-white/85 drop-shadow">
                        {bg.hint}
                      </span>
                    </div>
                    {selected && (
                      <span className="absolute right-2 top-2 rounded-full bg-pink px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        ✓ ativo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="mt-5 w-full rounded-2xl bg-white/10 py-3 font-display text-sm font-semibold transition-colors hover:bg-white/15"
            >
              fechar
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
