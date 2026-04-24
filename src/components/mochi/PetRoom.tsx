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
import { WardrobeDrawer } from "./WardrobeDrawer";
import { PhotosDrawer, type Photo } from "./PhotosDrawer";
import { QuestsDrawer } from "./QuestsDrawer";
import { MochiSpeechBubble } from "./MochiSpeechBubble";
import { PhotoWall } from "./PhotoWall";
import { partnerKeyFromName, pickGreeting } from "@/lib/mochi-greetings";
import { useTheme } from "@/hooks/use-theme";

interface Props {
  partnerName: string;
  onLogout: () => void;
}

let particleId = 0;

export function PetRoom({ partnerName, onLogout }: Props) {
  const [pet, setPet] = useState<PetState | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<Interaction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [eating, setEating] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [smitten, setSmitten] = useState(false);
  const [shownPhoto, setShownPhoto] = useState<Photo | null>(null);
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const { theme, toggle } = useTheme();
  const flightRef = useRef<{ id: number; emoji: string } | null>(null);
  const [flight, setFlight] = useState<{ id: number; emoji: string } | null>(null);

  const partnerKey = partnerKeyFromName(partnerName);

  // Saudação inicial: o Mochi fala um balão pra Tita ou pro Gab quando entra no quartinho
  useEffect(() => {
    const t = window.setTimeout(() => {
      setSpeech(pickGreeting(partnerKey));
    }, 600);
    const hide = window.setTimeout(() => setSpeech(null), 6500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(hide);
    };
  }, [partnerKey]);

  // Troca a frase a cada ~25s enquanto o usuário tá no quartinho
  useEffect(() => {
    const t = window.setInterval(() => {
      setSpeech(pickGreeting(partnerKey, Date.now()));
      window.setTimeout(() => setSpeech(null), 5500);
    }, 25000);
    return () => window.clearInterval(t);
  }, [partnerKey]);

  // initial load + realtime
  useEffect(() => {
    const load = async () => {
      const [{ data: petData }, { data: foodData }, { data: histData }] = await Promise.all([
        supabase.from("pet_state").select("*").eq("id", 1).single(),
        supabase.from("food_items").select("*").eq("is_active", true).order("rarity"),
        supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(20),
      ]);
      if (petData) setPet(petData as PetState);
      if (foodData) setFoods(foodData as FoodItem[]);
      if (histData) setHistory(histData as Interaction[]);
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

  const feed = async (entry: { food: FoodItem; pantryItemId: string | null }) => {
    if (!pet || busy) return;
    const { food, pantryItemId } = entry;
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

    // consome o item da despensa (se vier de lá)
    if (pantryItemId) {
      await supabase
        .from("pantry_items")
        .update({ consumed: true, consumed_at: now })
        .eq("id", pantryItemId);
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

  const cooldownMs = 24 * 60 * 60 * 1000;
  const formatLeft = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `volta em ${h}h` : `volta em ${m}min`;
  };
  const lastPlayAt = history.find((h) => h.interaction_type === "play")?.created_at ?? null;
  const playMsLeft = lastPlayAt
    ? Math.max(0, cooldownMs - (Date.now() - new Date(lastPlayAt).getTime()))
    : 0;
  const playLocked = playMsLeft > 0;
  const playLockedLabel = playLocked ? formatLeft(playMsLeft) : null;

  const lastPetAt = history.find((h) => h.interaction_type === "pet")?.created_at ?? null;
  const petMsLeft = lastPetAt
    ? Math.max(0, cooldownMs - (Date.now() - new Date(lastPetAt).getTime()))
    : 0;
  const petLocked = petMsLeft > 0;
  const petLockedLabel = petLocked ? formatLeft(petMsLeft) : null;

  const pet_action = async (type: "pet" | "play") => {
    if (!pet || busy) return;
    if (type === "play" && playLocked) {
      showToast(`brincadeira só 1x/dia 💤 ${playLockedLabel}`);
      return;
    }
    if (type === "pet" && petLocked) {
      showToast(`carinho só 1x/dia 💗 ${petLockedLabel}`);
      return;
    }
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

  const saveOutfit = async (skin: string, accessory: string) => {
    if (!pet) return;
    await supabase
      .from("pet_state")
      .update({ equipped_skin: skin, equipped_accessory: accessory, updated_at: new Date().toISOString() })
      .eq("id", 1);
    showToast("lookzinho novo ✨");
  };

  const showPhoto = async (photo: Photo) => {
    if (!pet || busy) return;
    setBusy(true);
    setShownPhoto(photo);
    setSmitten(true);

    // staggered heart bursts to feel continuous, not a single pop
    const burstTimers: number[] = [];
    burstParticles("💗", 4);
    burstTimers.push(
      window.setTimeout(() => burstParticles("💞", 3), 600),
      window.setTimeout(() => burstParticles("💗", 4), 1300),
      window.setTimeout(() => burstParticles("💕", 3), 2100),
      window.setTimeout(() => burstParticles("💗", 3), 2900),
    );

    const dHappy = photo.happiness_boost;
    const newHappiness = clamp(pet.happiness + dHappy);
    const xp = 8;
    const newXp = pet.xp + xp;
    const newLevel = Math.floor(newXp / 100) + 1;
    const leveled = newLevel > pet.level;
    const now = new Date().toISOString();

    await supabase
      .from("pet_state")
      .update({
        happiness: newHappiness,
        xp: newXp,
        level: newLevel,
        current_mood: computeMood(pet.hunger, newHappiness, pet.energy),
        last_interaction_at: now,
        last_interaction_by: partnerName,
        updated_at: now,
      })
      .eq("id", 1);

    await supabase.from("interactions").insert({
      partner_name: partnerName,
      interaction_type: "photo",
      happiness_delta: dHappy,
      xp_delta: xp,
      message: photo.caption ? `derreteu vendo "${photo.caption}"` : "derreteu vendo uma fotinho de vocês",
    });

    showToast("ele ficou apaixonadinho 💗");

    if (leveled) {
      setLevelUp(true);
      window.setTimeout(() => setLevelUp(false), 2400);
      burstParticles("✨", 12);
    }

    // ~2 full smitten cycles (1.8s each) so the loop ends naturally
    window.setTimeout(() => {
      burstTimers.forEach((t) => window.clearTimeout(t));
      setSmitten(false);
      setShownPhoto(null);
      setBusy(false);
    }, 3800);
  };

  if (!pet) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-muted-foreground">
        abrindo o cantinho…
      </div>
    );
  }

  const mood: Mood = smitten ? "smitten" : eating ? "eating" : (pet.current_mood as Mood);
  const xpInLevel = pet.xp % 100;

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-6">
      <PhotoWall />
      {/* container do conteúdo acima do mural */}
      <div className="relative z-10 flex flex-1 flex-col">
      {/* top bar */}
      <header className="flex items-center justify-between">
        <button
          onClick={onLogout}
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-sm"
          aria-label="sair"
          title="sair"
        >
          ←
        </button>
        <div className="text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            oi, {partnerName.toLowerCase()}
          </p>
        </div>
        <button
          onClick={toggle}
          className="glass flex h-10 w-10 items-center justify-center rounded-full text-base"
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
        <MochiSpeechBubble message={speech} />
        <Mochi
          mood={mood}
          eating={eating}
          bouncing={bouncing}
          skinId={pet.equipped_skin}
          accessoryId={pet.equipped_accessory}
        />

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

        {/* photo shown to mochi */}
        <AnimatePresence>
          {shownPhoto && (
            <motion.div
              initial={{ opacity: 0, y: 40, rotate: -10, scale: 0.7 }}
              animate={{
                opacity: 1,
                y: [0, -4, 0, -3, 0],
                rotate: [-6, -2, -5, -1, -4],
                scale: 1,
              }}
              exit={{ opacity: 0, y: 30, scale: 0.85, rotate: -8 }}
              transition={{
                opacity: { duration: 0.4 },
                scale: { type: "spring", stiffness: 200, damping: 18 },
                y: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
                rotate: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
              }}
              className="pointer-events-none absolute -left-2 bottom-6 z-20 w-28 rounded-xl bg-white p-1.5 shadow-[var(--shadow-glow)] sm:w-32"
            >
              <img
                src={
                  supabase.storage.from("mochi-photos").getPublicUrl(shownPhoto.storage_path).data.publicUrl
                }
                alt={shownPhoto.caption ?? "fotinho"}
                className="aspect-square w-full rounded-lg object-cover"
              />
              {shownPhoto.caption && (
                <p className="mt-1 px-1 pb-0.5 text-center text-[9px] font-medium text-zinc-700 line-clamp-1">
                  {shownPhoto.caption}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* status bars */}
      <div className="glass mt-2 rounded-3xl p-5">
        <StatusBars hunger={pet.hunger} happiness={pet.happiness} energy={pet.energy} />
      </div>

      {/* primary actions */}
      <div className="mt-4 grid grid-cols-4 gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          disabled={busy}
          className="col-span-2 rounded-2xl bg-gradient-to-r from-pink to-lilac px-5 py-4 font-display text-base font-bold text-white shadow-[var(--shadow-glow)] transition-all active:scale-[0.97] disabled:opacity-50"
        >
          🍙 alimentar
        </button>
        <button
          onClick={() => setQuestsOpen(true)}
          disabled={busy}
          className="col-span-2 rounded-2xl bg-gradient-to-r from-mint to-lilac px-5 py-4 font-display text-base font-bold text-white shadow-[var(--shadow-glow)] transition-all active:scale-[0.97] disabled:opacity-50"
        >
          🎯 missões
        </button>
        <button
          onClick={() => pet_action("pet")}
          disabled={busy || petLocked}
          className="glass rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
          title={petLocked ? `carinho só 1x/dia — ${petLockedLabel}` : "carinho"}
        >
          {petLocked ? `💗 ${petLockedLabel}` : "💗 carinho"}
        </button>
        <button
          onClick={() => pet_action("play")}
          disabled={busy || pet.energy < 10 || playLocked}
          className="glass rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
          title={playLocked ? `brincadeira só 1x/dia — ${playLockedLabel}` : "brincar"}
        >
          {playLocked ? `🎈 ${playLockedLabel}` : "🎈 brincar"}
        </button>
        <button
          onClick={() => setPhotosOpen(true)}
          disabled={busy}
          className="glass rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
        >
          📸 fotinho
        </button>
        <button
          onClick={() => setWardrobeOpen(true)}
          disabled={busy}
          className="glass rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
        >
          🎀 vestir
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
        partnerName={partnerName}
        onPick={feed}
        busy={busy}
        onOpenQuests={() => setQuestsOpen(true)}
      />

      {/* quests drawer */}
      <QuestsDrawer
        open={questsOpen}
        onClose={() => setQuestsOpen(false)}
        partnerName={partnerName}
        onCompleted={(msg) => showToast(msg)}
      />

      {/* wardrobe drawer */}
      <WardrobeDrawer
        open={wardrobeOpen}
        onClose={() => setWardrobeOpen(false)}
        currentSkin={pet.equipped_skin}
        currentAccessory={pet.equipped_accessory}
        onSave={saveOutfit}
      />

      {/* photos drawer */}
      <PhotosDrawer
        open={photosOpen}
        onClose={() => setPhotosOpen(false)}
        partnerName={partnerName}
        onShowToMochi={showPhoto}
      />
      </div>
    </div>
  );
}
