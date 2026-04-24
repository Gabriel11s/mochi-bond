// Decide a "vibe" do Mochi a partir das audio-features do Spotify
// E também pelo NOME do artista/faixa, com easter eggs por gosto da partner.

import { partnerKeyFromName, partnerEmoji } from "./mochi-greetings";

export type SpotifyVibe =
  | "hype" // dança, alta energia
  | "feliz" // valência alta
  | "chill" // energia baixa, valência média
  | "melanco" // valência baixa
  | "intensa" // metal/rock pesado, energia alta
  | "rock" // rock alternativo / pop punk
  | "neutra";

export interface AudioFeaturesLite {
  energy?: number | null;
  valence?: number | null;
  danceability?: number | null;
  tempo?: number | null;
}

export interface MochiMusicReaction {
  vibe: SpotifyVibe;
  happinessDelta: number;
  energyDelta: number;
  message: string;
  animation: "dance" | "sway" | "snug" | "pout" | "idle";
}

// ---------------------------------------------------------------------------
// Bandas favoritas da Tita: cada uma tem um comentário especial do Mochi.
// A chave é em lowercase pra dar match com o nome do artista.
const TITA_FAVORITES: Record<
  string,
  { vibe: SpotifyVibe; lines: string[] }
> = {
  "pierce the veil": {
    vibe: "intensa",
    lines: [
      "PIERCE THE VEIL?? eu sei que você tá no modo emo agora 🖤",
      "vic fuentes cantando e a tita tá feliz, eu sinto isso",
      "essa daqui é hino seu, eu já decorei junto",
    ],
  },
  "avenged sevenfold": {
    vibe: "intensa",
    lines: [
      "A7X tocando? você tá no modo selvagem hoje 🤘",
      "synyster gates fazendo solo e a tita brilhando",
      "essa banda mora no seu coração, eu sei",
    ],
  },
  "bring me the horizon": {
    vibe: "intensa",
    lines: [
      "BMTH? minha tita favorita escutando minha banda favorita dela 🖤",
      "oli sykes gritando e você sorrindo, combinação perfeita",
      "isso aqui é tipo terapia pra você, né?",
    ],
  },
  "linkin park": {
    vibe: "intensa",
    lines: [
      "LINKIN PARK?? agora sim a tita tá no clima 🖤",
      "chester pra sempre. você tá cantando junto, eu aposto",
      "essa daqui mexe com você de um jeito especial",
    ],
  },
  "bad omens": {
    vibe: "intensa",
    lines: [
      "BAD OMENS é a sua trilha sonora preferida ultimamente 🖤",
      "noah sebastian cantando e a tita derretendo",
      "se eu tivesse cabelo eu balançava junto com essa",
    ],
  },
};

// ---------------------------------------------------------------------------
// Heurística por palavra-chave no NOME do artista (rock/metal genérico).
// Vale pra qualquer partner; se for Tita, o tom é mais carinhoso.
const ROCK_KEYWORDS = [
  "metal",
  "rock",
  "punk",
  "core",
  "hardcore",
  "screamo",
  "emo",
];

function isRockArtist(artistName: string): boolean {
  const n = artistName.toLowerCase();
  return ROCK_KEYWORDS.some((kw) => n.includes(kw));
}

