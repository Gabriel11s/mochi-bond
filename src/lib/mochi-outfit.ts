// ============= Mochi outfit types & storage =============

export type HatId = "none" | "tophat" | "beret" | "beanie" | "crown";
export type BowId = "none" | "pink" | "red" | "blue" | "necktie";
export type GlassesId = "none" | "round" | "sun" | "heart";
export type ShirtId = "none" | "stripe" | "hoodie" | "overall" | "sweater";

export interface Outfit {
  hat: HatId;
  bow: BowId;
  glasses: GlassesId;
  shirt: ShirtId;
}

export const DEFAULT_OUTFIT: Outfit = {
  hat: "none",
  bow: "pink",
  glasses: "none",
  shirt: "none",
};

const KEY = "mochi-outfit-v1";

export function loadOutfit(): Outfit {
  if (typeof window === "undefined") return DEFAULT_OUTFIT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_OUTFIT;
    return { ...DEFAULT_OUTFIT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_OUTFIT;
  }
}

export function saveOutfit(o: Outfit) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(o));
  } catch {
    // ignore
  }
}

export const HAT_OPTIONS: { id: HatId; label: string; emoji: string }[] = [
  { id: "none", label: "nenhum", emoji: "🚫" },
  { id: "tophat", label: "cartola", emoji: "🎩" },
  { id: "beret", label: "boina", emoji: "🎨" },
  { id: "beanie", label: "gorrinho", emoji: "🧶" },
  { id: "crown", label: "coroa", emoji: "👑" },
];

export const BOW_OPTIONS: { id: BowId; label: string; emoji: string }[] = [
  { id: "none", label: "nenhum", emoji: "🚫" },
  { id: "pink", label: "rosa", emoji: "🎀" },
  { id: "red", label: "vermelho", emoji: "❤️" },
  { id: "blue", label: "azul", emoji: "💙" },
  { id: "necktie", label: "gravatinha", emoji: "👔" },
];

export const GLASSES_OPTIONS: { id: GlassesId; label: string; emoji: string }[] = [
  { id: "none", label: "nenhum", emoji: "🚫" },
  { id: "round", label: "redondo", emoji: "👓" },
  { id: "sun", label: "sol", emoji: "🕶️" },
  { id: "heart", label: "coração", emoji: "💖" },
];

export const SHIRT_OPTIONS: { id: ShirtId; label: string; emoji: string }[] = [
  { id: "none", label: "nenhuma", emoji: "🚫" },
  { id: "stripe", label: "listrada", emoji: "👕" },
  { id: "hoodie", label: "moletom", emoji: "🧥" },
  { id: "overall", label: "jardineira", emoji: "👖" },
  { id: "sweater", label: "tricô", emoji: "🧶" },
];
