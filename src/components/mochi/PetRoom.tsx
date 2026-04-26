import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type {
  PetState,
  FoodItem,
  Interaction,
  Mood,
} from "@/lib/mochi-types";
import { computeMood, moodCopy, moodLabel, RARITY_XP, clamp, timeAgo, applyDecay } from "@/lib/mochi-types";
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
import { SpotifyPanel } from "./SpotifyPanel";
import type { NowPlayingResponse } from "@/lib/spotify-types";
import { buildMochiReaction, vibeLabel } from "@/lib/spotify-vibe";
import { partnerKeyFromName, pickGreeting, pickSecret } from "@/lib/mochi-greetings";
import { usePartnerTheme } from "@/hooks/use-theme";
import { BackgroundScene } from "./BackgroundScene";
import { BackgroundDrawer } from "./BackgroundDrawer";
import { DreamBubbles } from "./DreamBubbles";
import {
  loadBackgroundId,
  saveBackgroundId,
  type BackgroundId,
} from "@/lib/mochi-backgrounds";
import { getSeasonTheme, getDayPhaseOverlay, getDaysTogetherInfo } from "@/lib/mochi-seasons";
import { computeStreak, type StreakInfo } from "@/lib/mochi-streak";
import { useKonamiCode } from "@/lib/mochi-secrets";
import { LoveNotesDrawer } from "./LoveNotesDrawer";
import { AchievementsDrawer } from "./AchievementsDrawer";
import { GalleryDrawer } from "./GalleryDrawer";
import { Link } from "@tanstack/react-router";
import { getTodayKey } from "@/lib/mochi-wordle";
import {
  checkAchievements,
  trackBackgroundVisit,
  getVisitedBackgroundCount,
  achievementLabel,
  achievementEmoji,
} from "@/lib/mochi-achievements";

interface Props {
  partnerName: string;
  onLogout: () => void;
}

let particleId = 0;

interface SuggestedTrack { id: string; name: string; artist: string }

// Sugere uma trilha sonora pra foto:
// 1) se o Spotify tá tocando agora, usa esse track
// 2) senão, puxa uma aleatória do histórico de música do casal
async function pickSuggestedTrack(
  nowPlaying: NowPlayingResponse | null
): Promise<SuggestedTrack | null> {
  if (nowPlaying?.is_playing && nowPlaying.track) {
    return {
      id: nowPlaying.track.id,
      name: nowPlaying.track.name,
      artist: nowPlaying.track.artists.map((a) => a.name).join(", "),
    };
  }
  const { data } = await supabase
    .from("music_reactions")
    .select("track_id, track_name, artist_name")
    .not("track_name", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);
  if (!data || data.length === 0) return null;
  const pick = data[Math.floor(Math.random() * data.length)];
  return {
    id: pick.track_id,
    name: pick.track_name ?? "música misteriosa",
    artist: pick.artist_name ?? "",
  };
}

