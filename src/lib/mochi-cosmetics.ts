export type SkinId = string;
export type AccessoryId = string;

/** Slots — só pode ter 1 acessório por slot ao mesmo tempo
 *  (pra não ter 2 chapéus ou 2 óculos sobrepostos buggando). */
export type AccessorySlot = "hat" | "glasses" | "face" | "neck" | "body" | "none";

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
  slot: AccessorySlot;
}

// helper to build a skin from a single hue (oklch chroma curve)
function skinFromHue(
  id: string,
  label: string,
  emoji: string,
  hue: number,
  opts: { dark?: boolean; chroma?: number } = {},
): Skin {
  const c = opts.chroma ?? 1;
  if (opts.dark) {
    return {
      id,
      label,
      emoji,
      body: `oklch(0.5 ${0.06 * c} ${hue})`,
      bodyMid: `oklch(0.36 ${0.07 * c} ${hue})`,
      bodyEdge: `oklch(0.24 ${0.06 * c} ${hue})`,
      earInner: `oklch(0.6 ${0.18 * c} ${(hue + 30) % 360} / 0.6)`,
    };
  }
  return {
    id,
    label,
    emoji,
    body: `oklch(0.95 ${0.05 * c} ${hue})`,
    bodyMid: `oklch(0.85 ${0.1 * c} ${hue})`,
    bodyEdge: `oklch(0.73 ${0.14 * c} ${hue})`,
    earInner: `oklch(0.66 ${0.17 * c} ${hue} / 0.7)`,
  };
}

export const SKINS: Skin[] = [
  // originais
  skinFromHue("cream", "Creme", "🤍", 80, { chroma: 0.4 }),
  skinFromHue("pink", "Rosé", "🌸", 0),
  skinFromHue("lilac", "Lilás", "💜", 295),
  skinFromHue("mint", "Menta", "🌿", 165),
  skinFromHue("honey", "Mel", "🍯", 70),
  skinFromHue("midnight", "Noite", "🌙", 290, { dark: true }),
  // novas — claras
  skinFromHue("peach", "Pêssego", "🍑", 35),
  skinFromHue("strawberry", "Morango", "🍓", 15),
  skinFromHue("bubblegum", "Chiclete", "🍬", 350),
  skinFromHue("lavender", "Alfazema", "🪻", 280),
  skinFromHue("sky", "Céu", "☁️", 240),
  skinFromHue("ocean", "Oceano", "🌊", 220),
  skinFromHue("seafoam", "Espuma", "🐚", 190),
  skinFromHue("sage", "Sálvia", "🌱", 145),
  skinFromHue("matcha", "Matcha", "🍵", 130),
  skinFromHue("lemon", "Limão", "🍋", 100),
  skinFromHue("butter", "Manteiga", "🧈", 90, { chroma: 0.6 }),
  skinFromHue("apricot", "Damasco", "🌅", 55),
  skinFromHue("coral", "Coral", "🪸", 25),
  skinFromHue("rose", "Rosa", "🌹", 5),
  skinFromHue("orchid", "Orquídea", "🌷", 320),
  skinFromHue("grape", "Uva", "🍇", 305),
  // médias / saturadas
  { ...skinFromHue("cocoa", "Cacau", "🍫", 50), body: "oklch(0.7 0.08 50)", bodyMid: "oklch(0.55 0.09 45)", bodyEdge: "oklch(0.4 0.07 40)" },
  { ...skinFromHue("caramel", "Caramelo", "🍮", 65), body: "oklch(0.78 0.1 65)", bodyMid: "oklch(0.65 0.13 60)", bodyEdge: "oklch(0.5 0.12 55)" },
  { ...skinFromHue("rust", "Ferrugem", "🦊", 40), body: "oklch(0.7 0.13 40)", bodyMid: "oklch(0.58 0.15 35)", bodyEdge: "oklch(0.45 0.14 30)" },
  // escuras / especiais
  skinFromHue("storm", "Tempestade", "⛈️", 250, { dark: true }),
  skinFromHue("forest", "Floresta", "🌲", 150, { dark: true }),
  skinFromHue("wine", "Vinho", "🍷", 10, { dark: true }),
  skinFromHue("galaxy", "Galáxia", "🌌", 310, { dark: true, chroma: 1.4 }),
  // monocromático
  {
    id: "ghost",
    label: "Fantasma",
    emoji: "👻",
    body: "oklch(0.99 0 0)",
    bodyMid: "oklch(0.92 0 0)",
    bodyEdge: "oklch(0.82 0 0)",
    earInner: "oklch(0.7 0.05 320 / 0.5)",
  },
  {
    id: "shadow",
    label: "Sombra",
    emoji: "🖤",
    body: "oklch(0.35 0.01 300)",
    bodyMid: "oklch(0.22 0.01 300)",
    bodyEdge: "oklch(0.14 0.01 300)",
    earInner: "oklch(0.55 0.18 320 / 0.5)",
  },
];

export const ACCESSORIES: Accessory[] = [
  // originais
  { id: "none", label: "Nenhum", emoji: "✨" },
  { id: "bow", label: "Lacinho", emoji: "🎀" },
  { id: "tophat", label: "Cartola", emoji: "🎩" },
  { id: "crown", label: "Coroa", emoji: "👑" },
  { id: "glasses", label: "Oculinhos", emoji: "🤓" },
  { id: "flower", label: "Florzinha", emoji: "🌼" },
  { id: "scarf", label: "Cachecol", emoji: "🧣" },
  // novas (renderizadas no Mochi.tsx)
  { id: "beanie", label: "Toca", emoji: "🧢" },
  { id: "halo", label: "Auréola", emoji: "😇" },
  { id: "horns", label: "Chifrinhos", emoji: "😈" },
  { id: "headphones", label: "Headphone", emoji: "🎧" },
  { id: "headband", label: "Tiara", emoji: "👸" },
  { id: "leaf", label: "Folhinha", emoji: "🍃" },
  { id: "star", label: "Estrelinha", emoji: "⭐" },
  { id: "heart", label: "Coraçãozinho", emoji: "💗" },
  { id: "cherry", label: "Cerejinha", emoji: "🍒" },
  { id: "sunglasses", label: "Óculos sol", emoji: "😎" },
  { id: "victory", label: "Vitória", emoji: "🕶️" },
  { id: "monocle", label: "Monóculo", emoji: "🧐" },
  { id: "mustache", label: "Bigode", emoji: "👨" },
  { id: "tie", label: "Gravatinha", emoji: "👔" },
  { id: "necklace", label: "Colar", emoji: "💎" },
];

export function getSkin(id: string): Skin {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}

export function getAccessory(id: string): Accessory {
  return ACCESSORIES.find((a) => a.id === id) ?? ACCESSORIES[0];
}
