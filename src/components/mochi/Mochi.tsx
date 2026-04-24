import { useId } from "react";
import { motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";
import { getSkin, getAccessory } from "@/lib/mochi-cosmetics";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
  skinId?: string;
  accessoryId?: string;
}

export function Mochi({ mood, eating, bouncing, skinId = "cream", accessoryId = "none" }: Props) {
  const skin = getSkin(skinId);
  const acc = getAccessory(accessoryId);
  const uid = useId().replace(/:/g, "");
  const bodyGradId = `mochi-body-${uid}`;
  const cheekGradId = `mochi-cheek-${uid}`;

  const eyesClosed = mood === "sleepy";
  const blush = mood === "happy" || mood === "excited" || mood === "smitten";
  const tear = mood === "sad";
  const mouthOpen = eating || mood === "excited" || mood === "smitten";
  const heartEyes = mood === "smitten";

  const animClass = eating
    ? "animate-mochi-eat"
    : bouncing || mood === "smitten"
    ? "animate-mochi-bounce"
    : mood === "sleepy"
    ? "animate-mochi-sleep"
    : "animate-breathe";

  return (
    <div className="relative flex h-72 w-72 items-end justify-center sm:h-80 sm:w-80">
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-60"
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
        <ellipse cx="62" cy="62" rx="14" ry="20" fill="url(#${bodyGradId})" transform="rotate(-25 62 62)" />
        <ellipse cx="138" cy="62" rx="14" ry="20" fill="url(#${bodyGradId})" transform="rotate(25 138 62)" />
        <ellipse cx="62" cy="66" rx="6" ry="10" fill={skin.earInner} transform="rotate(-25 62 66)" />
        <ellipse cx="138" cy="66" rx="6" ry="10" fill={skin.earInner} transform="rotate(25 138 66)" />

        {/* body */}
        <ellipse cx="100" cy="115" rx="68" ry="62" fill="url(#${bodyGradId})" />

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
            <ellipse cx="62" cy="125" rx="14" ry="9" fill="url(#${cheekGradId})" />
            <ellipse cx="138" cy="125" rx="14" ry="9" fill="url(#${cheekGradId})" />
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

        {/* glasses */}
        {acc.id === "glasses" && (
          <g stroke="oklch(0.25 0.04 320)" strokeWidth="2.5" fill="none">
            <circle cx="82" cy="108" r="11" />
            <circle cx="118" cy="108" r="11" />
            <line x1="93" y1="108" x2="107" y2="108" />
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

        {/* sleep Z */}
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
