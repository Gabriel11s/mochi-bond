import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { FoodItem, Rarity } from "@/lib/mochi-types";

const CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "frutinhas", label: "Frutinhas" },
  { id: "docinhos", label: "Docinhos" },
  { id: "bebidas", label: "Bebidas" },
  { id: "especiais", label: "Especiais" },
  { id: "raras", label: "Raras" },
];

const RARITY_RING: Record<Rarity, string> = {
  common: "ring-white/10",
  uncommon: "ring-mint/40",
  rare: "ring-pink/50",
  special: "ring-lilac/60",
};

const RARITY_LABEL: Record<Rarity, string> = {
  common: "comum",
  uncommon: "incomum",
  rare: "rara",
  special: "mágica",
};

interface Props {
  open: boolean;
  onClose: () => void;
  foods: FoodItem[];
  onPick: (food: FoodItem) => void;
  busy?: boolean;
}

export function FoodDrawer({ open, onClose, foods, onPick, busy }: Props) {
  const [cat, setCat] = useState("todos");
  const filtered = cat === "todos" ? foods : foods.filter((f) => f.category === cat);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-hidden rounded-t-3xl pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="flex flex-col">
              <div className="flex justify-center pt-3">
                <div className="h-1.5 w-12 rounded-full bg-white/20" />
              </div>

              <div className="px-6 pt-4 pb-2">
                <h3 className="font-display text-2xl font-bold">Escolha uma comidinha</h3>
                <p className="text-sm text-muted-foreground">Ele tá te olhando esperando…</p>
              </div>

              {/* category pills */}
              <div className="flex gap-2 overflow-x-auto px-6 pb-3 pt-2 [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
                    className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                      cat === c.id
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto px-6 pb-8 sm:grid-cols-3">
                {filtered.map((food) => (
                  <motion.button
                    key={food.id}
                    whileTap={{ scale: 0.94 }}
                    whileHover={{ y: -2 }}
                    disabled={busy}
                    onClick={() => onPick(food)}
                    className={`glass group relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center ring-2 ring-inset transition-all disabled:opacity-50 ${RARITY_RING[food.rarity]}`}
                  >
                    <span className="text-5xl">{food.emoji}</span>
                    <span className="font-display text-sm font-semibold">{food.name}</span>
                    <div className="flex flex-wrap justify-center gap-1 text-[10px] font-medium text-muted-foreground">
                      {food.hunger_value > 0 && <span>🍙+{food.hunger_value}</span>}
                      {food.happiness_value > 0 && <span>💗+{food.happiness_value}</span>}
                      {food.energy_value > 0 && <span>✨+{food.energy_value}</span>}
                    </div>
                    {food.rarity !== "common" && (
                      <span className="absolute right-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/80">
                        {RARITY_LABEL[food.rarity]}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
