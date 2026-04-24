export type SkinId = "cream" | "pink" | "lilac" | "mint" | "honey" | "midnight";
export type AccessoryId = "none" | "bow" | "tophat" | "crown" | "glasses" | "flower" | "scarf";

export interface Skin {
  id: SkinId;
  label: string;
  emoji: string;
  body: string; // outer color
  bodyMid: string;
  bodyEdge: string;
  earInner: string;
}

export interface Accessory {
  id: AccessoryId;
  label: string;
  emoji: string;
}

export const SKINS: Skin[] = [
  {
    id: "cream",
    label: "Creme",
    emoji: "🤍",
    body: "oklch(0.99 0.02 80)",
    bodyMid: "oklch(0.95 0.04 50)",
    bodyEdge: "oklch(0.85 0.06 30)",
    earInner: "oklch(0.78 0.14 10 / 0.6)",
  },
  {
    id: "pink",
    label: "Rosé",
    emoji: "🌸",
    body: "oklch(0.95 0.05 0)",
    bodyMid: "oklch(0.86 0.1 0)",
    bodyEdge: "oklch(0.74 0.15 5)",
    earInner: "oklch(0.7 0.18 0 / 0.7)",
  },
  {
    id: "lilac",
    label: "Lilás",
    emoji: "💜",
    body: "oklch(0.93 0.05 300)",
    bodyMid: "oklch(0.83 0.1 295)",
    bodyEdge: "oklch(0.72 0.14 290)",
    earInner: "oklch(0.65 0.18 295 / 0.7)",
  },
  {
    id: "mint",
    label: "Menta",
    emoji: "🌿",
    body: "oklch(0.95 0.05 165)",
    bodyMid: "oklch(0.86 0.1 165)",
    bodyEdge: "oklch(0.75 0.13 160)",
    earInner: "oklch(0.68 0.15 160 / 0.7)",
  },
  {
    id: "honey",
    label: "Mel",
    emoji: "🍯",
    body: "oklch(0.95 0.07 80)",
    bodyMid: "oklch(0.85 0.12 70)",
    bodyEdge: "oklch(0.72 0.15 60)",
    earInner: "oklch(0.65 0.16 50 / 0.7)",
  },
  {
    id: "midnight",
    label: "Noite",
    emoji: "🌙",
    body: "oklch(0.45 0.05 290)",
    bodyMid: "oklch(0.32 0.06 290)",
    bodyEdge: "oklch(0.22 0.05 290)",
    earInner: "oklch(0.6 0.18 320 / 0.6)",
  },
];

export const ACCESSORIES: Accessory[] = [
  { id: "none", label: "Nenhum", emoji: "✨" },
  { id: "bow", label: "Lacinho", emoji: "🎀" },
  { id: "tophat", label: "Cartola", emoji: "🎩" },
  { id: "crown", label: "Coroa", emoji: "👑" },
  { id: "glasses", label: "Oculinhos", emoji: "🤓" },
  { id: "flower", label: "Florzinha", emoji: "🌼" },
  { id: "scarf", label: "Cachecol", emoji: "🧣" },
];

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function getAccessory(id: string): Accessory {
  return ACCESSORIES.find((a) => a.id === id) ?? ACCESSORIES[0];
}
