// Caça-palavras diário (estilo Termo) — palavras genéricas pt-BR de
// dificuldade média/alta. Sem acentos no storage; o eval normaliza
// qualquer input do usuário antes de comparar.

export const WORD_LENGTH = 5;
export const MAX_ATTEMPTS = 6;

// Modos do jogo (replica do term.ooo)
export type GameMode = "single" | "duo" | "quartet";

export const MODE_CONFIG: Record<GameMode, {
  label: string;
  shortLabel: string;
  icon: string;
  wordCount: number;
  maxAttempts: number;
}> = {
  single:  { label: "Termo",    shortLabel: "1", icon: "🔤", wordCount: 1, maxAttempts: 6 },
  duo:     { label: "Dueto",    shortLabel: "2", icon: "🔡", wordCount: 2, maxAttempts: 7 },
  quartet: { label: "Quarteto", shortLabel: "4", icon: "🔠", wordCount: 4, maxAttempts: 9 },
};

// Pool de ~200 palavras de 5 letras em pt-BR, sem acentos. Mistura termos
// menos óbvios (ALGOZ, BANZO, GLEBA) com palavras conhecidas mas que
// ainda dão trabalho (FUGAZ, SAGAZ, RUBRO). Evita gírias modernas e
// nomes próprios. Lower-case por convenção interna.
export const WORD_POOL: string[] = [
  "abrir", "acaso", "acido", "agudo", "alado", "algoz", "altar", "ambar",
  "ameno", "ancho", "aneis", "antro", "aquem", "ardil", "arena", "arido",
  "armas", "arroz", "asilo", "astro", "ativo", "atroz", "atual", "aurea",
  "aureo", "avena", "axila", "azido", "azuis", "bafos", "baile", "baixo",
  "balde", "banzo", "barro", "batia", "beata", "beato", "becas", "beira",
  "belos", "benta", "bispo", "blefe", "bloco", "boato", "bocal", "bolos",
  "bomba", "borra", "botas", "brasa", "breca", "brejo", "briga", "brios",
  "brisa", "broca", "broxa", "bruma", "bruta", "bufao", "burra", "burro",
  "cabra", "cacau", "calar", "calca", "caldo", "calma", "calor", "calva",
  "calvo", "campo", "canja", "canto", "cardo", "cargo", "casca", "casco",
  "casta", "casto", "causa", "cedro", "celta", "cento", "cerca", "cerne",
  "cerro", "cesta", "cetim", "cevar", "chama", "chata", "chato", "chefe",
  "cheia", "cheio", "choro", "chuva", "cinco", "circo", "ciume", "clara",
  "claro", "clave", "clero", "clima", "clone", "cocar", "cofre", "coice",
  "coisa", "colar", "comer", "copas", "copos", "corda", "cores", "corno",
  "corpo", "corte", "covas", "crase", "cravo", "credo", "criar", "crime",
  "crivo", "cruel", "cruza", "cubas", "cucos", "cueca", "culpa", "cunha",
  "custo", "damas", "danca", "dardo", "debil", "denso", "diabo", "dieta",
  "divan", "dogma", "domar", "dores", "dotes", "drama", "dreno", "droga",
  "ducha", "duelo", "ecran", "egito", "elite", "epoca", "ermos", "errar",
  "etapa", "etico", "exame", "exito", "exodo", "facao", "facho", "facil",
  "fadas", "faina", "faixa", "falso", "fardo", "farsa", "fatal", "fatia",
  "fauna", "favor", "fazer", "feliz", "ferir", "ferro", "festa", "fetos",
  "feudo", "filme", "final", "firme", "fisga", "fitas", "fluir", "focas",
  "fogao", "foice", "folga", "folha", "fonte", "forca", "forma", "forno",
  "forra", "forro", "fossa", "fraco", "frade", "fraga", "freio", "frete",
  "fruta", "fugaz", "fumos", "furia", "furto", "fusos", "fuste", "gabar",
  "gaita", "galos", "ganso", "garra", "gasto", "gatos", "genro", "gerar",
  "girar", "gleba", "globo", "glosa", "golfe", "golpe", "gomas", "gotas",
  "gozar", "graos", "grata", "grave", "greve", "grita", "grito", "grupo",
  "gruta", "guiar", "guita", "habil", "haste", "havia", "hinos", "horda",
  "humor", "idoso", "ileso", "imune", "irmas", "ironia", "junco", "lapis",
  "largo", "leite", "leoes", "letra", "limbo", "lince", "lirio", "livre",
  "louco", "lucro", "luvas", "magno", "manso", "mapas", "marco", "mares",
  "massa", "matriz", "menos", "metas", "metro", "milho", "minha", "mochi",
  "moeda", "morro", "morte", "mover", "mudez", "mulas", "munir", "muros",
  "musgo", "navio", "nervo", "ninho", "nitida", "nobre", "noite", "noivo",
  "nuvem", "obtem", "obvio", "ocaso", "olhar", "ondas", "opaco", "operacao",
  "orgao", "pagar", "pacto", "padre", "palco", "pares", "parir", "parva",
  "pasto", "patos", "paves", "pedra", "perda", "peste", "pinta", "piolho",
  "pista", "plebe", "pluma", "poema", "pomar", "porte", "porto", "posse",
  "potro", "prece", "preto", "prima", "prole", "prova", "puros", "queda",
  "queijo", "raiva", "rapaz", "rasga", "rebro", "recem", "refem", "regra",
  "rente", "repto", "rezar", "rigor", "ringe", "robos", "rosca", "rubro",
  "ruido", "rumor", "sabio", "sadio", "sagaz", "salmo", "salto", "sangue",
  "saque", "sarro", "sauna", "sebo", "secar", "selva", "senha", "sepia",
  "serpe", "sigla", "sino", "sobrar", "solta", "sopro", "sorte", "sucos",
  "sumir", "surdo", "surto", "susto", "tacho", "talao", "tatui", "tatus",
  "teias", "tempo", "tenaz", "tenor", "tenro", "termo", "torre", "torta",
  "torto", "tosco", "trago", "trama", "treco", "trens", "trevo", "trigo",
  "troca", "troco", "trono", "trupe", "tucos", "tumba", "turbo", "ucha",
  "ultra", "untar", "urbes", "ursos", "vacuo", "vagar", "vapor", "varzea",
  "vasos", "vates", "veias", "velha", "verbo", "verso", "vespa", "vidro",
  "vigor", "vilas", "vinde", "viral", "virus", "vital", "viver", "volta",
  "votos", "zelar", "zinco", "zonas",
];

