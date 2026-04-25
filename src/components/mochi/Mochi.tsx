import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";
import { getSkin, getAccessory } from "@/lib/mochi-cosmetics";

export type PokeReaction =
  | "bite"      // com fome → morde o dedo
  | "nuzzle"    // feliz → encosta a carinha
  | "yawn"      // sem energia → bocejo
  | "giggle"    // muito feliz → risadinha
  | "sad-look"  // triste → olhinho marejado mais forte
  | "blush"     // padrão → coradinho
  | "startle";  // se cutucar muito rápido → susto

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
  skinId?: string;
  accessoryId?: string;
  // Stats opcionais — usados pra escolher a reação no toque/hover.
  hunger?: number;
  happiness?: number;
  energy?: number;
  // Disparado quando o usuário cutuca; recebe a reação escolhida pra
  // que PetRoom possa complementar com partículas/fala.
  onPoke?: (reaction: PokeReaction) => void;
}

// Escolhe a reação com base nas barras: prioriza estados extremos.
function pickReaction(
  mood: Mood,
  hunger: number,
  happiness: number,
  energy: number,
): PokeReaction {
  if (hunger <= 30) return "bite";
  if (energy <= 25) return "yawn";
  if (mood === "sad" || happiness <= 30) return "sad-look";
  if (happiness >= 85 || mood === "smitten") return "giggle";
  if (mood === "happy" || mood === "excited") return "nuzzle";
  return "blush";
}

const REACTION_EMOJI: Record<PokeReaction, string> = {
  bite: "😼",
  nuzzle: "🥰",
  yawn: "😴",
  giggle: "😆",
  "sad-look": "🥺",
  blush: "☺️",
  startle: "😳",
};

