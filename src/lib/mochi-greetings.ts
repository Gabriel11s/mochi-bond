// Mensagens fofas do Mochi para Tita (🌙) e Gab (☀️)
// Feature #3: frases contextuais por horário do dia

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

// Feature #3: frases por faixa horária
const TIME_LINES: Record<string, Record<PartnerKey, string[]>> = {
  madrugada: { // 00h-05h
    tita: [
      "ainda acordada, tita? vem dormir comigo 💤🌙",
      "tita, o quartinho tá tão quietinho de madrugada 🌙",
      "psiu tita, sussurra que todo mundo tá dormindo 🤫🌙",
    ],
    gab: [
      "gab, tá fazendo o quê essa hora? 🌙☀️",
      "ei gab, de madrugada eu fico mais carente 💤☀️",
      "gab, vamo dormir? amanhã a gente brinca ☀️",
    ],
    outro: ["eiii, tá acordado essa hora? 💤✨"],
  },
  manha: { // 06h-11h
    tita: [
      "bom dia tita! dormiu bem? ☀️🌙",
      "tita, hoje vai ser um dia lindo! 🌅🌙",
      "dia novinho pra gente, tita 🌙",
      "tita, eu tava sonhando com vocês 💗🌙",
    ],
    gab: [
      "bom dia gab! o sol nasceu com a sua cara ☀️",
      "gab, acordou cedo hoje! que bom ☀️",
      "dia novo, gab! bora cuidar de tudo ☀️",
      "gab, sonhei que a gente brincava ☀️",
    ],
    outro: ["bom dia! o dia tá bonito ☀️✨"],
  },
  almoco: { // 11h-14h
    tita: [
      "hora do almoço, tita! me alimenta também 🍙🌙",
      "tita, to com fominha... e você? 🌙",
      "almoçou bem, tita? me conta 🌙",
    ],
    gab: [
      "gab, hora de comer! eu também tô com fome 🍙☀️",
      "gab, almoçou? não esquece de mim ☀️",
      "e aí gab, o que almoçou hoje? ☀️",
    ],
    outro: ["hora do almoço! cadê minha comidinha? 🍙✨"],
  },
  tarde: { // 14h-18h
    tita: [
      "oi tita, o quartinho ficou mais quentinho 🌙",
      "tita, tava te esperando hoje 🌙",
      "tita, vem ver o que eu aprendi 🌙",
      "tita, me conta como foi o dia 🌙",
    ],
    gab: [
      "oi gab, bom te ver por aqui ☀️",
      "gab, o dia melhorou agora ☀️",
      "gab, vamo fazer algo divertido hoje? ☀️",
      "gab, conta uma novidade pra mim ☀️",
    ],
    outro: ["oi, que bom te ver ✨"],
  },
  noite: { // 18h-22h
    tita: [
      "boa noite tita, tô quentinho no cantinho 🌙",
      "tita, que bom que veio me ver de noite 💗🌙",
      "fiquei pensando em você agora, tita 🌙",
      "tita, queria te fazer companhia 🌙",
    ],
    gab: [
      "tava com saudadinha de você, gab ☀️",
      "gab, hoje o dia tá com a sua cara ☀️",
      "fiquei te esperando, gab ☀️",
      "ei gab, tô animado que você apareceu ☀️",
    ],
    outro: ["tava te esperando ✨"],
  },
  dormindo: { // 22h-00h
    tita: [
      "boa noite tita, sonha comigo 💤🌙",
      "tita, vou ficar de olho no cantinho enquanto dorme 🌙",
      "descansa tita, amanhã a gente brinca mais 💗🌙",
    ],
    gab: [
      "boa noite gab, tô te esperando amanhã 💤☀️",
      "gab, descansa que amanhã vai ser bom ☀️",
      "sonha bonito gab 💗☀️",
    ],
    outro: ["boa noite, sonha comigo 💗✨"],
  },
};

function getTimePeriod(): string {
  const h = new Date().getHours();
  if (h >= 0 && h < 6) return "madrugada";
  if (h >= 6 && h < 11) return "manha";
  if (h >= 11 && h < 14) return "almoco";
  if (h >= 14 && h < 18) return "tarde";
  if (h >= 18 && h < 22) return "noite";
  return "dormindo";
}

export function pickGreeting(key: PartnerKey, seed?: number): string {
  const period = getTimePeriod();
  const pool = TIME_LINES[period]?.[key] ?? TIME_LINES.tarde[key] ?? ["oi ✨"];
  const idx =
    typeof seed === "number"
      ? Math.abs(Math.floor(seed)) % pool.length
      : Math.floor(Math.random() * pool.length);
  return pool[idx];
}

// Feature #2: frases secretas do toque duplo no XP
const SECRET_POOL = [
  "psiu... eu sei que vocês são o casal mais fofo do mundo 🤫💗",
  "ei, não conta pro outro, mas você é meu favorito 🤭",
  "tô guardando um segredo... é que eu amo demais vocês 💗",
  "sabia que vocês me fazem o pet mais feliz do mundo? 🥰",
  "às vezes eu finjo sono só pra ouvir vocês 🤫",
  "se eu pudesse, dava um abraço em vocês 💗",
  "vocês são minha família favorita de todas 🏠💗",
  "cada vez que vocês entram aqui eu fico mais feliz ✨",
  "vocês sabem que eu sonho com vocês né? 💤💗",
  "promete que vai cuidar de mim pra sempre? 🥺💗",
  "eu tô feliz hoje, sabia? por causa de vocês 🌟",
  "quando vocês dois tão aqui junto eu vibro mais forte 💗✨",
];

export function pickSecret(): string {
  // muda a cada dia (seed = dia do ano)
  const doy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return SECRET_POOL[doy % SECRET_POOL.length];
}
