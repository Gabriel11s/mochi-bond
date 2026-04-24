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

export type QuestCategory = "casa" | "casal" | "romantico";

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
  if (hunger < 25) return "hungry";
  if (energy < 25) return "sleepy";
  if (happiness > 75) return "happy";
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
    case "happy": return "Hoje ele tá radiante";
    case "hungry": return "Acho que ele quer um lanchinho";
    case "sleepy": return "Bocejou três vezes seguidas";
    case "excited": return "Tá pulando de alegria";
    case "sad": return "Precisa de um pouquinho de carinho";
    case "eating": return "Mastigando devagarzinho";
    case "smitten": return "Derretendo com a fotinho de vocês 💗";
    default: return "Tá curtindo o quartinho";
  }
}

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
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