function findFavorite(artistNames: string[]) {
  for (const name of artistNames) {
    const key = name.toLowerCase().trim();
    if (TITA_FAVORITES[key]) return TITA_FAVORITES[key];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Classificador principal: combina audio-features (quando existem) com nome
// do artista. Audio-features podem vir null (Spotify limitou esse endpoint
// pra apps novos), então o fallback por artista é o que mais importa.
export function classifyVibe(
  f: AudioFeaturesLite | null | undefined,
  artistNames: string[] = [],
): SpotifyVibe {
  // 1) Easter egg de banda favorita ganha sempre
  const fav = findFavorite(artistNames);
  if (fav) return fav.vibe;

  // 2) Heurística por nome de artista (rock/metal/punk)
  if (artistNames.some(isRockArtist)) return "rock";

  // 3) Audio features clássicas (se existirem)
  if (f && (f.energy != null || f.valence != null || f.danceability != null)) {
    const e = f.energy ?? 0.5;
    const v = f.valence ?? 0.5;
    const d = f.danceability ?? 0.5;

    if (d > 0.7 && e > 0.7 && v > 0.55) return "hype";
    if (v > 0.65 && e > 0.45) return "feliz";
    if (e > 0.8 && v < 0.4) return "intensa";
    if (e < 0.4 && v < 0.4) return "melanco";
    if (e < 0.45) return "chill";
  }

  return "neutra";
}

const REACTIONS: Record<SpotifyVibe, Omit<MochiMusicReaction, "message">> = {
  hype: { vibe: "hype", happinessDelta: 4, energyDelta: 3, animation: "dance" },
  feliz: { vibe: "feliz", happinessDelta: 3, energyDelta: 1, animation: "sway" },
  chill: { vibe: "chill", happinessDelta: 1, energyDelta: -1, animation: "snug" },
  melanco: { vibe: "melanco", happinessDelta: -1, energyDelta: -2, animation: "pout" },
  intensa: { vibe: "intensa", happinessDelta: 3, energyDelta: 3, animation: "dance" },
  rock: { vibe: "rock", happinessDelta: 2, energyDelta: 2, animation: "dance" },
  neutra: { vibe: "neutra", happinessDelta: 0, energyDelta: 0, animation: "idle" },
};

// Frases por vibe quando NÃO é uma banda favorita.
const LINES: Record<SpotifyVibe, string[]> = {
  hype: [
    "essa daqui me fez balançar a orelha",
    "eu queria saber dançar igual essa música",
    "isso aqui é pra pular!",
  ],
  feliz: [
    "que musiquinha gostosa",
    "isso aqui me deixou de bom humor",
    "tô sorrindo só de ouvir",
  ],
  chill: [
    "isso aqui pede um cobertorzinho",
    "que vibe calminha boa",
    "deu vontade de cochilar",
  ],
  melanco: [
    "ai, essa puxou um sentimento",
    "tô aqui te fazendo companhia",
    "vem cá, vamo escutar juntinho",
  ],
  intensa: [
    "uau, que peso essa música 🤘",
    "olha essa batida pesada",
    "isso aqui é pra acordar geral",
  ],
  rock: [
    "rockzinho? combina com você",
    "essa guitarra me deixou ligado",
    "tô batendo a patinha no ritmo",
  ],
  neutra: [
    "tô curtindo escutar com você",
    "essa eu não conhecia",
    "interessante essa daqui",
  ],
};

// Frases especiais quando a partner é a Tita E a vibe é rock/intensa
// (mas SEM ser uma das bandas favoritas — essas têm linhas próprias).
const TITA_ROCK_LINES = [
  "tita no modo rockeira de novo, eu amo 🖤",
  "essa pegada combina demais com você",
  "se a tita gosta, eu também gosto",
];

export function buildMochiReaction(
  features: AudioFeaturesLite | null | undefined,
  partnerName: string,
  trackName?: string | null,
  artistNames: string[] = [],
): MochiMusicReaction {
  const partnerKey = partnerKeyFromName(partnerName);
  const isTita = partnerKey === "tita";
  const fav = findFavorite(artistNames);

  // Vibe final: bandas favoritas da Tita > heurística por artista > features
  const vibe = fav ? fav.vibe : classifyVibe(features, artistNames);
  const base = REACTIONS[vibe];
  const emoji = partnerEmoji(partnerKey);
  const tail = trackName ? ` (${trackName})` : "";

  let line: string;
  if (fav) {
    // Banda favorita: usa frase especial dela
    line = fav.lines[Math.floor(Math.random() * fav.lines.length)];
  } else if (isTita && (vibe === "rock" || vibe === "intensa")) {
    // Tita curtindo rock genérico
    line = TITA_ROCK_LINES[Math.floor(Math.random() * TITA_ROCK_LINES.length)];
  } else {
    line = LINES[vibe][Math.floor(Math.random() * LINES[vibe].length)];
  }

  return {
    ...base,
    message: `${line}${tail} ${emoji}`,
  };
}

// Label curtinho usado na "barra da vibe" no PetRoom
export function vibeLabel(vibe: SpotifyVibe): string {
  switch (vibe) {
    case "hype":
      return "hype 🪩";
    case "feliz":
      return "feliz ☀️";
    case "chill":
      return "chill 🫧";
    case "melanco":
      return "melanco 🌧";
    case "intensa":
      return "intensa 🔥";
    case "rock":
      return "rock 🤘";
    default:
      return "no clima 🎧";
  }
}
