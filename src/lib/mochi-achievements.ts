// Feature #11: Conquistas do Casal — achievements desbloqueáveis
import { supabase } from "@/integrations/supabase/client";
import { BACKGROUNDS } from "@/lib/mochi-backgrounds";

export interface AchievementDef {
  key: string;
  label: string;
  emoji: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_meal", label: "Primeiro Jantar", emoji: "🍙", description: "Alimentar pela primeira vez" },
  { key: "fashionista", label: "Fashionista", emoji: "🎨", description: "Trocar a skin 5 vezes" },
  { key: "photographer", label: "Fotógrafos", emoji: "📸", description: "Enviar 10 fotos" },
  { key: "music_lover", label: "DJ do Quartinho", emoji: "🎵", description: "Ouvir 20 músicas no Spotify" },
  { key: "streak_7", label: "Dedicados", emoji: "🔥", description: "Streak de 7 dias seguidos" },
  { key: "streak_30", label: "Maratonistas", emoji: "🏆", description: "Streak de 30 dias seguidos" },
  { key: "explorer", label: "Exploradores", emoji: "🗺️", description: "Visitar todos os cenários" },
  { key: "love_letter", label: "Românticos", emoji: "💌", description: "Enviar 5 bilhetinhos" },
  { key: "night_owl", label: "Corujas", emoji: "🦉", description: "Visitar o Mochi de madrugada" },
  { key: "centenario", label: "Centenário", emoji: "💯", description: "100 dias juntos" },
  { key: "level_10", label: "Veteranos", emoji: "⭐", description: "Mochi chegar no nível 10" },
  { key: "full_closet", label: "Guarda-Roupa Cheio", emoji: "👗", description: "Ter 3+ acessórios equipados" },
];

export interface UnlockedAchievement {
  achievement_key: string;
  unlocked_at: string;
  partner_name: string | null;
}

export async function loadUnlocked(): Promise<Map<string, UnlockedAchievement>> {
  // Cast as any: tabela `achievements` ainda não regenerada nos tipos do Supabase
  const { data } = await (supabase as any)
    .from("achievements")
    .select("achievement_key, unlocked_at, partner_name");
  const map = new Map<string, UnlockedAchievement>();
  if (data) {
    for (const row of data as UnlockedAchievement[]) {
      map.set(row.achievement_key, row);
    }
  }
  return map;
}

export async function unlock(key: string, partnerName?: string): Promise<boolean> {
  const { error } = await (supabase as any).from("achievements").insert({
    achievement_key: key,
    partner_name: partnerName ?? null,
  });
  // error com código 23505 = unique violation = já desbloqueada
  return !error || error.code === "23505";
}

// ----------------------------------------------------------------------------
// Detector — roda todos os checks e desbloqueia o que for elegível.
// Retorna chaves NOVAS desbloqueadas pra mostrar toast no PetRoom.

export interface AchievementCheckInput {
  partnerName: string;
  petLevel: number;
  streakDays: number;
  daysTogether: number;
  visitedBackgrounds: number;     // count de cenários distintos visitados (localStorage)
  hourOfVisit: number;            // hora local quando entrou no app
}

const VISITED_BG_KEY = "mochi-visited-bgs";
const TOTAL_BACKGROUNDS = BACKGROUNDS.length;

export function trackBackgroundVisit(id: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(VISITED_BG_KEY);
    const set = new Set<string>(raw ? JSON.parse(raw) : []);
    set.add(id);
    window.localStorage.setItem(VISITED_BG_KEY, JSON.stringify([...set]));
    return set.size;
  } catch { return 0; }
}

export function getVisitedBackgroundCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(VISITED_BG_KEY);
    return raw ? new Set<string>(JSON.parse(raw)).size : 0;
  } catch { return 0; }
}

export async function checkAchievements(
  input: AchievementCheckInput
): Promise<string[]> {
  const unlocked = await loadUnlocked();
  const toUnlock: string[] = [];

  const eligible = (key: string, cond: boolean) => {
    if (cond && !unlocked.has(key)) toUnlock.push(key);
  };

  // Counts via Supabase (em paralelo)
  const [feedCount, photoCount, musicCount, noteCount] = await Promise.all([
    supabase.from("interactions").select("id", { count: "exact", head: true }).eq("interaction_type", "feed").then(r => r.count ?? 0),
    supabase.from("photos").select("id", { count: "exact", head: true }).then(r => r.count ?? 0),
    supabase.from("music_reactions").select("id", { count: "exact", head: true }).then(r => r.count ?? 0),
    (supabase as any).from("love_notes").select("id", { count: "exact", head: true }).then((r: any) => r.count ?? 0),
  ]);

  eligible("first_meal", feedCount >= 1);
  eligible("photographer", photoCount >= 10);
  eligible("music_lover", musicCount >= 20);
  eligible("love_letter", noteCount >= 5);
  eligible("streak_7", input.streakDays >= 7);
  eligible("streak_30", input.streakDays >= 30);
  eligible("centenario", input.daysTogether >= 100);
  eligible("level_10", input.petLevel >= 10);
  eligible("explorer", input.visitedBackgrounds >= TOTAL_BACKGROUNDS);
  eligible("night_owl", input.hourOfVisit >= 0 && input.hourOfVisit < 5);

  // Unlock em paralelo
  await Promise.all(toUnlock.map((k) => unlock(k, input.partnerName)));

  return toUnlock;
}

export function achievementLabel(key: string): string {
  return ACHIEVEMENTS.find((a) => a.key === key)?.label ?? key;
}

export function achievementEmoji(key: string): string {
  return ACHIEVEMENTS.find((a) => a.key === key)?.emoji ?? "🏅";
}