export function PetRoom({ partnerName, onLogout }: Props) {
  const [pet, setPet] = useState<PetState | null>(null);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<Interaction[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  // Pra mostrar badge "🆕" no botão se ainda não jogou hoje
  const [wordlePlayedToday, setWordlePlayedToday] = useState(false);
  const [backgroundId, setBackgroundId] = useState<BackgroundId>("quartinho");
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse | null>(null);
  // nonce que dispara o shimmer no casal do cinema quando alimenta/faz carinho
  const [couplePulse, setCouplePulse] = useState(0);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [eating, setEating] = useState(false);
  const [bouncing, setBouncing] = useState(false);
  const [smitten, setSmitten] = useState(false);
  const [shownPhoto, setShownPhoto] = useState<Photo | null>(null);
  const [particles, setParticles] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState(false);
  const [speech, setSpeech] = useState<string | null>(null);
  const flightRef = useRef<{ id: number; emoji: string } | null>(null);
  const [flight, setFlight] = useState<{ id: number; emoji: string } | null>(null);
  // Feature #2: easter egg do toque duplo no XP
  const [secretShown, setSecretShown] = useState(false);
  // Feature #6: streak de cuidado
  const [streak, setStreak] = useState<StreakInfo>({ days: 0, emoji: "", label: "", brokeToday: false });
  // Feature #9: estação/data especial
  const seasonTheme = getSeasonTheme();
  // Feature #8: overlay dia/noite
  const dayOverlay = getDayPhaseOverlay();
  // Feature #5: contador do casal — usa couple_settings.created_at como
  // referência (carregado abaixo). Enquanto não carrega, fica vazio.
  const [coupleStart, setCoupleStart] = useState<Date | null>(null);
  const coupleInfo = getDaysTogetherInfo(coupleStart);
  // Nomes dinâmicos vindos de couple_settings (não mais hardcoded gab/tita)
  const [partnerOne, setPartnerOne] = useState<string>("");
  const [partnerTwo, setPartnerTwo] = useState<string>("");
  // Bilhetes não lidos endereçados a este partner — pra badge no botão 💌
  const [unreadNotes, setUnreadNotes] = useState(0);
  const [editingNames, setEditingNames] = useState(false);
  const [oneDraft, setOneDraft] = useState("");
  const [twoDraft, setTwoDraft] = useState("");
  // Feature #1: Konami Code rainbow mode
  const [rainbowMode, setRainbowMode] = useState(false);

  const partnerKey = partnerKeyFromName(partnerName);
  const { theme } = usePartnerTheme(partnerKey);

  // Feature #1: Konami Code easter egg
  useKonamiCode(() => {
    setRainbowMode(true);
    setSpeech("descobriu o segredo! te amo extra hoje 💗✨🌈");
    burstParticles("🌈", 8);
    burstParticles("✨", 10);
    burstParticles("💗", 6);
    window.setTimeout(() => {
      setRainbowMode(false);
      setSpeech(null);
    }, 10000);
  });

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

  // carrega background salvo no localStorage
  useEffect(() => {
    setBackgroundId(loadBackgroundId());
  }, []);

  // Feature #6: calcula streak ao montar
  useEffect(() => {
    computeStreak().then(setStreak);
  }, []);

  // Wordle: verifica se já jogou hoje pra mostrar/esconder badge "🆕"
  useEffect(() => {
    const checkToday = async () => {
      const { data } = await (supabase as any)
        .from("word_game_daily")
        .select("finished")
        .eq("game_date", getTodayKey())
        .ilike("partner_name", partnerName)
        .maybeSingle();
      setWordlePlayedToday(!!data?.finished);
    };
    checkToday();
    const ch = supabase
      .channel("mochi-wordle-played")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "word_game_daily" },
        () => checkToday(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [partnerName]);

  // Bilhetes não lidos: count inicial + realtime + recount quando o
  // drawer fecha (porque marcar como lido é dentro do drawer).
  // Schema do Lovable: sender_name + read_at (null = não lido).
  // "Não lidos pra mim" = sender_name diferente do meu E read_at IS NULL.
  useEffect(() => {
    const recount = async () => {
      // Pega não lidos (qualquer um) e filtra os que NÃO foram eu que mandei
      const { data } = await supabase
        .from("love_notes")
        .select("id, sender_name")
        .is("read_at", null);
      const mine = (data ?? []).filter(
        (n) => n.sender_name?.toLowerCase() !== partnerName.toLowerCase(),
      );
      setUnreadNotes(mine.length);
    };
    recount();

    const ch = supabase
      .channel("mochi-love-notes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "love_notes" },
        (payload) => {
          const note = payload.new as { sender_name: string; message: string; emoji?: string };
          // Só notifica se NÃO foi eu que mandei
          if (note.sender_name?.toLowerCase() !== partnerName.toLowerCase()) {
            setUnreadNotes((n) => n + 1);
            const fromName = note.sender_name.toLowerCase();
            const ico = note.emoji || "💌";
            showToast(`${ico} ${fromName} mandou um bilhetinho!`);
            burstParticles(ico, 4);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "love_notes" },
        () => recount(),
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [partnerName]);

  // Quando o drawer fecha, dá refresh no count (caso tenha lido alguma)
  useEffect(() => {
    if (notesOpen) return;
    (async () => {
      const { data } = await supabase
        .from("love_notes")
        .select("id, sender_name")
        .is("read_at", null);
      const mine = (data ?? []).filter(
        (n) => n.sender_name?.toLowerCase() !== partnerName.toLowerCase(),
      );
      setUnreadNotes(mine.length);
    })();
  }, [notesOpen, partnerName]);

  // Feature #11: registra cenário inicial e verifica conquistas
  useEffect(() => {
    trackBackgroundVisit(backgroundId);
  }, [backgroundId]);

  // Feature #11: roda detector de conquistas quando o estado muda
  useEffect(() => {
    if (!pet) return;
    const run = async () => {
      const newly = await checkAchievements({
        partnerName,
        petLevel: pet.level,
        streakDays: streak.days,
        daysTogether: coupleInfo.days,
        visitedBackgrounds: getVisitedBackgroundCount(),
        hourOfVisit: new Date().getHours(),
      });
      if (newly.length > 0) {
        // Mostra a primeira como toast principal, anuncia as outras com delay
        newly.forEach((key, idx) => {
          window.setTimeout(() => {
            showToast(`${achievementEmoji(key)} conquista: ${achievementLabel(key)}!`);
            burstParticles("✨", 6);
          }, idx * 2400);
        });
      }
    };
    run();
  }, [pet?.level, streak.days, coupleInfo.days, partnerName]);

  // Feature #9: greeting de estação especial na entrada
  useEffect(() => {
    if (seasonTheme.greeting) {
      const t = window.setTimeout(() => {
        setSpeech(seasonTheme.greeting!);
      }, 7000); // depois do greeting normal
      const h = window.setTimeout(() => setSpeech(null), 13000);
      return () => { window.clearTimeout(t); window.clearTimeout(h); };
    }
  }, [seasonTheme.greeting]);

  // Feature #5: milestone do casal
  useEffect(() => {
    if (coupleInfo.milestone) {
      const t = window.setTimeout(() => {
        setSpeech(coupleInfo.milestone!);
        burstParticles("🎉", 8);
      }, 14000);
      const h = window.setTimeout(() => setSpeech(null), 20000);
      return () => { window.clearTimeout(t); window.clearTimeout(h); };
    }
  }, [coupleInfo.milestone]);

  const pickBackground = (id: BackgroundId) => {
    setBackgroundId(id);
    saveBackgroundId(id);
    trackBackgroundVisit(id); // Feature #11: progresso pra "Exploradores"
    showToast(`cantinho trocado ✨`);
  };

  // Cooldown dedicado por tipo de interação — muito mais preciso do que
  // procurar no histórico limitado de 20 itens.
  const [lastPlayAt, setLastPlayAt] = useState<string | null>(null);
  const [lastPetAt, setLastPetAt] = useState<string | null>(null);

  // initial load + realtime
  useEffect(() => {
    const load = async () => {
      const [
        { data: petData },
        { data: foodData },
        { data: histData },
        { data: settingsData },
      ] = await Promise.all([
        supabase.from("pet_state").select("*").eq("id", 1).single(),
        supabase.from("food_items").select("*").eq("is_active", true).order("rarity"),
        supabase.from("interactions").select("*").order("created_at", { ascending: false }).limit(20),
        supabase.from("couple_settings").select("created_at, partner_one_name, partner_two_name").eq("id", 1).maybeSingle(),
      ]);
      if (petData) setPet(applyDecay(petData as PetState));
      if (foodData) setFoods(foodData as FoodItem[]);
      if (histData) setHistory(histData as Interaction[]);
      if (settingsData) {
        setCoupleStart(settingsData.created_at ? new Date(settingsData.created_at) : null);
        setPartnerOne(settingsData.partner_one_name ?? "");
        setPartnerTwo(settingsData.partner_two_name ?? "");
      }

      // Fix #5: busca cooldown dedicado por tipo e por partner
      const [{ data: playRow }, { data: petRow }] = await Promise.all([
        supabase
          .from("interactions")
          .select("created_at")
          .eq("partner_name", partnerName)
          .eq("interaction_type", "play")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("interactions")
          .select("created_at")
          .eq("partner_name", partnerName)
          .eq("interaction_type", "pet")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setLastPlayAt(playRow?.created_at ?? null);
      setLastPetAt(petRow?.created_at ?? null);
    };
    load();

    const ch = supabase
      .channel("mochi-room")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "pet_state" }, (p) => {
        setPet(p.new as PetState);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "interactions" }, (p) => {
        const newInt = p.new as Interaction;
        setHistory((h) => [newInt, ...h].slice(0, 20));
        // Atualiza cooldown em tempo real
        if (newInt.partner_name === partnerName) {
          if (newInt.interaction_type === "play") setLastPlayAt(newInt.created_at);
          if (newInt.interaction_type === "pet") setLastPetAt(newInt.created_at);
        }
        // Feature #7: notifica quando o OUTRO partner faz algo
        if (newInt.partner_name !== partnerName) {
          const name = newInt.partner_name.toLowerCase();
          const actionMap: Record<string, string> = {
            feed: `${name} alimentou ${pet?.pet_name ?? "o pet"}! 🍙`,
            pet: `${name} deu carinho ${pet?.pet_name ?? "no pet"} 💗`,
            play: `${name} brincou com ${pet?.pet_name ?? "o pet"} ✨`,
            photo: `${name} mostrou uma foto ${pet?.pet_name ?? "pro pet"} 📸`,
          };
          const msg = actionMap[newInt.interaction_type];
          if (msg) showToast(msg);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [partnerName]);

  // passive decay — aplica decaimento derivado do tempo a cada 30s
  // e persiste no banco a cada ~5min para manter consistência entre sessões
  useEffect(() => {
    const lastPersist = { t: Date.now() };
    const tick = async () => {
      setPet((p) => (p ? applyDecay(p) : p));
      // persiste no banco se passou mais de 5 min desde último persist
      if (Date.now() - lastPersist.t > 5 * 60_000) {
        lastPersist.t = Date.now();
        const { data } = await supabase.from("pet_state").select("*").eq("id", 1).single();
        if (data) {
          const decayed = applyDecay(data as PetState);
          await supabase
            .from("pet_state")
            .update({
              hunger: Math.round(decayed.hunger),
              happiness: Math.round(decayed.happiness),
              energy: Math.round(decayed.energy),
              current_mood: decayed.current_mood,
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);
        }
      }
    };
    const t = setInterval(tick, 30_000);
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

    try {
      // food flight animation
      flightRef.current = { id: ++particleId, emoji: food.emoji };
      setFlight(flightRef.current);
      await new Promise((r) => setTimeout(r, 600));
      setFlight(null);

      // eat animation
      setEating(true);
      await new Promise((r) => setTimeout(r, 600));

      // FIX 22P02: Math.round() em todos os valores numéricos —
      // applyDecay produz floats (67.234) que PostgreSQL integer rejeita.
      const xpGain = RARITY_XP[food.rarity] ?? 5;
      const newHunger = Math.round(clamp(pet.hunger + food.hunger_value));
      const newHappiness = Math.round(clamp(pet.happiness + food.happiness_value));
      const newEnergy = Math.round(clamp(pet.energy + food.energy_value));
      const newXp = Math.round(pet.xp + xpGain);
      const newLevel = Math.floor(newXp / 100) + 1;
      const newMood: Mood = computeMood(newHunger, newHappiness, newEnergy);
      const leveled = newLevel > pet.level;

      const now = new Date().toISOString();

      const fedByPatch: Record<string, string> =
        partnerKey === "gab"
          ? { last_fed_by_gab: now }
          : partnerKey === "tita"
            ? { last_fed_by_tita: now }
            : {};

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
          ...fedByPatch,
        })
        .eq("id", 1);

      if (petErr) {
        console.error("feed pet_state error:", petErr);
        const detail = petErr.code === "42501"
          ? "sem permissão pra alimentar — tenta sair e entrar de novo 🔑"
          : petErr.message?.includes("JWT")
            ? "sessão expirou — recarrega a página 🔄"
            : `algo deu errado 🥺 (${petErr.code ?? "erro"})`;
        showToast(detail);
        return;
      }

      if (pantryItemId) {
        const { data: consumed, error: pantryErr } = await supabase
          .from("pantry_items")
          .update({ consumed: true, consumed_at: now })
          .eq("id", pantryItemId)
          .eq("consumed", false)
          .select("id")
          .maybeSingle();
        if (pantryErr || !consumed) {
          console.warn("pantry item já consumido ou erro:", pantryErr);
        }
      }

      await supabase.from("interactions").insert({
        partner_name: partnerName,
        interaction_type: "feed",
        food_id: food.id,
        food_name: food.name,
        food_emoji: food.emoji,
        hunger_delta: Math.round(food.hunger_value),
        happiness_delta: Math.round(food.happiness_value),
        energy_delta: Math.round(food.energy_value),
        xp_delta: Math.round(xpGain),
        message: `Ele amou ${food.name.toLowerCase()}`,
      });

      setEating(false);
      setBouncing(true);
      burstParticles("💗", 5);
      setCouplePulse((n) => n + 1);
      showToast(`ele amou ${food.name.toLowerCase()} ${food.emoji}`);
      if (leveled) {
        setLevelUp(true);
        window.setTimeout(() => setLevelUp(false), 2400);
        burstParticles("✨", 12);
      }
      window.setTimeout(() => setBouncing(false), 700);
    } catch (err) {
      console.error("feed exception:", err);
      showToast("algo deu errado 🥺 tenta de novo");
    } finally {
      setEating(false);
      setBusy(false);
    }
  };

  // Fix #5: cooldown agora usa state dedicado (lastPlayAt, lastPetAt)
  // em vez de procurar na history limitada a 20 itens
  const cooldownMs = 24 * 60 * 60 * 1000;
  const formatLeft = (ms: number) => {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `volta em ${h}h` : `volta em ${m}min`;
  };
  const playMsLeft = lastPlayAt
    ? Math.max(0, cooldownMs - (Date.now() - new Date(lastPlayAt).getTime()))
    : 0;
  const playLocked = playMsLeft > 0;
  const playLockedLabel = playLocked ? formatLeft(playMsLeft) : null;

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
    try {
      setBouncing(true);
      burstParticles(type === "pet" ? "💗" : "✨", 5);
      setCouplePulse((n) => n + 1);
      const dHappy = type === "pet" ? 8 : 12;
      const dEnergy = type === "pet" ? 0 : -10;
      const xp = 3;
      // FIX 22P02: Math.round em todos os valores
      const newHappiness = Math.round(clamp(pet.happiness + dHappy));
      const newEnergy = Math.round(clamp(pet.energy + dEnergy));
      const newXp = Math.round(pet.xp + xp);
      const newLevel = Math.floor(newXp / 100) + 1;
      const now = new Date().toISOString();

      await supabase
        .from("pet_state")
        .update({
          happiness: newHappiness,
          energy: newEnergy,
          xp: newXp,
          level: newLevel,
          current_mood: computeMood(Math.round(pet.hunger), newHappiness, newEnergy),
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
    } catch (err) {
      console.error("pet_action error:", err);
      showToast("algo deu errado 🥺");
    } finally {
      setBusy(false);
    }
  };

  const saveOutfit = async (skin: string, accessory: string) => {
    if (!pet) return;
    await supabase
      .from("pet_state")
      .update({ equipped_skin: skin, equipped_accessory: accessory, updated_at: new Date().toISOString() })
      .eq("id", 1);
    showToast("lookzinho novo ✨");
  };

  const startEditingName = () => {
    if (!pet) return;
    setNameDraft(pet.pet_name);
    setEditingName(true);
  };

  const startEditingNames = () => {
    setOneDraft(partnerOne);
    setTwoDraft(partnerTwo);
    setEditingNames(true);
  };

  const savePartnerNames = async () => {
    const one = oneDraft.trim().slice(0, 20);
    const two = twoDraft.trim().slice(0, 20);
    setEditingNames(false);
    if (!one || !two || (one === partnerOne && two === partnerTwo)) return;
    const { error } = await supabase
      .from("couple_settings")
      .update({ partner_one_name: one, partner_two_name: two })
      .eq("id", 1);
    if (error) {
      showToast("não consegui renomear 🥺");
      return;
    }
    setPartnerOne(one);
    setPartnerTwo(two);
    showToast("nomes atualizados 💗");
  };

  const saveName = async () => {
    if (!pet) return;
    const trimmed = nameDraft.trim().slice(0, 20);
    setEditingName(false);
    if (!trimmed || trimmed === pet.pet_name) return;
    const { error } = await supabase
      .from("pet_state")
      .update({ pet_name: trimmed, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      showToast("não consegui renomear 🥺");
      return;
    }
    showToast(`agora ele atende por ${trimmed} 💗`);
  };

  const showPhoto = async (photo: Photo) => {
    if (!pet || busy) return;
    setBusy(true);
    setShownPhoto(photo);
    setSmitten(true);

    const burstTimers: number[] = [];
    try {
      burstParticles("💗", 4);
      burstTimers.push(
        window.setTimeout(() => burstParticles("💞", 3), 600),
        window.setTimeout(() => burstParticles("💗", 4), 1300),
        window.setTimeout(() => burstParticles("💕", 3), 2100),
        window.setTimeout(() => burstParticles("💗", 3), 2900),
      );

      const dHappy = Math.round(photo.happiness_boost);
      // FIX 22P02: Math.round em todos os valores
      const newHappiness = Math.round(clamp(pet.happiness + dHappy));
      const xp = 8;
      const newXp = Math.round(pet.xp + xp);
      const newLevel = Math.floor(newXp / 100) + 1;
      const leveled = newLevel > pet.level;
      const now = new Date().toISOString();

      await supabase
        .from("pet_state")
        .update({
          happiness: newHappiness,
          xp: newXp,
          level: newLevel,
          current_mood: computeMood(Math.round(pet.hunger), newHappiness, Math.round(pet.energy)),
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

      // Spotlight de 24h + snapshot do Mochi + sugestão musical.
      // Em try/catch separado: se a migration de photos_metadata ainda não
      // rodou, as colunas não existem — mas a foto já foi mostrada e o pet
      // já reagiu. Não dá pra perder o flow inteiro por causa disso.
      try {
        const featuredUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const currentMood = computeMood(Math.round(pet.hunger), newHappiness, Math.round(pet.energy));
        const suggested = await pickSuggestedTrack(nowPlaying);
        const { error: metaErr } = await (supabase as any)
          .from("photos")
          .update({
            featured_until: featuredUntil,
            shown_skin: pet.equipped_skin,
            shown_accessory: pet.equipped_accessory,
            shown_mood: currentMood,
            suggested_track_id: suggested?.id ?? null,
            suggested_track_name: suggested?.name ?? null,
            suggested_track_artist: suggested?.artist ?? null,
          })
          .eq("id", photo.id);
        if (metaErr) {
          console.warn(
            "[showPhoto] não consegui salvar snapshot — provavelmente a migration photos_metadata ainda não foi aplicada:",
            metaErr.message
          );
        }
      } catch (e) {
        console.warn("[showPhoto] snapshot falhou:", e);
      }

      showToast("ele ficou apaixonadinho 💗");

      if (leveled) {
        setLevelUp(true);
        window.setTimeout(() => setLevelUp(false), 2400);
        burstParticles("✨", 12);
      }
    } catch (err) {
      console.error("showPhoto error:", err);
      showToast("algo deu errado 🥺");
    }

    // ~2 full smitten cycles then cleanup — sempre roda
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
  const showSpotifySuggestion = mood === "sad" || mood === "sleepy";
  const spotifySuggestionCopy =
    mood === "sad"
      ? "abrir Spotify"
      : mood === "sleepy"
        ? "tocar algo levinho"
        : "ouvir música";

  // Vibe ao vivo (visível sem precisar abrir o painel do Spotify)
  const liveTrack = nowPlaying?.is_playing ? nowPlaying.track : null;
  const liveReaction = liveTrack
    ? buildMochiReaction({
        features: nowPlaying?.features,
        partnerName,
        trackName: liveTrack.name,
        artistNames: liveTrack.artists.map((a) => a.name),
        genres: nowPlaying?.genres ?? [],
        playCount: 0,
      })
    : null;

  // Janela de 24h por pessoa: calcula horas restantes pra Gab e Tita.
  // Quando passa de 24h sem alimentar, o cron no Supabase mata o pet.
  const now = Date.now();
  const FEED_WINDOW_MS = 24 * 60 * 60 * 1000;
  const hoursLeft = (iso: string | null): number | null => {
    if (!iso) return 0;
    const elapsed = now - new Date(iso).getTime();
    const left = (FEED_WINDOW_MS - elapsed) / (60 * 60 * 1000);
    return left;
  };
  const gabHours = hoursLeft(pet.last_fed_by_gab);
  const titaHours = hoursLeft(pet.last_fed_by_tita);
  const myKey = partnerKey; // "gab" | "tita" | "outro"
  const myHours = myKey === "gab" ? gabHours : myKey === "tita" ? titaHours : null;
  const partnerHours = myKey === "gab" ? titaHours : myKey === "tita" ? gabHours : null;
  const partnerOtherName = myKey === "gab" ? "tita" : myKey === "tita" ? "gab" : "seu par";
  const myUrgent = myHours !== null && myHours <= 6;
  const partnerUrgent = partnerHours !== null && partnerHours <= 6;
  // "Acabou de morrer" = died_at nas últimas 24h
  const justDied = pet.died_at
    ? now - new Date(pet.died_at).getTime() < FEED_WINDOW_MS
    : false;
  const fmtHours = (h: number | null) => {
    if (h === null) return "—";
    if (h <= 0) return "0h";
    if (h < 1) return `${Math.max(1, Math.round(h * 60))}min`;
    return `${Math.floor(h)}h`;
  };

  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col px-5 pb-10 pt-6">
      <BackgroundScene backgroundId={backgroundId} reactPulse={couplePulse} />
      {/* Feature #8: overlay de ciclo dia/noite */}
      {dayOverlay && (
        <div
          className="pointer-events-none fixed inset-0 z-[1]"
          style={{ background: dayOverlay.bg, opacity: dayOverlay.opacity }}
        />
      )}
      {/* Feature #9: partículas sazonais */}
      {seasonTheme.particles.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-lg animate-season-fall"
              style={{
                left: `${(i * 137.508) % 100}%`,
                animationDelay: `${i * 0.8}s`,
                animationDuration: `${6 + (i % 4)}s`,
              }}
            >
              {seasonTheme.particles[i % seasonTheme.particles.length]}
            </div>
          ))}
        </div>
      )}
      <PhotoWall />
      <SpotifyPanel
        partnerName={partnerName}
        petName={pet.pet_name}
        open={spotifyOpen}
        onOpenChange={setSpotifyOpen}
        onNowChange={setNowPlaying}
        onReaction={(r) => {
          setSpeech(r.message);
          window.setTimeout(() => setSpeech(null), 5500);
        }}
      />
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBackgroundOpen(true)}
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-base"
            aria-label="trocar cenário"
            title="trocar cenário"
          >
            🏞️
          </button>
          <div
            className="glass flex h-10 w-10 items-center justify-center rounded-full text-base"
            aria-label={theme === "dark" ? "modo lua" : "modo sol"}
            title={theme === "dark" ? "modo lua (tita)" : "modo sol (gab)"}
          >
            {theme === "dark" ? "🌙" : "☀️"}
          </div>
        </div>
      </header>

      {/* Aviso de morte recente */}
      {justDied && (
        <div className="mt-4 rounded-2xl border border-danger-soft/40 bg-danger-soft/15 p-3 text-center text-sm">
          💔 {pet.pet_name} não foi alimentado a tempo e voltou pro nível 1.
          <span className="block text-xs text-muted-foreground mt-1">
            cuidem dele de novo — cada um precisa alimentar 1× a cada 24h.
          </span>
        </div>
      )}

      {/* Aviso de fome (cada um tem janela própria de 24h) */}
      {!justDied && (myUrgent || partnerUrgent) && (
        <div
          className={`mt-4 rounded-2xl p-3 text-sm ${
            myUrgent
              ? "border border-pink/50 bg-pink/15 animate-pulse"
              : "border border-white/10 bg-white/5"
          }`}
        >
          {myUrgent ? (
            <p className="font-semibold">
              ⚠️ {pet.pet_name} precisa de você! restam {fmtHours(myHours)} pra
              você alimentar — se não, ele morre.
            </p>
          ) : (
            <p>
              🕐 {partnerOtherName} tem só {fmtHours(partnerHours)} pra alimentar {pet.pet_name}.
            </p>
          )}
          <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span>você: {fmtHours(myHours)}</span>
            <span>{partnerOtherName}: {fmtHours(partnerHours)}</span>
          </div>
        </div>
      )}

      {/* pet name & mood */}
      <div className="mt-6 text-center">
        {editingName ? (
          <input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") setEditingName(false);
            }}
            maxLength={20}
            className="w-full bg-transparent text-center font-display text-4xl font-bold tracking-tight outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={startEditingName}
            title="renomear"
            className="font-display text-4xl font-bold tracking-tight transition-colors hover:text-pink"
          >
            {pet.pet_name}
          </button>
        )}
        <div className="mt-1 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => showSpotifySuggestion && setSpotifyOpen(true)}
            disabled={!showSpotifySuggestion}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm transition-colors ${
              showSpotifySuggestion
                ? "bg-primary/10 text-foreground hover:bg-primary/15"
                : "text-muted-foreground"
            }`}
            title={showSpotifySuggestion ? "Abrir Spotify" : moodLabel(mood)}
          >
            <span>{moodCopy(mood)}</span>
            {showSpotifySuggestion && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-foreground">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden="true">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                {spotifySuggestionCopy}
              </span>
            )}
          </button>
        </div>
        {/* Feature #2: toque duplo secreto no badge de nível */}
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs transition-all hover:bg-white/10 active:scale-95"
          onDoubleClick={() => {
            if (!secretShown) {
              setSecretShown(true);
              setSpeech(pickSecret());
              burstParticles("💗", 6);
              window.setTimeout(() => setSpeech(null), 5000);
            }
          }}
        >
          <span className="font-bold text-pink">nível {pet.level}</span>
          <span className="h-1 w-16 overflow-hidden rounded-full bg-white/10">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-pink to-lilac transition-all"
              style={{ width: `${xpInLevel}%` }}
            />
          </span>
          <span className="tabular-nums text-muted-foreground">{xpInLevel}/100</span>
        </button>
        {/* Feature #5: contador do casal — nomes vindos de couple_settings */}
        {editingNames ? (
          <div className="mt-1 flex items-center justify-center gap-1 text-[11px]">
            <input
              autoFocus
              value={oneDraft}
              onChange={(e) => setOneDraft(e.target.value.slice(0, 20))}
              className="w-16 rounded bg-white/10 px-1 text-center outline-none ring-1 ring-white/20"
              maxLength={20}
            />
            <span className="text-muted-foreground">&</span>
            <input
              value={twoDraft}
              onChange={(e) => setTwoDraft(e.target.value.slice(0, 20))}
              className="w-16 rounded bg-white/10 px-1 text-center outline-none ring-1 ring-white/20"
              maxLength={20}
            />
            <button
              onClick={savePartnerNames}
              className="ml-1 rounded bg-pink/20 px-1.5 text-pink"
              title="salvar"
            >✓</button>
            <button
              onClick={() => setEditingNames(false)}
              className="rounded px-1 text-muted-foreground"
              title="cancelar"
            >✕</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={startEditingNames}
            className="mt-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            title="renomear o casal"
          >
            {coupleInfo.isTodayAnniversary ? "🎉 " : "💗 "}
            {(partnerOne || "—").toLowerCase()} & {(partnerTwo || "—").toLowerCase()}
            {coupleInfo.label && <> · {coupleInfo.label}</>}
            {streak.days > 0 && (
              <span className="ml-2">{streak.emoji} {streak.label}</span>
            )}
          </button>
        )}
      </div>

      {/* Barra da vibe (sempre visível quando algo está tocando) */}
      {liveTrack && liveReaction && (
        <button
          type="button"
          onClick={() => setSpotifyOpen(true)}
          className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-[#1DB954]/15 to-[#1DB954]/5 p-3 text-left transition-all hover:from-[#1DB954]/25 hover:to-[#1DB954]/10 active:scale-[0.99]"
          title="Abrir painel do Spotify"
        >
          {liveTrack.album.images[0]?.url && (
            <img
              src={liveTrack.album.images[0].url}
              alt=""
              className="h-11 w-11 flex-shrink-0 rounded-lg object-cover shadow"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 flex-shrink-0 text-[#1DB954]" aria-hidden="true">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
              <p className="truncate text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                tocando · {vibeLabel(liveReaction.vibe)}
              </p>
            </div>
            <p className="mt-0.5 truncate text-sm font-semibold leading-tight">
              {liveTrack.name}
            </p>
            <p className="truncate text-[11px] italic text-muted-foreground">
              "{liveReaction.message}"
            </p>
          </div>
        </button>
      )}

      {/* mochi scene */}
      <div className="relative mt-2 flex justify-center">
        <FloatingHearts particles={particles} />
        <MochiSpeechBubble message={speech} />
        {/* Feature #10: sonhos do Mochi — ativo quando sleepy ou de madrugada */}
        <DreamBubbles active={mood === "sleepy" || new Date().getHours() < 5} />
        <Mochi
          mood={mood}
          eating={eating}
          bouncing={bouncing}
          skinId={rainbowMode ? "galaxy" : pet.equipped_skin}
          accessoryId={pet.equipped_accessory}
          hunger={pet.hunger}
          happiness={pet.happiness}
          energy={pet.energy}
          onPoke={(reaction) => {
            // micro-feedback: partículas + uma falinha curtinha do humor atual
            const map: Record<string, { emoji: string; line: string }> = {
              bite:       { emoji: "💢", line: "ai! tá com fominha 😼" },
              nuzzle:     { emoji: "💗", line: "que carinho gostoso 🥰" },
              yawn:       { emoji: "💤", line: "tô cansadinho... 😴" },
              giggle:     { emoji: "✨", line: "para! faz cócegas 😆" },
              "sad-look": { emoji: "💧", line: "me dá um colinho? 🥺" },
              blush:      { emoji: "💗", line: "oi, oi 💗" },
              startle:    { emoji: "❗", line: "uepa! me assustou 😳" },
            };
            const m = map[reaction];
            if (m) {
              burstParticles(m.emoji, 3);
              setSpeech(m.line);
              window.setTimeout(() => setSpeech(null), 2200);
            }
          }}
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
          className="rounded-2xl bg-gradient-to-r from-mint to-lilac px-3 py-4 font-display text-sm font-bold text-white shadow-[var(--shadow-glow)] transition-all active:scale-[0.97] disabled:opacity-50"
        >
          🎯 missões
        </button>
        <button
          onClick={() => setSpotifyOpen(true)}
          disabled={busy}
          aria-label="Spotify"
          className="flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#1DB954] to-[#0e8c3e] px-3 py-4 font-display text-white shadow-[var(--shadow-glow)] transition-all active:scale-[0.97] disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6" aria-hidden="true">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
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
        <button
          onClick={() => setNotesOpen(true)}
          className="glass relative rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97]"
        >
          💌 bilhete
          {unreadNotes > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-pink px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-background animate-pulse"
              aria-label={`${unreadNotes} bilhete${unreadNotes > 1 ? "s" : ""} não lido${unreadNotes > 1 ? "s" : ""}`}
            >
              +{unreadNotes}
            </span>
          )}
        </button>
        <button
          onClick={() => setAchievementsOpen(true)}
          className="glass rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97]"
        >
          🏅 conquistas
        </button>
        <button
          onClick={() => setGalleryOpen(true)}
          className="glass rounded-2xl px-2 py-3 font-display text-xs font-semibold transition-all active:scale-[0.97]"
        >
          📷 galeria
        </button>
        <Link
          to="/wordle"
          className="glass relative rounded-2xl px-2 py-3 text-center font-display text-xs font-semibold transition-all active:scale-[0.97]"
        >
          🔤 palavra
          {!wordlePlayedToday && (
            <span className="absolute -right-1 -top-1 rounded-full bg-pink px-1.5 py-0.5 text-[8px] font-bold text-white shadow-md ring-2 ring-background">
              🆕
            </span>
          )}
        </Link>
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

      {/* drawers — lazy-mount: só monta quando abre. Cada drawer abre seu
          próprio canal de realtime, então mantê-los desmontados quando
          fechados libera muito do mobile. */}
      {drawerOpen && (
        <FoodDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          partnerName={partnerName}
          petName={pet.pet_name}
          onPick={feed}
          busy={busy}
          onOpenQuests={() => setQuestsOpen(true)}
        />
      )}

      {questsOpen && (
        <QuestsDrawer
          open={questsOpen}
          onClose={() => setQuestsOpen(false)}
          partnerName={partnerName}
          petName={pet.pet_name}
          onCompleted={(msg) => showToast(msg)}
        />
      )}

      {wardrobeOpen && (
        <WardrobeDrawer
          open={wardrobeOpen}
          onClose={() => setWardrobeOpen(false)}
          currentSkin={pet.equipped_skin}
          currentAccessory={pet.equipped_accessory}
          onSave={saveOutfit}
        />
      )}

      {backgroundOpen && (
        <BackgroundDrawer
          open={backgroundOpen}
          onClose={() => setBackgroundOpen(false)}
          current={backgroundId}
          onSelect={pickBackground}
        />
      )}

      {photosOpen && (
        <PhotosDrawer
          open={photosOpen}
          onClose={() => setPhotosOpen(false)}
          partnerName={partnerName}
          onShowToMochi={showPhoto}
          onError={(msg) => showToast(msg)}
        />
      )}

      {notesOpen && (
        <LoveNotesDrawer
          partnerName={partnerName}
          otherPartnerName={
            partnerName.toLowerCase() === partnerOne.toLowerCase() ? partnerTwo : partnerOne
          }
          open={notesOpen}
          onOpenChange={setNotesOpen}
          onNewNote={() => {
            showToast("bilhetinho enviado 💌");
            burstParticles("💌", 4);
          }}
        />
      )}

      {achievementsOpen && (
        <AchievementsDrawer
          open={achievementsOpen}
          onOpenChange={setAchievementsOpen}
        />
      )}

      {galleryOpen && (
        <GalleryDrawer
          open={galleryOpen}
          onOpenChange={setGalleryOpen}
          fallbackSkin={pet.equipped_skin}
          fallbackAccessory={pet.equipped_accessory}
          fallbackMood={mood}
        />
      )}

      </div>
    </div>
  );
}
