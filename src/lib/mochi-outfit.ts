// ============= Mochi outfit types & storage =============

export type HatId =
  | "none"
  | "tophat"
  | "beret_lilac"
  | "beanie_mint"
  | "crown"
  | "flower_cream";

export type BowId =
  | "none"
  | "lilac"
  | "mint"
  | "cream"
  | "necktie_lilac";

export type GlassesId =
  | "none"
  | "round_cream"
  | "sun_lilac"
  | "heart_mint";

export type ShirtId =
  | "none"
  | "stripe_mint"
  | "hoodie_lilac"
  | "sweater_cream"
  | "scarf_mint";

export type OutfitItemId = HatId | BowId | GlassesId | ShirtId;
export type OutfitCategory = "hat" | "bow" | "glasses" | "shirt";

export interface Outfit {
  hat: HatId;
  bow: BowId;
  glasses: GlassesId;
  shirt: ShirtId;
}

export const DEFAULT_OUTFIT: Outfit = {
  hat: "none",
  bow: "lilac",
  glasses: "none",
  shirt: "none",
};

const OUTFIT_KEY = "mochi-outfit-v2";
const ENABLED_KEY = "mochi-outfit-enabled-v1";

export function loadOutfit(): Outfit {
  if (typeof window === "undefined") return DEFAULT_OUTFIT;
  try {
    const raw = window.localStorage.getItem(OUTFIT_KEY);
    if (!raw) return DEFAULT_OUTFIT;
    return { ...DEFAULT_OUTFIT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OUTFIT;
  }
}

export function saveOutfit(o: Outfit) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTFIT_KEY, JSON.stringify(o));
  } catch {
    // ignore
  }
}

export function loadEnabled(): Set<OutfitItemId> {
  if (typeof window === "undefined") return new Set(ALL_ITEM_IDS);
  try {
    const raw = window.localStorage.getItem(ENABLED_KEY);
    if (!raw) return new Set(ALL_ITEM_IDS);
    const arr = JSON.parse(raw) as OutfitItemId[];
    // "none" sempre habilitada — é o "tirar a roupa".
    return new Set([...arr, "none" as OutfitItemId]);
  } catch {
    return new Set(ALL_ITEM_IDS);
  }
}

export function saveEnabled(set: Set<OutfitItemId>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ENABLED_KEY, JSON.stringify([...set]));
  } catch {
    // ignore
  }
}

export interface OutfitOption<T extends string> {
  id: T;
  label: string;
  emoji: string;
}

export const HAT_OPTIONS: OutfitOption<HatId>[] = [
  { id: "none", label: "nenhum", emoji: "🚫" },
  { id: "beret_lilac", label: "boina lilás", emoji: "🎨" },
  { id: "beanie_mint", label: "gorro menta", emoji: "🧶" },
  { id: "tophat", label: "cartola", emoji: "🎩" },
  { id: "crown", label: "coroa", emoji: "👑" },
  { id: "flower_cream", label: "florzinha", emoji: "🌸" },
];

export const BOW_OPTIONS: OutfitOption<BowId>[] = [
  { id: "none", label: "nenhum", emoji: "🚫" },
  { id: "lilac", label: "laço lilás", emoji: "🎀" },
  { id: "mint", label: "laço menta", emoji: "💚" },
  { id: "cream", label: "laço creme", emoji: "🤍" },
  { id: "necktie_lilac", label: "gravatinha", emoji: "👔" },
];

export const GLASSES_OPTIONS: OutfitOption<GlassesId>[] = [
  { id: "none", label: "nenhum", emoji: "🚫" },
  { id: "round_cream", label: "redondo creme", emoji: "👓" },
  { id: "sun_lilac", label: "óculos de sol", emoji: "🕶️" },
  { id: "heart_mint", label: "coração", emoji: "💚" },
];

export const SHIRT_OPTIONS: OutfitOption<ShirtId>[] = [
  { id: "none", label: "nenhuma", emoji: "🚫" },
  { id: "stripe_mint", label: "listrada menta", emoji: "👕" },
  { id: "hoodie_lilac", label: "moletom lilás", emoji: "🧥" },
  { id: "sweater_cream", label: "tricô creme", emoji: "🧶" },
  { id: "scarf_mint", label: "cachecol menta", emoji: "🧣" },
];

export const ALL_ITEM_IDS: OutfitItemId[] = [
  ...HAT_OPTIONS.map((o) => o.id),
  ...BOW_OPTIONS.map((o) => o.id),
  ...GLASSES_OPTIONS.map((o) => o.id),
  ...SHIRT_OPTIONS.map((o) => o.id),
];

export const CATEGORY_TITLES: Record<OutfitCategory, string> = {
  hat: "chapéu",
  bow: "laço",
  glasses: "óculos",
  shirt: "roupinha",
};

// Paleta unificada (referência)
export const PALETTE = {
  lilac: "#c9b3ff",
  lilacDark: "#8a6fd4",
  mint: "#a8e6cf",
  mintDark: "#5fb89a",
  cream: "#fff3d6",
  creamDark: "#d4b88a",
  ink: "#3a2a4a",
} as const;