// Filtra palavras inválidas (tamanho diferente de 5) defensivamente
const VALID_POOL = WORD_POOL.filter((w) => w.length === WORD_LENGTH);

/** Retorna a palavra do dia (mesma pra todos os partners no mesmo dia). */
export function getDailyWord(date = new Date()): string {
  // Seed determinística por dia: YYYYMMDD
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const seed = y * 10000 + m * 100 + d;
  return VALID_POOL[seed % VALID_POOL.length];
}

/** Retorna N palavras do dia (pra Dueto e Quarteto), todas distintas. */
export function getDailyWords(n: number, date = new Date()): string[] {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const baseSeed = y * 10000 + m * 100 + d;
  const used = new Set<string>();
  const out: string[] = [];
  // Usa primos diferentes pra espaçar a seed e evitar duplicatas
  const PRIMES = [7919, 1009, 4001, 6151, 8761, 3019];
  for (let i = 0; i < n * 3 && out.length < n; i++) {
    const idx = (baseSeed + i * (PRIMES[i % PRIMES.length])) % VALID_POOL.length;
    const w = VALID_POOL[idx];
    if (!used.has(w)) {
      used.add(w);
      out.push(w);
    }
  }
  return out;
}

/** Pool de palavras únicas para modo treino multi-palavra. */
export function getRandomWords(n: number, exclude: string[] = []): string[] {
  const ex = new Set(exclude);
  const out: string[] = [];
  let attempts = 0;
  while (out.length < n && attempts < n * 30) {
    const w = VALID_POOL[Math.floor(Math.random() * VALID_POOL.length)];
    if (!ex.has(w) && !out.includes(w)) out.push(w);
    attempts++;
  }
  return out;
}

