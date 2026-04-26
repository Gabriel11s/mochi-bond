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

// ----------------------------------------------------------------------------
// Dicionário de palpites válidos — aceita estas palavras como tentativa,
// mesmo que não estejam no pool de soluções. Aumenta a flexibilidade do
// jogo (jogador pode testar palavras comuns sem cair em "não reconhecida").
//
// Curado manualmente: ~700 palavras de 5 letras em pt-BR, sem acentos.
// Inclui todas as do WORD_POOL + verbos comuns conjugados, substantivos
// frequentes, adjetivos. Se faltar algum, é fácil adicionar.
// ----------------------------------------------------------------------------
const EXTRA_GUESSES: string[] = [
  // verbos comuns conjugados / infinitivos
  "abrir", "achei", "acaba", "acabe", "acabo", "acato", "acerto",
  "achar", "ajuda", "ajudo", "amada", "amado", "amava", "amigo",
  "andar", "ando", "anote", "ardia", "ardem", "armar", "arpoa",
  "arrasar", "atira", "atire", "atiro", "aviso", "baixa", "baixo",
  "banha", "banho", "bater", "batia", "batem", "bebem", "bebia",
  "beijo", "berra", "berro", "bobas", "boboca", "bonus", "bordo",
  "branca", "branco", "brava", "bravo", "breve", "burro", "buscar",
  "busca", "busco", "calam", "calar", "calou", "calmo", "calos",
  "calva", "calvo", "calos", "cama", "campo", "canta", "cante",
  "canto", "canta", "cantos", "capaz", "carro", "casas", "casca",
  "caule", "causa", "causo", "cavam", "cebola", "cedem", "cedeu",
  "certa", "certo", "chama", "chame", "chamo", "chato", "chave",
  "chega", "chego", "chuva", "claro", "clara", "clima", "comer",
  "comeu", "comido", "comum", "comer", "conta", "conto", "corre",
  "correr", "corro", "corta", "corte", "custa", "custo", "danca",
  "dance", "dando", "darda", "dardo", "deixa", "deixe", "deixo",
  "denso", "deram", "dever", "devia", "devem", "dieta", "diga",
  "digo", "diria", "dizer", "doces", "doces", "dorme", "drama",
  "ducha", "ducha", "duelo", "duros", "egito", "elite", "elogio",
  "ervas", "estar", "estou", "etapa", "etico", "exame", "exato",
  "exito", "fadas", "falar", "falei", "falou", "falta", "falte",
  "falto", "farda", "farsa", "farto", "fatal", "fatia", "fauna",
  "favor", "fazem", "fazer", "feita", "feito", "feliz", "ferir",
  "ferro", "festa", "filho", "filha", "filme", "final", "firme",
  "fluir", "focas", "fogao", "fogos", "foice", "folga", "folha",
  "fonte", "forca", "forma", "forno", "forra", "forro", "fossa",
  "fraco", "fraca", "frado", "frade", "freio", "frete", "fruta",
  "fumos", "furia", "furto", "gabar", "gaita", "galos", "ganso",
  "garra", "gasto", "gatos", "gente", "genro", "gerar", "girar",
  "globo", "golpe", "golfe", "gomas", "gosto", "gotas", "gozar",
  "graos", "grata", "grato", "grave", "greve", "grita", "grito",
  "grupo", "gruta", "guiar", "guita", "habil", "haste", "havia",
  "heroi", "hinos", "hojes", "homem", "honra", "horas", "horda",
  "hotel", "humor", "ideal", "ideia", "idoso", "iguais", "igual",
  "imune", "infra", "ileso", "irmas", "irmao", "italo", "jamais",
  "janta", "jeito", "jogar", "jogos", "junco", "junto", "lapis",
  "largo", "leite", "lente", "leoes", "letra", "leves", "lince",
  "limbo", "lirio", "livre", "louco", "lucro", "lugar", "lutas",
  "lutar", "luvas", "magia", "magno", "maior", "manha", "manhã",
  "manso", "mapas", "maras", "marca", "marco", "mares", "massa",
  "matar", "medos", "menor", "menos", "mente", "meses", "metas",
  "metro", "mexer", "milho", "minha", "mochi", "modos", "moeda",
  "monge", "morar", "morro", "morto", "morte", "mover", "mudez",
  "mulas", "mundo", "munir", "muros", "museu", "musgo", "navio",
  "negar", "neles", "nervo", "ninho", "nobre", "noite", "noivo",
  "nomes", "notas", "novas", "novos", "nuvem", "obito", "obtem",
  "obvia", "obvio", "ocaso", "olhar", "olhos", "ondas", "opaco",
  "optar", "orgao", "ousar", "ouvir", "pacto", "padre", "pagar",
  "palco", "panos", "papas", "papel", "pares", "parar", "parir",
  "parva", "passa", "pasta", "pasto", "patos", "paves", "pedra",
  "pegar", "perda", "perdi", "perto", "peste", "petis", "picam",
  "pilar", "pinta", "pista", "plebe", "pluma", "poder", "poema",
  "pomar", "porta", "porte", "porto", "posse", "potro", "praia",
  "prado", "prata", "prece", "preto", "preta", "preto", "prima",
  "primo", "prima", "prole", "prove", "prova", "puros", "puxar",
  "puxao", "quase", "queda", "queia", "queia", "quero", "quias",
  "raiva", "rapaz", "rasga", "razao", "razem", "reais", "rebol",
  "recem", "rebro", "refem", "regra", "reine", "rente", "repor",
  "repto", "rezar", "rigor", "rindo", "ringe", "risos", "rival",
  "robos", "rosca", "rosa", "rubra", "rubro", "ruido", "rumar",
  "rumor", "saber", "sabia", "sabio", "sacas", "sacos", "sadio",
  "sagaz", "sagra", "salao", "salmo", "salto", "salva", "saque",
  "sarro", "saude", "sauna", "secas", "secar", "selva", "senha",
  "sepia", "senso", "serpe", "sigla", "sinal", "sinto", "sobra",
  "sobre", "soera", "solta", "sonho", "sopro", "sorte", "sucos",
  "sumir", "supor", "supra", "surda", "surdo", "surfa", "surge",
  "surto", "susto", "tacha", "tacho", "tatui", "tatus", "teias",
  "tempo", "tenaz", "tenor", "tenro", "tenta", "tente", "tento",
  "termo", "terra", "tirar", "tomar", "topam", "torre", "torta",
  "torto", "tosca", "tosco", "trago", "trama", "trate", "treco",
  "trens", "trevo", "trigo", "troca", "troco", "trono", "tropa",
  "trupe", "tudo", "tumba", "turbo", "ucha", "ultra", "untar",
  "urbes", "ursos", "vacuo", "vagar", "vagas", "valha", "valeu",
  "vapor", "varzea", "vasos", "vates", "veias", "velha", "velho",
  "venha", "venho", "verbo", "verde", "verdes", "verso", "vespa",
  "viaja", "vidas", "vidro", "vigor", "vilas", "vinde", "vinha",
  "vinho", "vinte", "vinte", "viral", "virus", "vista", "vital",
  "viver", "vivem", "vivos", "voltam", "volta", "votos", "vozes",
  "zelar", "zinco", "zonas",
  // Mais palavras comuns
  "nadar", "andar", "comer", "fazer", "amar", "ouvir", "ler",
  "amare", "ouvir", "rouca", "rouco", "santa", "santo", "saira",
  "saiba", "salvo", "selo", "siges", "signa", "signo", "soara",
  "soavi", "soeis", "sofas", "solas", "solos", "sonda", "sonsa",
  "sorda", "sotao", "sumas", "sumir", "supor", "supre", "surda",
  "surra", "surto", "tabua", "tatua", "tatuei", "tachas", "talas",
  "talao", "talha", "talhe", "talho", "talho", "tampa", "tanga",
  "tanto", "tares", "telas", "temas", "tente", "tetas", "ticas",
  "tigre", "tigres", "tilde", "tinha", "tinta", "tinto", "tipos",
  "tiras", "tiros", "tocar", "todas", "todos", "toesa", "tonel",
  "topar", "topem", "topez", "torpe", "torte", "torre", "torce",
  "tortas", "tossa", "tosse", "toura", "touro", "trago", "trama",
  "trate", "trato", "trave", "trens", "trepo", "treva", "treze",
  "tropa", "trono", "trope", "trote", "truco", "tubas", "tubos",
  "turba", "turfa", "tutor", "tuvai", "ucha", "uivar", "umbro",
  "uncia", "unhar", "unica", "unico", "unido", "untos", "upava",
  "urano", "urbes", "urgia", "urnas", "ursas", "ursos", "useis",
  "vamos", "vagar", "vagem", "vaiar", "valar", "valas", "valda",
  "valeu", "valha", "valhi", "valis", "valor", "valsa", "vamem",
  "vapor", "vares", "varia", "varie", "varia", "varoa", "varzea",
  "vasta", "vasto", "vater", "vazam", "vazar", "vazio", "vazou",
  "veiae", "veias", "velam", "velas", "velha", "velho", "vence",
  "vendi", "vento", "verba", "verbo", "verde", "veres", "verso",
  "verte", "vespa", "vetar", "vetes", "veto", "vexe", "vibra",
  "vibre", "vibro", "vidas", "vidro", "vigia", "vigil", "vigor",
  "vinco", "vinda", "vindo", "vinho", "vinte", "viola", "viral",
  "vires", "viseu", "visgo", "visou", "vista", "visto", "vital",
  "viuva", "viuvo", "vivas", "viver", "vives", "vivos", "vocal",
  "vocas", "vodka", "voga", "vogos", "voila", "voile", "volta",
  "volte", "volto", "voluo", "vomito", "vorio", "vosso", "votam",
  "votar", "votas", "voto", "votos", "vouga", "voves", "voves",
  "vozes", "zaguer", "zarpa", "zazen", "zebra", "zeladores", "zelar",
  "zelho", "zelos", "zenit", "zeros", "zinco", "zomba", "zonal",
  "zonas", "zorro", "zumbi", "zunir", "zuves",
];

