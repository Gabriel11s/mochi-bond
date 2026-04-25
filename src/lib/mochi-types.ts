export type Mood = "happy" | "hungry" | "sleepy" | "excited" | "sad" | "idle" | "eating" | "smitten";

export type Rarity = "common" | "uncommon" | "rare" | "special";

export interface PetState {
  id: number;
  pet_name: string;
  hunger: number;
  happiness: number;
  energy: number;
  xp: number;
  level: number;
  current_mood: Mood;
  last_fed_at: string | null;
  last_interaction_at: string | null;
  last_interaction_by: string | null;
  updated_at: string;
  equipped_skin: string;
  equipped_accessory: string;
  last_fed_by_gab: string | null;
  last_fed_by_tita: string | null;
  died_at: string | null;
}

export interface FoodItem {
  id: string;
  name: string;
  emoji: string;
  category: string;
  hunger_value: number;
  happiness_value: number;
  energy_value: number;
  rarity: Rarity;
  is_active: boolean;
  is_unlockable?: boolean;
}

export type QuestCategory = "casa" | "casal" | "dupla" | "romantico" | "mundo";

export interface Quest {
  id: string;
  slug: string;
  title: string;
  hint: string;
  emoji: string;
  proof_type: string;
  proof_target: string;
  category: QuestCategory;
  reward_food_rarity: Rarity;
  reward_food_count: number;
  reward_xp: number;
  cooldown_minutes: number;
  is_active: boolean;
}

export type QuestVibe = "bonitinho" | "feio" | "meh";

export interface QuestCompletion {
  id: string;
  quest_id: string;
  partner_name: string;
  photo_id: string | null;
  photo_path: string | null;
  status: "pending" | "approved" | "rejected";
  ai_reason: string | null;
  cuteness: number | null;
  vibe: QuestVibe | null;
  created_at: string;
}

export interface PantryItem {
  id: string;
  partner_name: string;
  food_id: string;
  source_quest_id: string | null;
  consumed: boolean;
  consumed_at: string | null;
  created_at: string;
}

export interface PantryItemWithFood extends PantryItem {
  food: FoodItem;
}

export interface Interaction {
  id: string;
  partner_name: string;
  interaction_type: string;
  food_id: string | null;
  food_name: string | null;
  food_emoji: string | null;
  hunger_delta: number;
  happiness_delta: number;
  energy_delta: number;
  xp_delta: number;
  message: string | null;
  created_at: string;
}

export interface CoupleSettings {
  id: number;
  secret_code: string;
  partner_one_name: string;
  partner_two_name: string;
}

export const RARITY_XP: Record<Rarity, number> = {
  common: 5,
  uncommon: 10,
  rare: 20,
  special: 35,
};

export function computeMood(hunger: number, happiness: number, energy: number): Mood {
  // Prioridade: estados negativos pegam primeiro pra forçar atenção do casal
  if (hunger < 30) return "hungry";
  if (energy < 28) return "sleepy";
  if (happiness < 35) return "sad";
  if (happiness > 80 && hunger > 60 && energy > 60) return "happy";
  return "idle";
}

export function moodLabel(mood: Mood): string {
  switch (mood) {
    case "happy": return "está feliz";
    case "hungry": return "está com fome";
    case "sleepy": return "tá com soninho";
    case "excited": return "tá animadinho";
    case "sad": return "tá meio cabisbaixo";
    case "eating": return "comendo";
    case "smitten": return "apaixonadinho";
    default: return "tá tranquilo";
  }
}

