// Feature #6: Streak de cuidado — dias consecutivos que AMBOS alimentaram

import { supabase } from "@/integrations/supabase/client";

export interface StreakInfo {
  days: number;
  emoji: string;
  label: string;
  brokeToday: boolean;
}

export async function computeStreak(): Promise<StreakInfo> {
  // Busca as últimas 60 interações de feed
  const { data } = await supabase
    .from("interactions")
    .select("partner_name, created_at")
    .eq("interaction_type", "feed")
    .order("created_at", { ascending: false })
    .limit(120);

  if (!data || data.length === 0) {
    return { days: 0, emoji: "", label: "", brokeToday: false };
  }

  // Agrupa por dia (YYYY-MM-DD)
  const byDay = new Map<string, Set<string>>();
  for (const row of data) {
    const day = row.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, new Set());
    byDay.get(day)!.add(row.partner_name);
  }

  // Conta dias consecutivos de trás pra frente onde AMBOS alimentaram
  const today = new Date();
  let streak = 0;
  let brokeToday = false;

  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const partners = byDay.get(key);

    // Hoje pode não ter sido alimentado ainda — não quebra o streak
    if (i === 0) {
      if (partners && partners.size >= 2) {
        streak++;
      } else {
        // Hoje ainda não completaram — não conta mas não quebra
        brokeToday = !partners || partners.size < 2;
        continue;
      }
    } else {
      if (partners && partners.size >= 2) {
        streak++;
      } else {
        break;
      }
    }
  }

  const emoji =
    streak >= 15 ? "🔥🔥🔥" :
    streak >= 8 ? "🔥🔥" :
    streak >= 1 ? "🔥" : "";

  const label = streak === 0 ? "" : `${streak} dia${streak > 1 ? "s" : ""} seguido${streak > 1 ? "s" : ""}`;

  return { days: streak, emoji, label, brokeToday };
}