export function Mochi({
  mood,
  eating,
  bouncing,
  skinId = "cream",
  accessoryId = "none",
  hunger = 100,
  happiness = 100,
  energy = 100,
  onPoke,
}: Props) {
  const skin = getSkin(skinId);
  const acc = getAccessory(accessoryId);
  const uid = useId().replace(/:/g, "");
  const bodyGradId = `mochi-body-${uid}`;
  const cheekGradId = `mochi-cheek-${uid}`;

  // Reação ativa por toque/hover — sobrepõe o mood normal por ~1.4s
  const [reaction, setReaction] = useState<PokeReaction | null>(null);
  const lastPokeRef = useRef(0);
  const reactionTimerRef = useRef<number | null>(null);

  const triggerPoke = () => {
    const now = Date.now();
    const dt = now - lastPokeRef.current;
    lastPokeRef.current = now;
    // Cutucou de novo em <600ms → assusta
    const r: PokeReaction = dt < 600 ? "startle" : pickReaction(mood, hunger, happiness, energy);
    setReaction(r);
    onPoke?.(r);
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    reactionTimerRef.current = window.setTimeout(() => setReaction(null), 1400);
  };

  useEffect(() => {
    return () => {
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
    };
  }, []);

  const eyesClosed = mood === "sleepy" || reaction === "yawn" || reaction === "giggle";
  const blush =
    mood === "happy" || mood === "excited" || mood === "smitten" ||
    reaction === "blush" || reaction === "nuzzle" || reaction === "giggle";
  const tear = mood === "sad" || reaction === "sad-look";
  const mouthOpen =
    eating || mood === "excited" || mood === "smitten" ||
    reaction === "bite" || reaction === "yawn" || reaction === "giggle";
  const heartEyes = mood === "smitten" || reaction === "nuzzle";

  const reactionAnim =
    reaction === "bite" ? "animate-mochi-bite" :
    reaction === "nuzzle" ? "animate-mochi-nuzzle" :
    reaction === "startle" ? "animate-mochi-startle" :
    reaction === "giggle" ? "animate-mochi-giggle" :
    reaction === "yawn" ? "animate-mochi-yawn" :
    "";

  const animClass = reactionAnim || (eating
    ? "animate-mochi-eat"
    : mood === "smitten"
    ? "animate-mochi-smitten"
    : bouncing
    ? "animate-mochi-bounce"
    : mood === "sleepy"
    ? "animate-mochi-sleep"
    : "animate-breathe");

  return (
    <div
      className="relative flex h-72 w-72 cursor-pointer items-end justify-center sm:h-80 sm:w-80"
      onMouseEnter={triggerPoke}
      onClick={triggerPoke}
      onTouchStart={triggerPoke}
      role="button"
      aria-label="cutucar o pet"
    >
      <div
        className={`pointer-events-none absolute inset-0 rounded-full blur-3xl ${
          heartEyes ? "animate-smitten-glow" : "opacity-60"
        }`}
        style={{
          background: heartEyes
            ? "radial-gradient(circle, oklch(0.78 0.2 0) 0%, transparent 65%)"
            : "radial-gradient(circle, var(--accent-pink) 0%, transparent 65%)",
        }}
      />
      <div
        className="absolute bottom-2 h-4 w-44 rounded-full opacity-40 blur-md"
        style={{ background: "oklch(0.1 0.04 300)" }}
      />

      {/* emoji flutuante de reação */}
      <AnimatePresence>
        {reaction && (
          <motion.div
            key={`${reaction}-${lastPokeRef.current}`}
            initial={{ opacity: 0, y: 10, scale: 0.6 }}
            animate={{ opacity: 1, y: -8, scale: 1 }}
            exit={{ opacity: 0, y: -28, scale: 0.7 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="pointer-events-none absolute right-6 top-2 z-20 select-none text-4xl drop-shadow-md"
            aria-hidden
          >
            {REACTION_EMOJI[reaction]}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.svg
        viewBox="0 0 200 200"
        className={`relative z-10 h-64 w-64 sm:h-72 sm:w-72 ${animClass}`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        <defs>
          <radialGradient id={bodyGradId} cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor={skin.body} />
            <stop offset="60%" stopColor={skin.bodyMid} />
            <stop offset="100%" stopColor={skin.bodyEdge} />
          </radialGradient>
          <radialGradient id={cheekGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ears */}
        <ellipse cx="62" cy="62" rx="14" ry="20" fill={`url(#${bodyGradId})`} transform="rotate(-25 62 62)" />
        <ellipse cx="138" cy="62" rx="14" ry="20" fill={`url(#${bodyGradId})`} transform="rotate(25 138 62)" />
        <ellipse cx="62" cy="66" rx="6" ry="10" fill={skin.earInner} transform="rotate(-25 62 66)" />
        <ellipse cx="138" cy="66" rx="6" ry="10" fill={skin.earInner} transform="rotate(25 138 66)" />

        {/* body */}
        <ellipse cx="100" cy="115" rx="68" ry="62" fill={`url(#${bodyGradId})`} />

        {/* scarf (under face) */}
        {acc.id === "scarf" && (
          <>
            <ellipse cx="100" cy="155" rx="55" ry="11" fill="oklch(0.65 0.18 20)" />
            <rect x="118" y="152" width="10" height="22" rx="3" fill="oklch(0.6 0.2 20)" transform="rotate(15 123 163)" />
          </>
        )}

        {/* cheeks */}
        {blush && (
          <>
            <ellipse cx="62" cy="125" rx="14" ry="9" fill={`url(#${cheekGradId})`} />
            <ellipse cx="138" cy="125" rx="14" ry="9" fill={`url(#${cheekGradId})`} />
          </>
        )}

        {/* eyes */}
        {heartEyes ? (
          <>
            <path
              d="M82 102 c-5 -6 -14 -2 -14 5 c0 7 8 12 14 17 c6 -5 14 -10 14 -17 c0 -7 -9 -11 -14 -5 z"
              fill="oklch(0.65 0.22 15)"
            />
            <path
              d="M118 102 c-5 -6 -14 -2 -14 5 c0 7 8 12 14 17 c6 -5 14 -10 14 -17 c0 -7 -9 -11 -14 -5 z"
              fill="oklch(0.65 0.22 15)"
            />
            <ellipse cx="78" cy="106" rx="2" ry="2.5" fill="white" />
            <ellipse cx="114" cy="106" rx="2" ry="2.5" fill="white" />
          </>
        ) : eyesClosed ? (
          <>
            <path d="M 72 108 Q 82 102 92 108" stroke="oklch(0.25 0.04 320)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d="M 108 108 Q 118 102 128 108" stroke="oklch(0.25 0.04 320)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="82" cy="108" rx="6" ry="8" fill="oklch(0.18 0.03 300)" />
            <ellipse cx="118" cy="108" rx="6" ry="8" fill="oklch(0.18 0.03 300)" />
            <ellipse cx="84" cy="105" rx="2" ry="2.5" fill="white" />
            <ellipse cx="120" cy="105" rx="2" ry="2.5" fill="white" />
          </>
        )}

        {/* glasses (oculinhos finos) */}
        {acc.id === "glasses" && (
          <g stroke="oklch(0.25 0.04 320)" strokeWidth="2.5" fill="none">
            <circle cx="82" cy="108" r="11" />
            <circle cx="118" cy="108" r="11" />
            <line x1="93" y1="108" x2="107" y2="108" />
          </g>
        )}

        {/* óculos da vitória — armação dourada borboleta com lente rosa translúcida */}
        {acc.id === "victory" && (
          <g>
            {/* lente esquerda (formato butterfly: levanta na ponta) */}
            <path
              d="M 56 102 Q 58 92 72 92 L 92 92 Q 96 92 96 100 L 95 114 Q 94 122 84 122 L 70 122 Q 58 122 56 112 Z"
              fill="oklch(0.78 0.12 20 / 0.45)"
              stroke="oklch(0.78 0.13 80)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* lente direita (espelhada) */}
            <path
              d="M 144 102 Q 142 92 128 92 L 108 92 Q 104 92 104 100 L 105 114 Q 106 122 116 122 L 130 122 Q 142 122 144 112 Z"
              fill="oklch(0.78 0.12 20 / 0.45)"
              stroke="oklch(0.78 0.13 80)"
              strokeWidth="3"
              strokeLinejoin="round"
            />
            {/* ponte fininha */}
            <path
              d="M 96 100 L 104 100"
              stroke="oklch(0.78 0.13 80)"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* hastes nas laterais */}
            <path
              d="M 56 104 L 48 100"
              stroke="oklch(0.78 0.13 80)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M 144 104 L 152 100"
              stroke="oklch(0.78 0.13 80)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* brilho dourado nos cantinhos altos (toque vitória) */}
            <circle cx="70" cy="96" r="2" fill="oklch(0.92 0.16 90)" />
            <circle cx="130" cy="96" r="2" fill="oklch(0.92 0.16 90)" />
            {/* reflexo branco nas lentes */}
            <rect x="80" y="98" width="6" height="2.2" rx="1" fill="white" opacity="0.85" />
            <rect x="114" y="98" width="6" height="2.2" rx="1" fill="white" opacity="0.85" />
          </g>
        )}

        {/* tear */}
        {tear && (
          <ellipse cx="78" cy="122" rx="2.5" ry="4" fill="oklch(0.7 0.13 230)" />
        )}

        {/* mouth */}
        {mouthOpen ? (
          <ellipse cx="100" cy="132" rx="8" ry="6" fill="oklch(0.4 0.1 20)" />
        ) : mood === "sad" ? (
          <path d="M 92 134 Q 100 128 108 134" stroke="oklch(0.25 0.04 320)" strokeWidth="3" fill="none" strokeLinecap="round" />
        ) : (
          <path d="M 92 130 Q 100 138 108 130" stroke="oklch(0.25 0.04 320)" strokeWidth="3" fill="none" strokeLinecap="round" />
        )}

        {/* accessories on top of head */}
        {acc.id === "bow" && (
          <g>
            <path d="M 90 48 Q 75 38 78 56 Q 85 56 100 52 Z" fill="oklch(0.72 0.18 0)" />
            <path d="M 110 48 Q 125 38 122 56 Q 115 56 100 52 Z" fill="oklch(0.72 0.18 0)" />
            <circle cx="100" cy="52" r="5" fill="oklch(0.65 0.2 5)" />
          </g>
        )}
        {acc.id === "tophat" && (
          <g>
            <rect x="78" y="32" width="44" height="22" rx="2" fill="oklch(0.2 0.02 300)" />
            <rect x="70" y="50" width="60" height="6" rx="2" fill="oklch(0.2 0.02 300)" />
            <rect x="78" y="44" width="44" height="4" fill="oklch(0.65 0.18 0)" />
          </g>
        )}
        {acc.id === "crown" && (
          <g fill="oklch(0.85 0.16 90)" stroke="oklch(0.65 0.18 80)" strokeWidth="1.5">
            <path d="M 75 56 L 80 36 L 90 50 L 100 30 L 110 50 L 120 36 L 125 56 Z" />
            <circle cx="100" cy="42" r="2.5" fill="oklch(0.7 0.2 0)" stroke="none" />
            <circle cx="85" cy="48" r="1.8" fill="oklch(0.7 0.2 290)" stroke="none" />
            <circle cx="115" cy="48" r="1.8" fill="oklch(0.7 0.2 290)" stroke="none" />
          </g>
        )}
        {acc.id === "flower" && (
          <g>
            <circle cx="76" cy="52" r="5" fill="oklch(0.85 0.18 60)" />
            <circle cx="84" cy="48" r="5" fill="oklch(0.85 0.18 60)" />
            <circle cx="76" cy="44" r="5" fill="oklch(0.85 0.18 60)" />
            <circle cx="68" cy="48" r="5" fill="oklch(0.85 0.18 60)" />
            <circle cx="76" cy="48" r="3" fill="oklch(0.7 0.2 30)" />
          </g>
        )}
        {acc.id === "beanie" && (
          <g>
            <path d="M 64 56 Q 100 18 136 56 L 134 60 Q 100 36 66 60 Z" fill="oklch(0.55 0.16 250)" />
            <rect x="62" y="56" width="76" height="8" rx="3" fill="oklch(0.42 0.14 250)" />
            <circle cx="100" cy="26" r="6" fill="oklch(0.95 0.04 80)" />
          </g>
        )}
        {acc.id === "halo" && (
          <g>
            <ellipse cx="100" cy="34" rx="32" ry="6" fill="none" stroke="oklch(0.92 0.18 95)" strokeWidth="3" />
            <ellipse cx="100" cy="34" rx="32" ry="6" fill="none" stroke="oklch(0.98 0.1 95 / 0.6)" strokeWidth="6" />
          </g>
        )}
        {acc.id === "horns" && (
          <g fill="oklch(0.55 0.18 20)">
            <path d="M 78 48 Q 70 30 84 32 Q 86 42 86 50 Z" />
            <path d="M 122 48 Q 130 30 116 32 Q 114 42 114 50 Z" />
          </g>
        )}
        {acc.id === "headphones" && (
          <g>
            <path d="M 60 80 Q 60 30 100 30 Q 140 30 140 80" fill="none" stroke="oklch(0.3 0.04 280)" strokeWidth="6" strokeLinecap="round" />
            <rect x="50" y="76" width="16" height="22" rx="6" fill="oklch(0.65 0.18 0)" />
            <rect x="134" y="76" width="16" height="22" rx="6" fill="oklch(0.65 0.18 0)" />
          </g>
        )}
        {acc.id === "headband" && (
          <g>
            <path d="M 62 60 Q 100 38 138 60" fill="none" stroke="oklch(0.78 0.16 350)" strokeWidth="7" strokeLinecap="round" />
            <circle cx="100" cy="44" r="5" fill="oklch(0.85 0.18 350)" />
          </g>
        )}
        {acc.id === "leaf" && (
          <g>
            <path d="M 96 38 Q 84 22 76 32 Q 80 48 96 50 Z" fill="oklch(0.7 0.18 145)" />
            <path d="M 88 32 L 94 46" stroke="oklch(0.5 0.14 145)" strokeWidth="1.5" />
          </g>
        )}
        {acc.id === "star" && (
          <path d="M 100 28 L 104 40 L 116 40 L 106 48 L 110 60 L 100 52 L 90 60 L 94 48 L 84 40 L 96 40 Z" fill="oklch(0.9 0.18 95)" stroke="oklch(0.7 0.18 80)" strokeWidth="1.5" />
        )}
        {acc.id === "heart" && (
          <path d="M 100 38 c -8 -12 -24 -2 -24 8 c 0 12 14 18 24 28 c 10 -10 24 -16 24 -28 c 0 -10 -16 -20 -24 -8 z" fill="oklch(0.7 0.22 15)" />
        )}
        {acc.id === "cherry" && (
          <g>
            <path d="M 90 30 Q 100 24 110 30" fill="none" stroke="oklch(0.5 0.15 145)" strokeWidth="2" />
            <circle cx="88" cy="46" r="7" fill="oklch(0.6 0.22 20)" />
            <circle cx="112" cy="46" r="7" fill="oklch(0.6 0.22 20)" />
            <circle cx="86" cy="44" r="2" fill="oklch(0.85 0.1 20)" />
            <circle cx="110" cy="44" r="2" fill="oklch(0.85 0.1 20)" />
          </g>
        )}
        {acc.id === "sunglasses" && (
          <g>
            <rect x="68" y="100" width="28" height="14" rx="4" fill="oklch(0.18 0.02 280)" />
            <rect x="104" y="100" width="28" height="14" rx="4" fill="oklch(0.18 0.02 280)" />
            <line x1="96" y1="107" x2="104" y2="107" stroke="oklch(0.18 0.02 280)" strokeWidth="2" />
          </g>
        )}
        {acc.id === "monocle" && (
          <g stroke="oklch(0.65 0.18 80)" strokeWidth="2.5" fill="none">
            <circle cx="118" cy="108" r="12" />
            <line x1="118" y1="120" x2="122" y2="138" />
          </g>
        )}
        {acc.id === "mustache" && (
          <path d="M 80 138 Q 90 132 100 138 Q 110 132 120 138 Q 110 144 100 140 Q 90 144 80 138 Z" fill="oklch(0.25 0.04 40)" />
        )}
        {acc.id === "tie" && (
          <g fill="oklch(0.55 0.2 25)">
            <path d="M 96 150 L 104 150 L 106 156 L 100 162 L 94 156 Z" />
            <path d="M 94 162 L 106 162 L 110 178 L 100 186 L 90 178 Z" />
          </g>
        )}
        {acc.id === "necklace" && (
          <g>
            <path d="M 70 158 Q 100 172 130 158" fill="none" stroke="oklch(0.85 0.16 90)" strokeWidth="2" />
            <path d="M 100 174 L 96 180 L 100 186 L 104 180 Z" fill="oklch(0.78 0.18 250)" stroke="oklch(0.6 0.16 250)" strokeWidth="1" />
          </g>
        )}


        {mood === "sleepy" && (
          <text x="150" y="70" fill="oklch(0.78 0.13 300)" fontSize="22" fontFamily="var(--font-display)" fontWeight="700">
            z
          </text>
        )}

        {/* floating hearts when smitten */}
        {heartEyes && (
          <>
            <text x="40" y="50" fontSize="18">💗</text>
            <text x="158" y="55" fontSize="14">💕</text>
            <text x="30" y="100" fontSize="12">💞</text>
          </>
        )}
      </motion.svg>
    </div>
  );
}
