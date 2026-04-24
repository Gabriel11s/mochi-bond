// Decide a "vibe" do Mochi a partir das audio-features do Spotify
// e gera os deltas de humor/energia + uma frase fofa pra falar.

import { partnerKeyFromName, partnerEmoji } from "./mochi-greetings";

export type SpotifyVibe =
  | "hype"        // dança, alta energia, valência alta
  | "feliz"       // valência alta, energia média
  | "chill"       // energia baixa, valência média/alta
  | "melanco"     // valência baixa, energia média/baixa
  | "intensa"     // energia muito alta, valência baixa (raivinha/drama)
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

export function classifyVibe(f: AudioFeaturesLite | null | undefined): SpotifyVibe {
  if (!f) return "neutra";
  const e = f.energy ?? 0.5;
  const v = f.valence ?? 0.5;
  const d = f.danceability ?? 0.5;

  if (d > 0.7 && e > 0.7 && v > 0.55) return "hype";
  if (v > 0.65 && e > 0.45) return "feliz";
  if (e > 0.8 && v < 0.4) return "intensa";
  if (e < 0.4 && v < 0.4) return "melanco";
  if (e < 0.45) return "chill";
  return "neutra";
}

const REACTIONS: Record<SpotifyVibe, Omit<MochiMusicReaction, "message">> = {
  hype:    { vibe: "hype",    happinessDelta:  4, energyDelta:  3, animation: "dance" },
  feliz:   { vibe: "feliz",   happinessDelta:  3, energyDelta:  1, animation: "sway"  },
  chill:   { vibe: "chill",   happinessDelta:  1, energyDelta: -1, animation: "snug"  },
  melanco: { vibe: "melanco", happinessDelta: -1, energyDelta: -2, animation: "pout"  },
  intensa: { vibe: "intensa", happinessDelta:  1, energyDelta:  2, animation: "dance" },
  neutra:  { vibe: "neutra",  happinessDelta:  0, energyDelta:  0, animation: "idle"  },
};

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
    "uau, que peso essa música",
    "isso aqui é pra acordar geral",
    "olha esse beat",
  ],
  neutra: [
    "tô curtindo escutar com você",
    "essa eu não conhecia",
    "interessante essa daqui",
  ],
};

export function buildMochiReaction(
  features: AudioFeaturesLite | null | undefined,
  partnerName: string,
  trackName?: string | null,
): MochiMusicReaction {
  const vibe = classifyVibe(features);
  const base = REACTIONS[vibe];
  const lines = LINES[vibe];
  const line = lines[Math.floor(Math.random() * lines.length)];
  const emoji = partnerEmoji(partnerKeyFromName(partnerName));
  const tail = trackName ? ` (${trackName})` : "";
  return {
    ...base,
    message: `${line}${tail} ${emoji}`,
  };
}