// Normaliza tudo antes de jogar no Set: tira acentos, lowercase, filtra
// por tamanho. Usa o mesmo normalize que valida palpites no submit.
function normalizeForGuess(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z]/g, "")
    .toLowerCase();
}

const VALID_GUESSES = new Set<string>([
  ...VALID_POOL.map(normalizeForGuess),
  ...EXTRA_GUESSES.map(normalizeForGuess),
].filter((w) => w.length === WORD_LENGTH));

/** Verifica se uma palavra é um palpite válido (existe no dicionário). */
export function isValidGuess(guess: string): boolean {
  return VALID_GUESSES.has(normalizeForGuess(guess));
}

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

/**
 * Spec "Palavrinha do Bichinho":
 * 1-2 tentativas → +30 / 3-4 → +20 / 5-6 → +10 / perdeu → +3.
 */
export function calculateReward(
  attempts: number,
  status: "won" | "lost"
): { xp: number; happiness: number } {
  if (status === "lost") return { xp: 3, happiness: 3 };
  if (attempts <= 2) return { xp: 30, happiness: 30 };
  if (attempts <= 4) return { xp: 20, happiness: 20 };
  return { xp: 10, happiness: 10 };
}

/** Pega uma letra random da palavra-alvo que o jogador AINDA NÃO descobriu. */
export function pickHintLetter(target: string, knownLetters: Set<string>): string {
  const letters = [...new Set(normalize(target).split(""))].filter((l) => !knownLetters.has(l));
  if (letters.length === 0) return ""; // já descobriu tudo
  return letters[Math.floor(Math.random() * letters.length)];
}
