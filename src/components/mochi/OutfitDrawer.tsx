import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type Outfit,
  type OutfitItemId,
  type OutfitOption,
  HAT_OPTIONS,
  BOW_OPTIONS,
  GLASSES_OPTIONS,
  SHIRT_OPTIONS,
} from "@/lib/mochi-outfit";

interface Props {
  open: boolean;
  outfit: Outfit;
  enabled: Set<OutfitItemId>;
  onChange: (next: Outfit) => void;
  onToggleEnabled: (id: OutfitItemId) => void;
  onClose: () => void;
}

export function OutfitDrawer({
  open,
  outfit,
  enabled,
  onChange,
  onToggleEnabled,
  onClose,
}: Props) {
  const [editMode, setEditMode] = useState(false);

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
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl font-bold">guarda-roupa</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditMode((v) => !v)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    editMode
                      ? "bg-pink/40 text-foreground ring-1 ring-pink"
                      : "bg-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                  title="ativar/desativar peças"
                >
                  {editMode ? "✓ editando" : "✏️ gerenciar"}
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs"
                >
                  fechar
                </button>
              </div>
            </div>

            {editMode && (
              <p className="mb-3 rounded-xl bg-pink/10 px-3 py-2 text-[11px] text-muted-foreground">
                toque numa peça pra <strong className="text-foreground">esconder/mostrar</strong> ela do guarda-roupa.
              </p>
            )}

            <div className="max-h-[58vh] space-y-5 overflow-y-auto pr-1">
              <Section
                title="chapéu"
                options={HAT_OPTIONS}
                value={outfit.hat}
                enabled={enabled}
                editMode={editMode}
                onPick={(v) => onChange({ ...outfit, hat: v })}
                onToggleEnabled={onToggleEnabled}
              />
              <Section
                title="laço"
                options={BOW_OPTIONS}
                value={outfit.bow}
                enabled={enabled}
                editMode={editMode}
                onPick={(v) => onChange({ ...outfit, bow: v })}
                onToggleEnabled={onToggleEnabled}
              />
              <Section
                title="óculos"
                options={GLASSES_OPTIONS}
                value={outfit.glasses}
                enabled={enabled}
                editMode={editMode}
                onPick={(v) => onChange({ ...outfit, glasses: v })}
                onToggleEnabled={onToggleEnabled}
              />
              <Section
                title="roupinha"
                options={SHIRT_OPTIONS}
                value={outfit.shirt}
                enabled={enabled}
                editMode={editMode}
                onPick={(v) => onChange({ ...outfit, shirt: v })}
                onToggleEnabled={onToggleEnabled}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section<T extends OutfitItemId>({
  title,
  options,
  value,
  enabled,
  editMode,
  onPick,
  onToggleEnabled,
}: {
  title: string;
  options: OutfitOption<T>[];
  value: T;
  enabled: Set<OutfitItemId>;
  editMode: boolean;
  onPick: (v: T) => void;
  onToggleEnabled: (id: OutfitItemId) => void;
}) {
  // No modo normal escondemos peças desabilitadas (mas sempre mostramos "none").
  const visible = editMode
    ? options
    : options.filter((o) => o.id === "none" || enabled.has(o.id));

  return (
    <div>
      <h3 className="mb-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h3>
      <div className="grid grid-cols-5 gap-2">
        {visible.map((opt) => {
          const active = opt.id === value;
          const isEnabled = opt.id === "none" || enabled.has(opt.id);
          const handleClick = () => {
            if (editMode && opt.id !== "none") {
              onToggleEnabled(opt.id);
            } else {
              onPick(opt.id);
            }
          };
          return (
            <button
              key={opt.id}
              onClick={handleClick}
              className={`relative flex flex-col items-center gap-1 rounded-2xl p-2 text-center transition-all active:scale-95 ${
                active && !editMode
                  ? "bg-gradient-to-br from-pink/40 to-lilac/40 ring-2 ring-pink"
                  : isEnabled
                  ? "bg-white/5 hover:bg-white/10"
                  : "bg-white/5 opacity-40"
              }`}
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span className="text-[10px] font-medium leading-tight">
                {opt.label}
              </span>
              {editMode && opt.id !== "none" && (
                <span
                  className={`absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                    isEnabled
                      ? "bg-mint text-foreground"
                      : "bg-white/20 text-muted-foreground"
                  }`}
                  aria-hidden
                >
                  {isEnabled ? "✓" : "—"}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
