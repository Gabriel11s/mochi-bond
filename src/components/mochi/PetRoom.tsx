import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type {
  PetState,
  FoodItem,
  Interaction,
  Mood,
} from "@/lib/mochi-types";
import { computeMood, moodCopy, RARITY_XP, clamp, timeAgo } from "@/lib/mochi-types";
import { Mochi } from "./Mochi";
import { StatusBars } from "./StatusBars";
import { FoodDrawer } from "./FoodDrawer";
import { InteractionHistory } from "./InteractionHistory";
import { FloatingHearts } from "./FloatingHearts";
import { OutfitDrawer } from "./OutfitDrawer";
import { useTheme } from "@/hooks/use-theme";
import {
  type Outfit,
  type OutfitItemId,
  loadOutfit,
  saveOutfit,
  loadEnabled,
  saveEnabled,
} from "@/lib/mochi-outfit";
import { type MochiTheme, loadMochiTheme, saveMochiTheme } from "@/lib/mochi-theme";

interface Props {
  partnerName: string;
  onLogout: () => void;
  onSwitchPartner: (name: string) => void;
}

let particleId = 0;

export function PetRoom({ partnerName, onLogout, onSwitchPartner }: Props) {
  const [partners, setPartners] = useState<[string, string]>(["Gab", "Tita"]);
  const [pet, setPet] = useState<PetState | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<Interaction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [outfitOpen, setOutfitOpen] = useState(false);
  const [outfit, setOutfit] = useState<Outfit>(() => loadOutfit());
  const [enabledItems, setEnabledItems] = useState<Set<OutfitItemId>>(() =>
    loadEnabled(),
  );
  const [mochiTheme, setMochiTheme] = useState<MochiTheme>(() => loadMochiTheme());
  const updateMochiTheme = (t: MochiTheme) => {
    setMochiTheme(t);
    saveMochiTheme(t);
  };
  const [busy, setBusy] = useState(false);
  const [eating, setEating] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const { theme, toggle } = useTheme();
  const flightRef = useRef<{ id: number; emoji: string } | null>(null);
  const [flight, setFlight] = useState<{ id: number; emoji: string } | null>(null);

  const updateOutfit = (next: Outfit) => {
    setOutfit(next);
    saveOutfit(next);
  };

  const toggleItemEnabled = (id: OutfitItemId) => {
    setEnabledItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Se a peça desabilitada estava em uso, volta pra "none" da categoria.
        const fallback: Outfit = { ...outfit };
        if (outfit.hat === (id as Outfit["hat"])) fallback.hat = "none";
        if (outfit.bow === (id as Outfit["bow"])) fallback.bow = "none";
        if (outfit.glasses === (id as Outfit["glasses"])) fallback.glasses = "none";
        if (outfit.shirt === (id as Outfit["shirt"])) fallback.shirt = "none";
        if (
          fallback.hat !== outfit.hat ||
          fallback.bow !== outfit.bow ||
          fallback.glasses !== outfit.glasses ||
          fallback.shirt !== outfit.shirt
        ) {
          updateOutfit(fallback);
        }
      } else {
        next.add(id);
      }
      saveEnabled(next);
      return next;
    });
  };

  // initial load + realtime
  useEffect(() => {
    const load = async () => {
      const [{ data: petData }, { data: foodData }, { data: histData }, { data: settings }] = await Promise.all([
        supabase.from("pet_state").select("*").eq("id", 1).single(),
        supabase.from("food_items").select("*").eq("is_active", true).order("rarity"),
        supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("couple_settings").select("partner_one_name, partner_two_name").eq("id", 1).single(),
      ]);
      if (petData) setPet(petData as PetState);
      if (foodData) setFoods(foodData as FoodItem[]);
      if (histData) setHistory(histData as Interaction[]);
      if (settings) setPartners([settings.partner_one_name, settings.partner_two_name]);
    };
    load();

    const ch = supabase
      .channel("mochi-room")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pet_state" }, (p) => {
        setPet(p.new as PetState);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "interactions" }, (p) => {
        setHistory((h) => [p.new as Interaction, ...h].slice(0, 20));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // passive decay (visual only) — also re-renders mood copy
  useEffect(() => {
    const t = setInterval(() => {
      setPet((p) => p && { ...p });
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const burstParticles = (emoji: string, count = 6) => {
    const newOnes = Array.from({ length: count }).map(() => ({
      id: ++particleId,
      emoji,
      x: 30 + Math.random() * 40,
    }));
    setParticles((p) => [...p, ...newOnes]);
    window.setTimeout(() => {
      setParticles((p) => p.filter((x) => !newOnes.find((n) => n.id === x.id)));
    }, 1700);
  };

  const feed = async (food: FoodItem) => {
    if (!pet || busy) return;
    setBusy(true);
    setDrawerOpen(false);

    // food flight animation
    flightRef.current = { id: ++particleId, emoji: food.emoji };
    setFlight(flightRef.current);
    await new Promise((r) => setTimeout(r, 600));
    setFlight(null);

    // eat animation
    setEating(true);
    await new Promise((r) => setTimeout(r, 600));

    const xpGain = RARITY_XP[food.rarity];
    const newHunger = clamp(pet.hunger + food.hunger_value);
    const newHappiness = clamp(pet.happiness + food.happiness_value);
    const newEnergy = clamp(pet.energy + food.energy_value);
    const newXp = pet.xp + xpGain;
    const newLevel = Math.floor(newXp / 100) + 1;
    const newMood: Mood = computeMood(newHunger, newHappiness, newEnergy);
    const leveled = newLevel > pet.level;

    const now = new Date().toISOString();

    const { error: petErr } = await supabase
      .from("pet_state")
      .update({
        hunger: newHunger,
        happiness: newHappiness,
        energy: newEnergy,
        xp: newXp,
        level: newLevel,
        current_mood: newMood,
        last_fed_at: now,
        last_interaction_at: now,
        last_interaction_by: partnerName,
        updated_at: now,
      })
      .eq("id", 1);

    if (petErr) {
      console.error(petErr);
      showToast("algo deu errado 🥺");
      setEating(false);
      setBusy(false);
      return;
    }

    await supabase.from("interactions").insert({
      partner_name: partnerName,
      interaction_type: "feed",
      food_id: food.id,
      food_name: food.name,
      food_emoji: food.emoji,
      hunger_delta: food.hunger_value,
      happiness_delta: food.happiness_value,
      energy_delta: food.energy_value,
      xp_delta: xpGain,
      message: `Ele amou ${food.name.toLowerCase()}`,
    });

    setEating(false);
    setBouncing(true);
    burstParticles("💗", 5);
    showToast(`ele amou ${food.name.toLowerCase()} ${food.emoji}`);
    if (leveled) {
      setLevelUp(true);
      window.setTimeout(() => setLevelUp(false), 2400);
      burstParticles("✨", 12);
    }
    window.setTimeout(() => setBouncing(false), 700);
    setBusy(false);
  };

  const pet_action = async (type: "pet" | "play") => {
    if (!pet || busy) return;
    setBusy(true);
    setBouncing(true);
    burstParticles(type === "pet" ? "💗" : "✨", 5);
    const dHappy = type === "pet" ? 8 : 12;
    const dEnergy = type === "pet" ? 0 : -10;
    const xp = 3;
    const newHunger = pet.hunger;
    const newHappiness = clamp(pet.happiness + dHappy);
    const newEnergy = clamp(pet.energy + dEnergy);
    const newXp = pet.xp + xp;
    const newLevel = Math.floor(newXp / 100) + 1;
    const now = new Date().toISOString();

    await supabase
      .from("pet_state")
      .update({
        happiness: newHappiness,
        energy: newEnergy,
        xp: newXp,
        level: newLevel,
        current_mood: computeMood(newHunger, newHappiness, newEnergy),
        last_interaction_at: now,
        last_interaction_by: partnerName,
        updated_at: now,
      })
      .eq("id", 1);

    await supabase.from("interactions").insert({
      partner_name: partnerName,
      interaction_type: type,
      happiness_delta: dHappy,
      energy_delta: dEnergy,
      xp_delta: xp,
      message: type === "pet" ? "carinho cheio de amor" : "uma brincadeirinha rápida",
    });

    showToast(type === "pet" ? "ele ronronou de felicidade 💗" : "ele se divertiu muito ✨");
    window.setTimeout(() => setBouncing(false), 700);
    setBusy(false);
  };

  if (!pet) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        abrindo o cantinho…
      </div>
    );
  }

  const mood: Mood = eating ? "eating" : (pet.current_mood as Mood);
  const xpInLevel = pet.xp % 100;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-6">
      {/* top bar */}
      <header className="flex items-center justify-between gap-2">
        <button
          onClick={onLogout}
          className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm"
          aria-label="sair"
          title="sair"
        >
          ←
        </button>

        {/* partner switcher: who is caring right now */}
        <div className="glass flex items-center gap-1 rounded-full p-1">
          <span className="px-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            cuidando
          </span>
          {partners.map((name) => {
            const active = name === partnerName;
            return (
              <button
                key={name}
                onClick={() => !active && onSwitchPartner(name)}
                className={`rounded-full px-3 py-1.5 text-xs font-display font-bold transition-all ${
                  active
                    ? "bg-gradient-to-r from-pink to-lilac text-white shadow-[var(--shadow-glow)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {name.toLowerCase()}
              </button>
            );
          })}
        </div>

        <button
          onClick={toggle}
          className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base"
          aria-label="trocar tema"
        >
          {theme === "dark" ? "🌙" : "☀️"}
        </button>
      </header>

      {/* pet name & mood */}
      <div className="mt-6 text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight">{pet.pet_name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{moodCopy(mood)}</p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs">
          <span className="font-bold text-pink">nível {pet.level}</span>
          <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-pink to-lilac transition-all"
              style={{ width: `${xpInLevel}%` }}
            />
          </span>
          <span className="tabular-nums text-muted-foreground">{xpInLevel}/100</span>
        </div>
      </div>

      {/* mochi scene */}
      <div className="relative mt-2 flex justify-center">
        <FloatingHearts particles={particles} />
        <Mochi mood={mood} eating={eating} bouncing={bouncing} outfit={outfit} />

        {/* food flight */}
        <AnimatePresence>
          {flight && (
            <motion.div
              key={flight.id}
              initial={{ y: 200, scale: 1.4, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-5xl"
            >
              {flight.emoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* level up overlay */}
        <AnimatePresence>
          {levelUp && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="rounded-full bg-gradient-to-r from-pink to-lilac px-6 py-2 font-display text-xl font-bold text-white shadow-[var(--shadow-glow)]">
                ✨ subiu de nível ✨
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* status bars */}
      <div className="glass mt-2 rounded-3xl p-5">
        <StatusBars hunger={pet.hunger} happiness={pet.happiness} energy={pet.energy} />
      </div>

      {/* primary actions */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          disabled={busy}
          className="col-span-3 rounded-2xl bg-gradient-to-r from-pink to-lilac px-5 py-4 font-display text-lg font-bold text-white shadow-[var(--shadow-glow)] transition-all active:scale-[0.97] disabled:opacity-50"
        >
          🍙 alimentar
        </button>
        <button
          onClick={() => pet_action("pet")}
          disabled={busy}
          className="glass rounded-2xl px-3 py-3 font-display text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
        >
          💗 carinho
        </button>
        <button
          onClick={() => pet_action("play")}
          disabled={busy || pet.energy < 10}
          className="glass rounded-2xl px-3 py-3 font-display text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
        >
          🎈 brincar
        </button>
        <button
          onClick={() => setOutfitOpen(true)}
          className="glass rounded-2xl px-3 py-3 font-display text-sm font-semibold transition-all active:scale-[0.97]"
        >
          👕 vestir
        </button>
      </div>

      {/* last care */}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        último cuidado:{" "}
        {pet.last_interaction_by ? (
          <>
            <span className="text-foreground/80">{pet.last_interaction_by}</span>{" "}
            {timeAgo(pet.last_interaction_at)}
          </>
        ) : (
          "ainda ninguém apareceu hoje"
        )}
      </div>

      {/* history */}
      <div className="mt-6">
        <InteractionHistory interactions={history} />
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="glass-strong fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* food drawer */}
      <FoodDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        foods={foods}
        onPick={feed}
        busy={busy}
      />

      {/* outfit drawer */}
      <OutfitDrawer
        open={outfitOpen}
        outfit={outfit}
        enabled={enabledItems}
        onChange={updateOutfit}
        onToggleEnabled={toggleItemEnabled}
        onClose={() => setOutfitOpen(false)}
      />
    </div>
  );
}
