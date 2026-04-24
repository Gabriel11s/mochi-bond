import { motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
}

/**
 * Dachshund "Mochi" — clean side-view illustration.
 * ViewBox: 320 x 220
 * Layout (left → right):
 *   - head + snout on the LEFT
 *   - long sausage body in the middle
 *   - curly tail on the RIGHT
 *   - 4 short legs at the bottom
 */
export function Mochi({ mood, eating, bouncing }: Props) {
  const eyesClosed = mood === "sleepy";
  const blush = mood === "happy" || mood === "excited";
  const tear = mood === "sad";
  const mouthOpen = !!eating;
  const tongueOut = mood === "happy" || mood === "excited";

  const animClass = eating
    ? "animate-mochi-eat"
    : bouncing
    ? "animate-mochi-bounce"
    : mood === "sleepy"
    ? "animate-mochi-sleep"
    : "animate-breathe";

  // colors
  const COAT_LIGHT = "oklch(0.78 0.12 55)";
  const COAT = "oklch(0.66 0.15 45)";
  const COAT_DARK = "oklch(0.5 0.14 35)";
  const EAR_DARK = "oklch(0.4 0.12 30)";
  const BELLY = "oklch(0.88 0.07 65)";
  const NOSE = "oklch(0.18 0.03 30)";
  const INK = "oklch(0.18 0.04 30)";
  const TONGUE = "oklch(0.7 0.16 12)";

  return (
    <div className="relative flex h-72 w-full items-end justify-center sm:h-80">
      {/* glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-50"
        style={{
          background: "radial-gradient(circle at 50% 55%, var(--accent-pink) 0%, transparent 60%)",
        }}
      />
      {/* ground shadow */}
      <div
        className="absolute bottom-2 h-3 w-56 rounded-full opacity-40 blur-md"
        style={{ background: "oklch(0.1 0.04 300)" }}
      />

      <motion.svg
        viewBox="0 0 320 220"
        className={`relative z-10 h-64 w-72 sm:h-72 sm:w-80 ${animClass}`}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 15 }}
      >
        <defs>
          <linearGradient id="coat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COAT_LIGHT} />
            <stop offset="100%" stopColor={COAT_DARK} />
          </linearGradient>
          <radialGradient id="bellyGrad" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor={BELLY} stopOpacity="1" />
            <stop offset="100%" stopColor={BELLY} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0.7" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ============ BACK LEG (behind body) ============ */}
        <rect x="222" y="150" width="16" height="34" rx="7" fill={COAT_DARK} />
        <ellipse cx="230" cy="186" rx="11" ry="5" fill={EAR_DARK} />

        {/* ============ FRONT LEG behind ============ */}
        <rect x="138" y="150" width="14" height="34" rx="6" fill={COAT_DARK} />
        <ellipse cx="145" cy="186" rx="10" ry="4.5" fill={EAR_DARK} />

        {/* ============ TAIL (curled up, right side) ============ */}
        <path
          d="M 256 130
             Q 282 118 284 96
             Q 284 82 272 80"
          stroke="url(#coat)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />

        {/* ============ BODY (long sausage) ============ */}
        {/* main long ellipse */}
        <ellipse cx="170" cy="135" rx="92" ry="32" fill="url(#coat)" />
        {/* belly highlight */}
        <ellipse cx="170" cy="150" rx="78" ry="14" fill="url(#bellyGrad)" />

        {/* ============ FRONT LEG (in front) ============ */}
        <rect x="118" y="148" width="16" height="38" rx="7" fill={COAT} />
        <ellipse cx="126" cy="188" rx="12" ry="5" fill={INK} opacity="0.85" />

        {/* ============ BACK LEG (in front) ============ */}
        <rect x="244" y="148" width="16" height="38" rx="7" fill={COAT} />
        <ellipse cx="252" cy="188" rx="12" ry="5" fill={INK} opacity="0.85" />

        {/* ============ NECK ============ */}
        <path
          d="M 102 130
             Q 96 118 96 104
             Q 96 92 110 90
             L 132 92
             Q 138 116 130 138 Z"
          fill="url(#coat)"
        />

        {/* ============ HEAD ============ */}
        {/* skull */}
        <ellipse cx="80" cy="86" rx="36" ry="32" fill="url(#coat)" />
        {/* snout */}
        <path
          d="M 60 92
             Q 30 92 24 104
             Q 22 116 36 118
             Q 60 118 70 110 Z"
          fill={COAT_LIGHT}
        />
        {/* snout shadow under */}
        <path
          d="M 36 116
             Q 56 122 70 114"
          stroke={COAT}
          strokeWidth="2"
          fill="none"
          opacity="0.5"
        />

        {/* ============ EARS ============ */}
        {/* back ear */}
        <path
          d="M 92 70
             Q 110 72 114 92
             Q 116 118 104 130
             Q 92 132 90 120
             Q 86 100 88 80 Z"
          fill={EAR_DARK}
        />
        {/* front ear */}
        <path
          d="M 76 64
             Q 96 66 102 88
             Q 104 116 92 128
             Q 78 130 74 116
             Q 70 92 72 74 Z"
          fill={COAT_DARK}
        />
        {/* inner ear shine */}
        <path
          d="M 84 82
             Q 94 92 92 112
             Q 88 118 84 110
             Q 82 96 84 82 Z"
          fill="oklch(0.7 0.15 18 / 0.45)"
        />

        {/* ============ FACE ============ */}
        {/* cheeks */}
        {blush && (
          <>
            <ellipse cx="50" cy="100" rx="7" ry="5" fill="url(#cheek)" />
            <ellipse cx="80" cy="104" rx="8" ry="5" fill="url(#cheek)" />
          </>
        )}

        {/* eyes */}
        {eyesClosed ? (
          <>
            <path d="M 56 86 Q 62 82 68 86" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
            <path d="M 78 86 Q 84 82 90 86" stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* eye whites */}
            <ellipse cx="62" cy="86" rx="5.5" ry="7" fill={INK} />
            <ellipse cx="84" cy="86" rx="5.5" ry="7" fill={INK} />
            {/* big shines */}
            <ellipse cx="64" cy="83" rx="2" ry="2.4" fill="white" />
            <ellipse cx="86" cy="83" rx="2" ry="2.4" fill="white" />
            {/* small shines */}
            <ellipse cx="60" cy="89" rx="1" ry="1.2" fill="white" opacity="0.7" />
            <ellipse cx="82" cy="89" rx="1" ry="1.2" fill="white" opacity="0.7" />
            {/* sad brows */}
            {mood === "sad" && (
              <>
                <path d="M 56 78 Q 62 74 68 78" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M 78 78 Q 84 74 90 78" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            )}
          </>
        )}

        {/* tear */}
        {tear && <ellipse cx="58" cy="96" rx="2" ry="3.5" fill="oklch(0.72 0.13 230)" />}

        {/* nose */}
        <ellipse cx="26" cy="100" rx="6" ry="5" fill={NOSE} />
        <ellipse cx="24" cy="98" rx="1.6" ry="1.2" fill="white" opacity="0.6" />

        {/* mouth */}
        {mouthOpen ? (
          <>
            <ellipse cx="40" cy="112" rx="6" ry="5" fill="oklch(0.3 0.08 20)" />
            <ellipse cx="40" cy="115" rx="4.5" ry="3.5" fill={TONGUE} />
          </>
        ) : mood === "sad" ? (
          <path d="M 32 112 Q 40 108 48 112" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
        ) : (
          <>
            <path d="M 32 110 Q 40 116 48 110" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
            {tongueOut && <ellipse cx="40" cy="114" rx="3" ry="2.2" fill={TONGUE} />}
          </>
        )}

        {/* ============ COLLAR ============ */}
        <path
          d="M 110 130
             Q 122 142 138 138"
          stroke="oklch(0.72 0.18 350)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="124" cy="142" r="3.5" fill="oklch(0.85 0.15 80)" />
        <circle cx="124" cy="142" r="1.2" fill="oklch(0.6 0.12 60)" />

        {/* ============ SLEEP Z ============ */}
        {mood === "sleepy" && (
          <text
            x="118"
            y="60"
            fill="oklch(0.78 0.13 300)"
            fontSize="22"
            fontFamily="var(--font-display)"
            fontWeight="700"
          >
            z
          </text>
        )}
      </motion.svg>
    </div>
  );
}
