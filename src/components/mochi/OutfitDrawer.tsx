import { motion, AnimatePresence } from "framer-motion";
import {
  type Outfit,
  HAT_OPTIONS,
  BOW_OPTIONS,
  GLASSES_OPTIONS,
  SHIRT_OPTIONS,
} from "@/lib/mochi-outfit";

interface Props {
  open: boolean;
  outfit: Outfit;
  onChange: (next: Outfit) => void;
  onClose: () => void;
}

export function OutfitDrawer({ open, outfit, onChange, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed bottom-0 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-t-3xl p-5 pb-8"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold">guarda-roupa</h2>
              <button
                onClick={onClose}
                className="rounded-full bg-white/10 px-3 py-1 text-xs"
              >
                fechar
              </button>
            </div>

            <div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
              <Section
                title="chapéu"
                options={HAT_OPTIONS}
                value={outfit.hat}
                onPick={(v) => onChange({ ...outfit, hat: v })}
              />
              <Section
                title="laço"
                options={BOW_OPTIONS}
                value={outfit.bow}
                onPick={(v) => onChange({ ...outfit, bow: v })}
              />
              <Section
                title="óculos"
                options={GLASSES_OPTIONS}
                value={outfit.glasses}
                onPick={(v) => onChange({ ...outfit, glasses: v })}
              />
              <Section
                title="roupinha"
                options={SHIRT_OPTIONS}
                value={outfit.shirt}
                onPick={(v) => onChange({ ...outfit, shirt: v })}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section<T extends string>({
  title,
  options,
  value,
  onPick,
}: {
  title: string;
  options: { id: T; label: string; emoji: string }[];
  value: T;
  onPick: (v: T) => void;
}) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {options.map((opt) => {
          const active = opt.id === value;
          return (
            <button
              key={opt.id}
              onClick={() => onPick(opt.id)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition-all active:scale-95 ${
                active
                  ? "bg-gradient-to-br from-pink/40 to-lilac/40 ring-2 ring-pink"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-[10px] font-medium leading-tight">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