export function moodCopy(mood: Mood): string {
  switch (mood) {
    case "happy": return "Tá de bom humor hoje";
    case "hungry": return "Acho que quer um lanchinho";
    case "sleepy": return "Bocejou três vezes seguidas";
    case "excited": return "Tá animadinho";
    case "sad": return "Tá meio pra baixo";
    case "eating": return "Mastigando devagarzinho";
    case "smitten": return "Curtiu bastante a foto ✨";
    default: return "Tá tranquilo no quartinho";
  }
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

// Decay base por hora — calibrado pra zerar em ~16-20h sem cuidado
// (versus os ~33-50h antigos, que eram leniente demais).
export const DECAY_PER_HOUR = {
  hunger: 6,      // mais agressivo: come a cada poucas horas
  happiness: 4,   // queda firme se ninguém aparece
  energy: 4,      // descansa dormindo, gasta acordado
};

// Energia recupera SOZINHA enquanto Mochi dorme (madrugada).
// Outras stats só sobem com cuidado humano.
const ENERGY_REGEN_NIGHT = 3;

// Modificador de decay por hora do dia — Mochi dorme de madrugada, então
// gasta menos energia/fome nesse período. De dia, ritmo normal.
function timePhaseMultiplier(hour: number): { decay: number; energyRegen: boolean } {
  // Madrugada / Mochi dormindo (00-07): metade do decay, regenera energia
  if (hour >= 0 && hour < 7) return { decay: 0.5, energyRegen: true };
  // Manhã ativa (07-11)
  if (hour < 11) return { decay: 1.0, energyRegen: false };
  // Pico do dia (11-19) — decay máximo, Mochi mais ativo
  if (hour < 19) return { decay: 1.15, energyRegen: false };
  // Noite (19-22) — começando a desacelerar
  if (hour < 22) return { decay: 0.9, energyRegen: false };
  // Pré-sono (22-24)
  return { decay: 0.7, energyRegen: false };
}

// Penalidade quando uma stat está crítica: cai +50% mais rápido pra
// pressionar o casal a cuidar antes de morrer.
function criticalMultiplier(value: number): number {
  if (value < 25) return 1.5;
  if (value < 15) return 1.8; // unreachable na prática mas explícito
  return 1.0;
}

// Aplica decaimento natural baseado em quanto tempo passou desde updated_at.
// Faz amostragem por hora pra que o multiplicador de fase do dia mude
// corretamente quando o intervalo cruza várias faixas (ex: deixou aberto
// das 18h às 9h da manhã).
export function applyDecay(pet: PetState): PetState {
  if (!pet.updated_at) return pet;
  const lastTs = new Date(pet.updated_at).getTime();
  const elapsedMs = Date.now() - lastTs;
  if (elapsedMs <= 0) return pet;

  let hunger = pet.hunger;
  let happiness = pet.happiness;
  let energy = pet.energy;

  // Avança em buckets de 1h pra que mudanças de fase sejam respeitadas.
  // Cap em 48h pra evitar loop absurdo se o pet ficou esquecido por dias.
  const totalHours = Math.min(elapsedMs / 3600000, 48);
  const STEP = 0.25; // 15 min por iteração — suficiente pra suavizar
  let remaining = totalHours;
  let cursor = lastTs;

  while (remaining > 0) {
    const step = Math.min(STEP, remaining);
    const hour = new Date(cursor).getHours();
    const { decay, energyRegen } = timePhaseMultiplier(hour);

    hunger = clamp(
      hunger - DECAY_PER_HOUR.hunger * decay * criticalMultiplier(hunger) * step
    );
    happiness = clamp(
      happiness - DECAY_PER_HOUR.happiness * decay * criticalMultiplier(happiness) * step
    );
    if (energyRegen) {
      // Mochi dormindo: recupera energia em vez de perder
      energy = clamp(energy + ENERGY_REGEN_NIGHT * step);
    } else {
      energy = clamp(
        energy - DECAY_PER_HOUR.energy * decay * criticalMultiplier(energy) * step
      );
    }

    remaining -= step;
    cursor += step * 3600000;
  }

  return {
    ...pet,
    hunger,
    happiness,
    energy,
    current_mood: computeMood(hunger, happiness, energy),
  };
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "ainda não cuidaram dele";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "agora mesmo";
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}
