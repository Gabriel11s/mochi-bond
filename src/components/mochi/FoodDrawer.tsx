import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FoodItem, Rarity, PantryItem } from "@/lib/mochi-types";

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

interface PantryEntry {
  pantryId: string | null; // null se for starter
  food: FoodItem;
  count: number; // quantos exemplares em despensa
}

interface Props {
  open: boolean;
  onClose: () => void;
  partnerName: string;
  petName: string;
  /** chamado com { food, pantryItemId | null } */
  onPick: (entry: { food: FoodItem; pantryItemId: string | null }) => void;
  busy?: boolean;
  onOpenQuests?: () => void;
}

export function FoodDrawer({ open, onClose, partnerName, onPick, busy, onOpenQuests }: Props) {
  const [tab, setTab] = useState<"pantry" | "starters">("pantry");
  const [pantryEntries, setPantryEntries] = useState<PantryEntry[]>([]);
  const [starters, setStarters] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pantry }, { data: foods }] = await Promise.all([
      supabase
        .from("pantry_items")
        .select("*")
        .eq("partner_name", partnerName)
        .eq("consumed", false)
        .order("created_at", { ascending: false }),
      supabase.from("food_items").select("*").eq("is_active", true),
    ]);

    const allFoods = (foods ?? []) as FoodItem[];
    const foodById = new Map(allFoods.map((f) => [f.id, f]));

    // group pantry by food_id
    const groups = new Map<string, PantryEntry>();
    for (const p of (pantry ?? []) as PantryItem[]) {
      const food = foodById.get(p.food_id);
      if (!food) continue;
      const existing = groups.get(p.food_id);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(p.food_id, { pantryId: p.id, food, count: 1 });
      }
    }
    setPantryEntries([...groups.values()]);

    setStarters(allFoods.filter((f) => f.is_unlockable === false));
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    load();

    const ch = supabase
      .channel(`pantry-${partnerName}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pantry_items", filter: `partner_name=eq.${partnerName}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnerName]);

  const renderFoodCard = (food: FoodItem, opts: { count?: number; pantryId: string | null }) => (
    <motion.button
      key={`${food.id}-${opts.pantryId ?? "starter"}`}
      whileTap={{ scale: 0.94 }}
      whileHover={{ y: -2 }}
      disabled={busy}
      onClick={() => onPick({ food, pantryItemId: opts.pantryId })}
      className={`glass group relative flex flex-col items-center gap-2 rounded-2xl p-4 text-center ring-2 ring-inset transition-all disabled:opacity-50 ${
        RARITY_RING[food.rarity]
      }`}
    >
      <span className="text-5xl">{food.emoji}</span>
      <span className="font-display text-sm font-semibold">{food.name}</span>
      <div className="flex flex-wrap justify-center gap-1 text-[10px] font-medium text-muted-foreground">
        {food.hunger_value > 0 && <span>🍙+{food.hunger_value}</span>}
        {food.happiness_value > 0 && <span>💗+{food.happiness_value}</span>}
        {food.energy_value > 0 && <span>✨+{food.energy_value}</span>}
      </div>
      {food.rarity !== "common" && (
        <span className="absolute left-2 top-2 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-foreground/80">
          {RARITY_LABEL[food.rarity]}
        </span>
      )}
      {opts.count && opts.count > 1 && (
        <span className="absolute right-2 top-2 rounded-full bg-pink px-2 py-0.5 text-[10px] font-bold text-white">
          ×{opts.count}
        </span>
      )}
    </motion.button>
  );

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
            className="glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <div className="px-6 pt-3 pb-2">
              <h3 className="font-display text-2xl font-bold">Despensa de {partnerName.toLowerCase()}</h3>
              <p className="text-sm text-muted-foreground">Escolha o que oferecer ao Mochi</p>
            </div>

            {/* tabs */}
            <div className="mx-6 mt-2 flex rounded-full bg-white/5 p-1">
              <button
                onClick={() => setTab("pantry")}
                className={`flex-1 rounded-full py-2 text-sm font-display font-semibold transition-all ${
                  tab === "pantry" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                }`}
              >
                🎁 conquistadas ({pantryEntries.reduce((s, e) => s + e.count, 0)})
              </button>
              <button
                onClick={() => setTab("starters")}
                className={`flex-1 rounded-full py-2 text-sm font-display font-semibold transition-all ${
                  tab === "starters" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                }`}
              >
                🌱 básicas
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto px-6 pb-6 pt-4 sm:grid-cols-3">
              {loading && <p className="col-span-full text-center text-sm text-muted-foreground">carregando…</p>}

              {!loading && tab === "pantry" && pantryEntries.length === 0 && (
                <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl bg-white/5 px-6 py-10 text-center">
                  <span className="text-5xl">🎯</span>
                  <p className="font-display text-base font-semibold">sua despensa tá vazia</p>
                  <p className="text-xs text-muted-foreground">
                    cumpra missões pra desbloquear comidinhas — ou use as básicas enquanto isso
                  </p>
                  {onOpenQuests && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenQuests();
                      }}
                      className="mt-2 rounded-full bg-gradient-to-r from-pink to-lilac px-5 py-2 font-display text-sm font-bold text-white shadow-[var(--shadow-glow)]"
                    >
                      ver missões
                    </button>
                  )}
                </div>
              )}

              {!loading &&
                tab === "pantry" &&
                pantryEntries.map((e) =>
                  renderFoodCard(e.food, { count: e.count, pantryId: e.pantryId }),
                )}

              {!loading &&
                tab === "starters" &&
                starters.map((f) => renderFoodCard(f, { pantryId: null }))}

              {!loading && tab === "starters" && starters.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground">
                  sem básicas configuradas
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