/** Chave de "qual dia é hoje" — usada como game_date no DB e key local. */
export function getTodayKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Tira acentos e deixa lowercase pra comparar palpite com a palavra-alvo. */
export function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // combining diacritical marks
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

export type CellStatus = "correct" | "present" | "absent" | "empty";

export interface EvaluatedGuess {
  letters: Array<{ char: string; status: CellStatus }>;
  isCorrect: boolean;
}

/**
 * Avalia um palpite contra a palavra-alvo seguindo o algoritmo do Wordle:
 * - Primeiro passa marcando todas as posições EXATAS como "correct".
 * - Depois marca "present" só se ainda sobrou aquela letra na palavra
 *   (evita pintar duas amarelas pra letra que aparece uma vez só).
 */
export function evaluateGuess(guess: string, target: string): EvaluatedGuess {
  const g = normalize(guess);
  const t = normalize(target);
  const result: EvaluatedGuess["letters"] = Array.from({ length: WORD_LENGTH }, () => ({
    char: "",
    status: "absent" as CellStatus,
  }));
  const remaining: Record<string, number> = {};

  // Pass 1: corretas
  for (let i = 0; i < WORD_LENGTH; i++) {
    const ch = g[i] ?? "";
    result[i].char = ch;
    if (ch === t[i]) {
      result[i].status = "correct";
    } else {
      remaining[t[i]] = (remaining[t[i]] ?? 0) + 1;
    }
  }
  // Pass 2: presentes (só se a letra ainda tá disponível)
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i].status === "correct") continue;
    const ch = result[i].char;
    if (remaining[ch] && remaining[ch] > 0) {
      result[i].status = "present";
      remaining[ch]--;
    }
  }
  return { letters: result, isCorrect: g === t };
}

/** Status agregado por letra — usado pra colorir o teclado virtual. */
export function aggregateKeyboardStatus(
  evaluations: EvaluatedGuess[]
): Record<string, CellStatus> {
  const map: Record<string, CellStatus> = {};
  // Prioridade: correct > present > absent > empty
  const priority: Record<CellStatus, number> = { correct: 3, present: 2, absent: 1, empty: 0 };
  for (const ev of evaluations) {
    for (const cell of ev.letters) {
      const cur = map[cell.char];
      if (!cur || priority[cell.status] > priority[cur]) {
        map[cell.char] = cell.status;
      }
    }
  }
  return map;
}

/** Pontuação de XP/happiness baseada em modo e tentativas usadas. */
export function rewardForGame(mode: GameMode, attempts: number): { xp: number; happiness: number } {
  const cfg = MODE_CONFIG[mode];
  // Multiplicador: Termo 1x, Dueto 1.6x, Quarteto 2.5x (mais difícil → reward maior)
  const multiplier = mode === "single" ? 1 : mode === "duo" ? 1.6 : 2.5;
  const max = cfg.maxAttempts;
  // Curva: usar < 1/3 das tentativas = top reward; usar todas = mínimo
  const ratio = Math.max(0, Math.min(1, (max - attempts) / max));
  const baseXp = Math.round((4 + ratio * 26) * multiplier);
  return { xp: baseXp, happiness: baseXp };
}

/** @deprecated use rewardForGame com mode. Mantido pra retro-compat. */
export function rewardForAttempts(attempts: number): { xp: number; happiness: number } {
  return rewardForGame("single", attempts);
}

/** Pega uma letra random da palavra-alvo que o jogador AINDA NÃO descobriu. */
export function pickHintLetter(target: string, knownLetters: Set<string>): string {
  const letters = [...new Set(normalize(target).split(""))].filter((l) => !knownLetters.has(l));
  if (letters.length === 0) return ""; // já descobriu tudo
  return letters[Math.floor(Math.random() * letters.length)];
}
