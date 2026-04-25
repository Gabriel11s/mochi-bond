// Decide a "vibe" do pet a partir de:
//  1) gêneros do(s) artista(s)  ← fonte primária (sempre disponível)
//  2) audio-features do Spotify ← bônus quando existirem
//  3) heurística por nome do artista (fallback)
//  4) easter eggs por banda favorita
// Também leva em conta quantas vezes essa música já foi tocada (playCount)
// para variar a mensagem e ajustar o boost (anti-farm).

import { partnerKeyFromName, partnerEmoji } from "./mochi-greetings";

export type SpotifyVibe =
  | "hype" // dança / eletrônico / funk
  | "feliz" // pop alegre, indie pop, pagode
  | "chill" // lo-fi, bossa, acústico, ambient
  | "melanco" // sad pop, slowcore, indie melancólico
  | "intensa" // metal/hardcore/screamo
  | "rock" // rock/pop punk/alt
  | "rap" // hip hop, trap, drill, rap nacional
  | "latina" // reggaeton, sertanejo, forró, axé
  | "classica" // classical, score, soundtrack, opera
  | "jazz" // jazz, blues, soul, neo-soul
  | "kpop" // k-pop, j-pop
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
// Bandas favoritas da Tita: cada uma tem comentário especial.
const TITA_FAVORITES: Record<string, { vibe: SpotifyVibe; lines: string[] }> = {
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
// Mapeamento de SUBSTRINGS de gênero → vibe. Ordem importa: o primeiro match
// vence, então listamos o mais específico primeiro.
const GENRE_RULES: Array<{ match: string[]; vibe: SpotifyVibe }> = [
  // pesados primeiro (senão "metalcore" cai em "core" antes de bater em "metal")
  { match: ["metal", "deathcore", "metalcore", "screamo", "hardcore", "djent", "grindcore", "doom"], vibe: "intensa" },
  { match: ["punk", "post-hardcore", "emo"], vibe: "intensa" },
  // rock geral
  { match: ["rock", "grunge", "shoegaze", "alternative", "indie rock", "garage"], vibe: "rock" },
  // hip hop / rap / trap
  { match: ["rap", "hip hop", "hip-hop", "trap", "drill", "grime", "boom bap", "funk carioca", "funk bh", "funk rj", "funk paulista", "funk consciente"], vibe: "rap" },
  // dance / electronic / hype
  { match: ["edm", "house", "techno", "trance", "dubstep", "drum and bass", "dnb", "electro", "phonk", "hyperpop", "rave", "festival"], vibe: "hype" },
  // latina / brasileiro festivo
  { match: ["reggaeton", "latin", "sertanejo", "forró", "forro", "axé", "axe", "pagode", "samba", "piseiro", "arrocha", "brega", "vallenato", "cumbia", "salsa", "merengue", "bachata"], vibe: "latina" },
  // k-pop / j-pop
  { match: ["k-pop", "kpop", "korean", "j-pop", "jpop"], vibe: "kpop" },
  // jazz / soul / blues
  { match: ["jazz", "blues", "soul", "neo soul", "neo-soul", "funk soul", "motown", "rnb", "r&b"], vibe: "jazz" },
  // clássica / trilha
  { match: ["classical", "orchestra", "soundtrack", "score", "opera", "chamber", "baroque", "piano cover"], vibe: "classica" },
  // chill: lo-fi, bossa, acústico, ambient
  { match: ["lo-fi", "lofi", "bossa", "ambient", "chillhop", "downtempo", "acoustic", "singer-songwriter", "folk", "mpb"], vibe: "chill" },
  // melancólico
  { match: ["sad", "slowcore", "dream pop", "bedroom pop", "post-rock", "dark"], vibe: "melanco" },
  // pop / feliz como último genérico
  { match: ["pop", "indie pop", "synthpop", "electropop", "dance pop"], vibe: "feliz" },
];

function vibeFromGenres(genres: string[]): SpotifyVibe | null {
  if (!genres || genres.length === 0) return null;
  const lower = genres.map((g) => g.toLowerCase());
  for (const rule of GENRE_RULES) {
    for (const kw of rule.match) {
      if (lower.some((g) => g.includes(kw))) return rule.vibe;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Heurística por palavra-chave no NOME do artista (fallback final).
const ROCK_KEYWORDS = ["metal", "rock", "punk", "core", "hardcore", "screamo", "emo"];

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
// Classificador principal: gêneros > favoritos > features > artista name.
export function classifyVibe(
  f: AudioFeaturesLite | null | undefined,
  artistNames: string[] = [],
  genres: string[] = [],
): SpotifyVibe {
  // 1) Easter egg de banda favorita ganha sempre
  const fav = findFavorite(artistNames);
  if (fav) return fav.vibe;

  // 2) Gêneros do Spotify (fonte mais confiável atualmente)
  const fromGenres = vibeFromGenres(genres);
  if (fromGenres) return fromGenres;

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
    return "feliz";
  }

  // 4) Última cartada: nome do artista
  if (artistNames.some(isRockArtist)) return "rock";

  // Sem nenhum sinal: dá pelo menos uma vibe "feliz" leve em vez de neutra
  // pra evitar reação vazia.
  return "feliz";
}

// Boost base por vibe (antes do ajuste por play count)
const REACTIONS: Record<SpotifyVibe, Omit<MochiMusicReaction, "message">> = {
  hype: { vibe: "hype", happinessDelta: 4, energyDelta: 4, animation: "dance" },
  feliz: { vibe: "feliz", happinessDelta: 3, energyDelta: 1, animation: "sway" },
  chill: { vibe: "chill", happinessDelta: 2, energyDelta: -1, animation: "snug" },
  melanco: { vibe: "melanco", happinessDelta: 1, energyDelta: -2, animation: "pout" },
  intensa: { vibe: "intensa", happinessDelta: 3, energyDelta: 3, animation: "dance" },
  rock: { vibe: "rock", happinessDelta: 3, energyDelta: 2, animation: "dance" },
  rap: { vibe: "rap", happinessDelta: 3, energyDelta: 3, animation: "dance" },
  latina: { vibe: "latina", happinessDelta: 4, energyDelta: 3, animation: "dance" },
  classica: { vibe: "classica", happinessDelta: 2, energyDelta: -1, animation: "snug" },
  jazz: { vibe: "jazz", happinessDelta: 3, energyDelta: 0, animation: "sway" },
  kpop: { vibe: "kpop", happinessDelta: 4, energyDelta: 3, animation: "dance" },
  neutra: { vibe: "neutra", happinessDelta: 1, energyDelta: 0, animation: "sway" },
};

// Frases por vibe (primeira vez ouvindo a música)
const FIRST_TIME_LINES: Record<SpotifyVibe, string[]> = {
  hype: ["essa daqui me fez balançar a orelha 🪩", "isso aqui é pra pular!", "tô vibrando inteirinho com essa"],
  feliz: ["que musiquinha gostosa ☀️", "isso me deixou de bom humor", "tô sorrindo só de ouvir"],
  chill: ["isso aqui pede um cobertorzinho 🫧", "que vibe calminha boa", "deu vontade de cochilar no seu colo"],
  melanco: ["ai, essa puxou um sentimento 🌧", "tô aqui te fazendo companhia", "vem cá, vamo escutar juntinho"],
  intensa: ["uau, que peso essa música 🤘", "olha essa batida pesada", "isso aqui é pra acordar geral"],
  rock: ["rockzinho? combina com você 🎸", "essa guitarra me deixou ligado", "tô batendo a patinha no ritmo"],
  rap: ["essa batida é responsa 🔥", "rimou bonito, hein", "tô gostando dessa levada"],
  latina: ["bora dançar?? 💃", "essa pegada é animada demais", "isso aqui é pra mexer o quadril"],
  classica: ["que coisa elegante 🎻", "isso aqui é tipo um abraço sonoro", "tô me sentindo num filme bonito"],
  jazz: ["que vibe sofisticada 🎷", "essa daqui pede um café quentinho", "tô balançando no compasso"],
  kpop: ["KPOP?? eu amo 💖", "essa coreografia deve ser linda", "tô viciado nessa melodia"],
  neutra: ["tô curtindo escutar com você", "essa eu não conhecia", "interessante essa daqui"],
};

// Frases quando já ouviu algumas vezes (2-5)
const REPEAT_LINES: Record<SpotifyVibe, string[]> = {
  hype: ["essa daqui de novo? eu tô amando!! 🪩", "já tô decorando a batida"],
  feliz: ["essa virou nossa né? 🌼", "toda vez que toca eu fico feliz"],
  chill: ["essa daqui virou rotina nossa 🫶", "perfeito pra esse momento de novo"],
  melanco: ["ainda essa? tô aqui contigo 🤍", "toda vez ela mexe comigo"],
  intensa: ["JÁ DECOREI essa, vou cantar junto 🤘", "essa nunca enjoa, né?"],
  rock: ["rockzinho favorito de novo 🎸", "essa daqui virou hit nosso"],
  rap: ["essa rima eu já decorei 🔥", "tá em loop hoje, hein"],
  latina: ["bora dançar essa de novo!! 💃", "já é a trilha do dia"],
  classica: ["essa peça é mesmo especial 🎻", "tô me apegando a essa"],
  jazz: ["esse standard nunca enjoa 🎷", "tô virando fã dessa"],
  kpop: ["essa coreografia tá na cabeça 💖", "viciamos juntos nessa"],
  neutra: ["essa de novo 🤍", "tá em rotação hoje"],
};

// Frases quando ouve MUITO (6+) — pet começa a brincar
const HEAVY_REPEAT_LINES: Record<SpotifyVibe, string[]> = {
  hype: ["acho que essa é OFICIALMENTE nossa música 🪩💖"],
  feliz: ["se tem algo no mundo, é que você ama essa música ☀️"],
  chill: ["essa é nossa trilha de descanso oficial 🫧"],
  melanco: ["sempre que precisa, ela tá aqui né? 🌧"],
  intensa: ["pode ir, eu já sei a letra inteira 🤘🖤"],
  rock: ["clássico nosso 🎸"],
  rap: ["essa é HINO 🔥"],
  latina: ["se eu pudesse pular eu já tava no chão 💃"],
  classica: ["nossa trilha de momento bom 🎻"],
  jazz: ["nosso standard oficial 🎷"],
  kpop: ["acho que somos oficialmente fãs 💖"],
  neutra: ["essa virou parte da nossa playlist mental"],
};

// Frases especiais quando partner é Tita E vibe é rock/intensa
const TITA_ROCK_LINES = [
  "tita no modo rockeira de novo, eu amo 🖤",
  "essa pegada combina demais com você",
  "se a tita gosta, eu também gosto",
];

/**
 * Ajusta o boost com base em quantas vezes a música já foi reagida:
 * - 1ª: boost cheio
 * - 2-5: 60% (ainda é divertido)
 * - 6+: 30% (pet já tá familiarizado, evita farm)
 */
function scaleByPlayCount(base: number, playCount: number): number {
  if (base === 0) return 0;
  let factor = 1;
  if (playCount >= 6) factor = 0.3;
  else if (playCount >= 2) factor = 0.6;
  // arredonda preservando o sinal
  const scaled = base * factor;
  return base > 0 ? Math.max(1, Math.round(scaled)) : Math.min(-1, Math.round(scaled));
}

export interface BuildReactionInput {
  features: AudioFeaturesLite | null | undefined;
  partnerName: string;
  trackName?: string | null;
  artistNames?: string[];
  genres?: string[];
  /** Quantas vezes essa música já foi tocada (qualquer partner). */
  playCount?: number;
}

export function buildMochiReaction(
  inputOrFeatures: BuildReactionInput | AudioFeaturesLite | null | undefined,
  partnerName?: string,
  trackName?: string | null,
  artistNames: string[] = [],
): MochiMusicReaction {
  // Suporta tanto a forma antiga (positional) quanto a nova (objeto).
  const input: BuildReactionInput = (() => {
    if (
      inputOrFeatures &&
      typeof inputOrFeatures === "object" &&
      "partnerName" in inputOrFeatures
    ) {
      return inputOrFeatures as BuildReactionInput;
    }
    return {
      features: inputOrFeatures as AudioFeaturesLite | null | undefined,
      partnerName: partnerName ?? "",
      trackName,
      artistNames,
      genres: [],
      playCount: 0,
    };
  })();

  const partnerKey = partnerKeyFromName(input.partnerName);
  const isTita = partnerKey === "tita";
  const fav = findFavorite(input.artistNames ?? []);
  const playCount = input.playCount ?? 0;

  const vibe = fav
    ? fav.vibe
    : classifyVibe(input.features, input.artistNames ?? [], input.genres ?? []);

  const base = REACTIONS[vibe];
  const emoji = partnerEmoji(partnerKey);
  const tail = input.trackName ? ` (${input.trackName})` : "";

  // Escolhe pool de frases baseado em quantas vezes já ouviu.
  let pool: string[];
  if (fav) {
    pool = fav.lines;
  } else if (playCount >= 6) {
    pool = HEAVY_REPEAT_LINES[vibe];
  } else if (playCount >= 2) {
    pool = REPEAT_LINES[vibe];
  } else if (isTita && (vibe === "rock" || vibe === "intensa")) {
    pool = TITA_ROCK_LINES;
  } else {
    pool = FIRST_TIME_LINES[vibe];
  }

  const line = pool[Math.floor(Math.random() * pool.length)];

  return {
    vibe: base.vibe,
    happinessDelta: scaleByPlayCount(base.happinessDelta, playCount),
    energyDelta: scaleByPlayCount(base.energyDelta, playCount),
    animation: base.animation,
    message: `${line}${tail} ${emoji}`,
  };
}

// Label curtinho usado na "barra da vibe" no PetRoom
export function vibeLabel(vibe: SpotifyVibe): string {
  switch (vibe) {
    case "hype": return "hype 🪩";
    case "feliz": return "feliz ☀️";
    case "chill": return "chill 🫧";
    case "melanco": return "melanco 🌧";
    case "intensa": return "intensa 🔥";
    case "rock": return "rock 🤘";
    case "rap": return "rap 🎤";
    case "latina": return "latina 💃";
    case "classica": return "clássica 🎻";
    case "jazz": return "jazz 🎷";
    case "kpop": return "kpop 💖";
    default: return "no clima 🎧";
  }
}

// ---------------------------------------------------------------------------
// Estimativa de "energia / alegria / dança" quando o Spotify não devolve
// audio-features (que está restrito desde nov/2024 pra apps novos).
// Tira valores plausíveis a partir da vibe + popularidade do artista.
// Sempre retorna 0..1 — nunca null — pra UI nunca ficar vazia.
const VIBE_PROFILE: Record<SpotifyVibe, { energy: number; valence: number; danceability: number }> = {
  hype:     { energy: 0.92, valence: 0.78, danceability: 0.9 },
  feliz:    { energy: 0.65, valence: 0.85, danceability: 0.7 },
  chill:    { energy: 0.32, valence: 0.55, danceability: 0.45 },
  melanco:  { energy: 0.38, valence: 0.22, danceability: 0.4 },
  intensa:  { energy: 0.95, valence: 0.45, danceability: 0.55 },
  rock:     { energy: 0.78, valence: 0.6, danceability: 0.55 },
  rap:      { energy: 0.72, valence: 0.6, danceability: 0.85 },
  latina:   { energy: 0.82, valence: 0.82, danceability: 0.92 },
  classica: { energy: 0.35, valence: 0.55, danceability: 0.25 },
  jazz:     { energy: 0.5, valence: 0.65, danceability: 0.6 },
  kpop:     { energy: 0.82, valence: 0.78, danceability: 0.88 },
  neutra:   { energy: 0.55, valence: 0.6, danceability: 0.55 },
};

/**
 * Devolve sempre 3 valores 0..1 pra mostrar nas barrinhas do painel.
 * - Se o Spotify mandou features reais → usa elas (com leve mistura).
 * - Senão → estima por vibe + popularidade + uma variação determinística
 *   por trackId pra cada música ter números levemente diferentes.
 */
export function estimateAudioStats(
  vibe: SpotifyVibe,
  features: AudioFeaturesLite | null | undefined,
  opts: { trackId?: string; artistPopularity?: number | null } = {},
): { energy: number; valence: number; danceability: number; isEstimated: boolean } {
  const profile = VIBE_PROFILE[vibe] ?? VIBE_PROFILE.neutra;

  // Variação ±0.08 por trackId pra músicas distintas não ficarem idênticas
  const seed = opts.trackId ? hashSeed(opts.trackId) : 0;
  const wobble = (offset: number) => {
    const w = (((seed + offset) % 100) / 100) * 0.16 - 0.08;
    return w;
  };

  // Popularidade do artista (0..100) puxa energia/valência ligeiramente
  const pop = typeof opts.artistPopularity === "number" ? opts.artistPopularity / 100 : 0.5;
  const popBoost = (pop - 0.5) * 0.1;

  const hasReal =
    !!features &&
    (features.energy != null || features.valence != null || features.danceability != null);

  const pick = (key: "energy" | "valence" | "danceability", offset: number) => {
    const real = features?.[key];
    const est = profile[key] + wobble(offset) + popBoost;
    const v = real != null ? real * 0.7 + est * 0.3 : est;
    return Math.max(0.02, Math.min(0.99, v));
  };

  return {
    energy: pick("energy", 1),
    valence: pick("valence", 7),
    danceability: pick("danceability", 13),
    isEstimated: !hasReal,
  };
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Feature #12: Memória Musical — frases contextuais por play count
export function musicMemoryComment(playCount: number, trackName: string): string | null {
  if (playCount <= 1) return `opa, música nova! 🎵`;
  if (playCount <= 3) return `essa eu já conheço! vocês gostam de "${trackName}" né 😊`;
  if (playCount <= 6) return `"${trackName}" de novo? essa é daquelas! 🎶`;
  if (playCount <= 10) return `nossa, essa é DAQUELAS! vocês ficam diferentes quando toca 💗`;
  return `"${trackName}" é a música de vocês, eu sei 🥰💗`;
}
