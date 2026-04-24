// Cenários cute pro pet — todos renderizados em CSS/SVG, leves e themáveis.
// Cada um define cores de céu, chão e elementos decorativos pra montar a cena.

export type BackgroundId =
  | "quartinho"
  | "biblioteca"
  | "cinema"
  | "cafe"
  | "jardim"
  | "praia"
  | "espaco"
  | "floresta"
  | "cozinha"
  | "loja-doces"
  | "ateliê"
  | "trem-noite"
  | "ski"
  | "aquario";

export interface BackgroundScene {
  id: BackgroundId;
  label: string;
  emoji: string;
  hint: string;
  // gradiente do "céu" / parede de fundo
  sky: string;
  // gradiente do chão (parte inferior)
  floor: string;
  // accent das luzinhas/partículas
  accent: string;
}

export const BACKGROUNDS: BackgroundScene[] = [
  {
    id: "quartinho",
    label: "Quartinho",
    emoji: "🛏️",
    hint: "o cantinho original — fofo e aconchegante",
    sky: "linear-gradient(180deg, oklch(0.32 0.07 320) 0%, oklch(0.24 0.06 305) 60%, oklch(0.2 0.05 290) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.42 0.08 30 / 0.55) 60%, oklch(0.36 0.09 25 / 0.85) 100%)",
    accent: "oklch(0.85 0.14 350)",
  },
  {
    id: "biblioteca",
    label: "Biblioteca",
    emoji: "📚",
    hint: "estantes infinitas e luz quentinha de abajur",
    sky: "linear-gradient(180deg, oklch(0.28 0.05 60) 0%, oklch(0.22 0.05 50) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.32 0.08 45) 50%, oklch(0.24 0.07 40) 100%)",
    accent: "oklch(0.85 0.16 75)",
  },
  {
    id: "cinema",
    label: "Cinema",
    emoji: "🎬",
    hint: "tela gigante, poltrona vermelha, balde de pipoca",
    sky: "linear-gradient(180deg, oklch(0.16 0.02 280) 0%, oklch(0.12 0.02 280) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.32 0.18 25 / 0.7) 50%, oklch(0.24 0.16 20) 100%)",
    accent: "oklch(0.85 0.18 30)",
  },
  {
    id: "cafe",
    label: "Cafeteria",
    emoji: "☕",
    hint: "vapor de café e luzinhas penduradas",
    sky: "linear-gradient(180deg, oklch(0.42 0.06 50) 0%, oklch(0.32 0.06 45) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.4 0.09 40) 50%, oklch(0.3 0.08 35) 100%)",
    accent: "oklch(0.88 0.14 70)",
  },
  {
    id: "jardim",
    label: "Jardim",
    emoji: "🌷",
    hint: "céu rosa de tarde + flores e borboletas",
    sky: "linear-gradient(180deg, oklch(0.85 0.1 30) 0%, oklch(0.78 0.13 350) 50%, oklch(0.7 0.13 320) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.78 0.16 145 / 0.7) 50%, oklch(0.55 0.18 140) 100%)",
    accent: "oklch(0.92 0.13 350)",
  },
  {
    id: "praia",
    label: "Praia",
    emoji: "🏖️",
    hint: "pôr do sol no mar com palmeira",
    sky: "linear-gradient(180deg, oklch(0.78 0.13 30) 0%, oklch(0.7 0.18 15) 40%, oklch(0.55 0.18 350) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.55 0.14 230 / 0.55) 40%, oklch(0.85 0.07 75) 80%, oklch(0.78 0.09 70) 100%)",
    accent: "oklch(0.92 0.15 70)",
  },
  {
    id: "espaco",
    label: "Espaço",
    emoji: "🪐",
    hint: "estrelas, planetas e via láctea",
    sky: "radial-gradient(ellipse at 30% 20%, oklch(0.32 0.14 290) 0%, oklch(0.14 0.06 280) 50%, oklch(0.08 0.04 280) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.18 0.08 290 / 0.6) 60%, oklch(0.12 0.06 280) 100%)",
    accent: "oklch(0.92 0.12 280)",
  },
  {
    id: "floresta",
    label: "Floresta",
    emoji: "🌲",
    hint: "raios de sol entre os pinheiros",
    sky: "linear-gradient(180deg, oklch(0.58 0.1 145) 0%, oklch(0.42 0.1 150) 60%, oklch(0.3 0.09 155) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.45 0.12 140 / 0.7) 50%, oklch(0.32 0.1 140) 100%)",
    accent: "oklch(0.92 0.14 100)",
  },
  {
    id: "cozinha",
    label: "Cozinha",
    emoji: "🍳",
    hint: "azulejos quadriculados e potinhos de tempero",
    sky: "linear-gradient(180deg, oklch(0.92 0.04 75) 0%, oklch(0.86 0.06 70) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.78 0.08 60) 60%, oklch(0.65 0.09 55) 100%)",
    accent: "oklch(0.78 0.16 30)",
  },
  {
    id: "loja-doces",
    label: "Doceria",
    emoji: "🍭",
    hint: "balas, donuts e prateleiras coloridas",
    sky: "linear-gradient(180deg, oklch(0.92 0.08 350) 0%, oklch(0.85 0.12 330) 50%, oklch(0.8 0.13 310) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.88 0.1 350 / 0.8) 50%, oklch(0.78 0.13 340) 100%)",
    accent: "oklch(0.92 0.16 350)",
  },
  {
    id: "ateliê",
    label: "Ateliê",
    emoji: "🎨",
    hint: "pincéis, telas e respingos de tinta",
    sky: "linear-gradient(180deg, oklch(0.88 0.06 90) 0%, oklch(0.8 0.07 75) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.62 0.1 50) 50%, oklch(0.5 0.11 45) 100%)",
    accent: "oklch(0.78 0.18 25)",
  },
  {
    id: "trem-noite",
    label: "Trem da noite",
    emoji: "🚂",
    hint: "janela do trem com cidade passando à noite",
    sky: "linear-gradient(180deg, oklch(0.18 0.05 280) 0%, oklch(0.22 0.08 290) 50%, oklch(0.28 0.1 305) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.2 0.04 280 / 0.85) 60%, oklch(0.14 0.03 280) 100%)",
    accent: "oklch(0.92 0.16 80)",
  },
  {
    id: "ski",
    label: "Cabana de neve",
    emoji: "⛷️",
    hint: "neve caindo e lareira quentinha",
    sky: "linear-gradient(180deg, oklch(0.78 0.04 240) 0%, oklch(0.85 0.03 230) 50%, oklch(0.92 0.02 220) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.96 0.01 240) 30%, oklch(0.92 0.02 230) 100%)",
    accent: "oklch(0.95 0.04 240)",
  },
  {
    id: "aquario",
    label: "Aquário",
    emoji: "🐠",
    hint: "submerso entre peixinhos e bolhas",
    sky: "linear-gradient(180deg, oklch(0.55 0.13 220) 0%, oklch(0.42 0.14 225) 50%, oklch(0.32 0.13 230) 100%)",
    floor: "linear-gradient(180deg, transparent 0%, oklch(0.42 0.1 200 / 0.7) 50%, oklch(0.78 0.09 75 / 0.7) 100%)",
    accent: "oklch(0.92 0.13 200)",
  },
];

export function getBackground(id: string): BackgroundScene {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}

const STORAGE_KEY = "mochi-bg";

export function loadBackgroundId(): BackgroundId {
  if (typeof window === "undefined") return "quartinho";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved && BACKGROUNDS.find((b) => b.id === saved)) {
    return saved as BackgroundId;
  }
  return "quartinho";
}

export function saveBackgroundId(id: BackgroundId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}
