// Mensagens fofas do Mochi para Tita (🌙) e Gab (☀️)
// Cada mensagem termina com o emoji do partner.

export type PartnerKey = "tita" | "gab" | "outro";

export function partnerKeyFromName(name: string | null | undefined): PartnerKey {
  if (!name) return "outro";
  const n = name.trim().toLowerCase();
  if (n.includes("tita")) return "tita";
  if (n.includes("gab")) return "gab";
  return "outro";
}

export function partnerEmoji(key: PartnerKey): string {
  if (key === "tita") return "🌙";
  if (key === "gab") return "☀️";
  return "✨";
}

const TITA_LINES = [
  "oi tita, o quartinho ficou mais quentinho 🌙",
  "tita, tava te esperando hoje 🌙",
  "ouvi um barulhinho e era você, tita 🌙",
  "tita, vem ver o que eu aprendi 🌙",
  "o céu tá bonito quando você chega, tita 🌙",
  "tita, me conta como foi o dia 🌙",
  "fiquei pensando em você agora, tita 🌙",
  "tita, queria te fazer companhia 🌙",
];

const GAB_LINES = [
  "oi gab, bom te ver por aqui ☀️",
  "gab, o dia melhorou agora ☀️",
  "tava com saudadinha de você, gab ☀️",
  "gab, vamo fazer algo divertido hoje? ☀️",
  "ei gab, tô animado que você apareceu ☀️",
  "gab, conta uma novidade pra mim ☀️",
  "fiquei te esperando, gab ☀️",
  "gab, hoje o dia tá com a sua cara ☀️",
];

const OUTRO_LINES = [
  "oi, que bom te ver ✨",
  "tava te esperando ✨",
];

export function pickGreeting(key: PartnerKey, seed?: number): string {
  const pool =
    key === "tita" ? TITA_LINES : key === "gab" ? GAB_LINES : OUTRO_LINES;
  const idx =
    typeof seed === "number"
      ? Math.abs(Math.floor(seed)) % pool.length
      : Math.floor(Math.random() * pool.length);
  return pool[idx];
}
