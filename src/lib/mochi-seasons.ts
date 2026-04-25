// Feature #8 (ciclo dia/noite) + Feature #9 (estações/datas especiais)
// + Feature #5 (contador do casal — datas: 05/09 e 09/03)

export type Season = "normal" | "natal" | "halloween" | "namorados" | "aniversario1" | "aniversario2";

export interface SeasonTheme {
  id: Season;
  label: string;
  emoji: string;
  particles: string[];  // emojis pra chuva de partículas
  greeting?: string;    // frase temática do Mochi
  accessory?: string;   // acessório temporário no Mochi
}

const SEASON_THEMES: Record<Season, SeasonTheme> = {
  normal: { id: "normal", label: "", emoji: "", particles: [] },
  natal: {
    id: "natal",
    label: "Natal",
    emoji: "🎄",
    particles: ["❄️", "🎄", "⭐", "🎅", "🎁"],
    greeting: "feliz natal! 🎄 eu queria uma comidinha de presente!",
    accessory: "beanie",
  },
  halloween: {
    id: "halloween",
    label: "Halloween",
    emoji: "🎃",
    particles: ["🎃", "👻", "🦇", "🕸️", "🍬"],
    greeting: "boo! 👻 gostosuras ou travessuras?",
    accessory: "horns",
  },
  namorados: {
    id: "namorados",
    label: "Dia dos Namorados",
    emoji: "💘",
    particles: ["💗", "💕", "💞", "💝", "❤️‍🔥"],
    greeting: "feliz dia dos namorados! vocês são tudo pra mim 💘",
  },
  aniversario1: {
    id: "aniversario1",
    label: "Aniversário ❤️",
    emoji: "🎂",
    particles: ["🎂", "🎉", "🎊", "💗", "🥳", "✨"],
    greeting: "parabéns pelo aniversário de vocês! 🎂💗 eu amo esse dia!",
  },
  aniversario2: {
    id: "aniversario2",
    label: "Aniversário ❤️",
    emoji: "🎂",
    particles: ["🎂", "🎉", "🎊", "💗", "🥳", "✨"],
    greeting: "outro aniversário de vocês! 🎂💗 que dia especial!",
  },
};

// Datas especiais (mês 0-indexed)
const SPECIAL_DATES: Array<{ month: number; day: number; season: Season }> = [
  // Natal: 1-25 dez
  ...Array.from({ length: 25 }, (_, i) => ({ month: 11, day: i + 1, season: "natal" as Season })),
  // Halloween: 25-31 out
  ...Array.from({ length: 7 }, (_, i) => ({ month: 9, day: 25 + i, season: "halloween" as Season })),
  // Dia dos Namorados BR: 12 jun
  { month: 5, day: 12, season: "namorados" as Season },
  // Aniversário 1: 05/09
  { month: 8, day: 5, season: "aniversario1" as Season },
  // Aniversário 2: 09/03
  { month: 2, day: 9, season: "aniversario2" as Season },
];

export function getCurrentSeason(): Season {
  const now = new Date();
  const m = now.getMonth();
  const d = now.getDate();
  const match = SPECIAL_DATES.find((s) => s.month === m && s.day === d);
  return match?.season ?? "normal";
}

export function getSeasonTheme(): SeasonTheme {
  return SEASON_THEMES[getCurrentSeason()];
}

// Feature #8: ciclo dia/noite
export type DayPhase = "dawn" | "day" | "sunset" | "night" | "late-night";

export function getDayPhase(): DayPhase {
  const h = new Date().getHours();
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 17) return "day";
  if (h >= 17 && h < 20) return "sunset";
  if (h >= 20 || h < 1) return "night";
  return "late-night";
}

export function getDayPhaseOverlay(): { bg: string; opacity: number } | null {
  const phase = getDayPhase();
  switch (phase) {
    case "dawn":
      return { bg: "linear-gradient(180deg, oklch(0.7 0.12 30 / 0.15), transparent)", opacity: 0.3 };
    case "sunset":
      return { bg: "linear-gradient(180deg, oklch(0.6 0.15 25 / 0.2), oklch(0.4 0.1 280 / 0.1))", opacity: 0.35 };
    case "night":
      return { bg: "linear-gradient(180deg, oklch(0.15 0.06 260 / 0.4), oklch(0.1 0.04 280 / 0.3))", opacity: 0.45 };
    case "late-night":
      return { bg: "linear-gradient(180deg, oklch(0.1 0.04 280 / 0.5), oklch(0.08 0.03 290 / 0.4))", opacity: 0.5 };
    default:
      return null;
  }
}

// Feature #5: contador do casal
// Recebe a data de início (vinda de couple_settings.created_at). Se nada
// for passado, devolve estado vazio em vez de chutar uma data.

export function getDaysTogetherInfo(startDate: Date | null | undefined): {
  days: number;
  label: string;
  milestone: string | null;
  isTodayAnniversary: boolean;
} {
  if (!startDate) {
    return { days: 0, label: "", milestone: null, isTodayAnniversary: false };
  }
  const now = new Date();
  const days = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / 86400000));

  // Milestones
  let milestone: string | null = null;
  if (days === 100) milestone = "🎂 100 dias juntos!";
  else if (days === 200) milestone = "✨ 200 dias juntos!";
  else if (days === 365) milestone = "🎉 1 ano juntos!";
  else if (days === 500) milestone = "🌟 500 dias juntos!";
  else if (days === 730) milestone = "💗 2 anos juntos!";
  else if (days === 1000) milestone = "👑 1000 dias juntos!";

  // Aniversário = mesmo dia/mês da data de início (a partir do 1º ano)
  const isTodayAnniversary =
    days >= 365 &&
    startDate.getMonth() === now.getMonth() &&
    startDate.getDate() === now.getDate();

  const label =
    days === 0 ? "começou hoje" :
    days === 1 ? "1 dia juntos" :
    `${days} dias juntos`;

  return { days, label, milestone, isTodayAnniversary };
}
