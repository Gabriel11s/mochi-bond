import { motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
}

/**
 * "Mochi" — gatinho fofo, vista frontal.
 * ViewBox: 240 x 240
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

  // paleta cinza-fofo com toques rosados
  const FUR_LIGHT = "oklch(0.92 0.01 280)";
  const FUR = "oklch(0.82 0.02 280)";
  const FUR_DARK = "oklch(0.68 0.03 280)";
  const BELLY = "oklch(0.96 0.008 80)";
  const INNER_EAR = "oklch(0.82 0.09 20)";
  const NOSE = "oklch(0.72 0.14 12)";
  const INK = "oklch(0.2 0.04 280)";
  const TONGUE = "oklch(0.72 0.16 12)";

  return (
    <div className="relative flex h-72 w-full items-end justify-center sm:h-80">
      {/* glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-50"
        style={{
          background:
            "radial-gradient(circle at 50% 55%, var(--accent-pink) 0%, transparent 60%)",
        }}
      />
      {/* ground shadow */}
      <div
        className="absolute bottom-2 h-3 w-44 rounded-full opacity-40 blur-md"
        style={{ background: "oklch(0.1 0.04 300)" }}
      />

      <motion.svg
        viewBox="0 0 240 240"
        className={`relative z-10 h-64 w-64 sm:h-72 sm:w-72 ${animClass}`}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 15 }}
      >
        <defs>
          <linearGradient id="fur" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={FUR_LIGHT} />
            <stop offset="100%" stopColor={FUR_DARK} />
          </linearGradient>
          <radialGradient id="bellyGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={BELLY} stopOpacity="1" />
            <stop offset="100%" stopColor={BELLY} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ============ CAUDA ============ */}
        <path
          d="M 178 196
             Q 210 196 214 168
             Q 216 146 198 142"
          stroke="url(#fur)"
          strokeWidth="16"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 198 144 Q 210 148 210 162"
          stroke={FUR_DARK}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* ============ CORPINHO (sentado) ============ */}
        <ellipse cx="120" cy="180" rx="62" ry="46" fill="url(#fur)" />
        {/* barriguinha clara */}
        <ellipse cx="120" cy="190" rx="42" ry="30" fill="url(#bellyGrad)" />

        {/* patinhas da frente */}
        <ellipse cx="92" cy="216" rx="14" ry="10" fill={FUR} />
        <ellipse cx="148" cy="216" rx="14" ry="10" fill={FUR} />
        {/* dedinhos */}
        <ellipse cx="86" cy="220" rx="2.2" ry="2" fill={FUR_DARK} opacity="0.6" />
        <ellipse cx="92" cy="221" rx="2.2" ry="2" fill={FUR_DARK} opacity="0.6" />
        <ellipse cx="98" cy="220" rx="2.2" ry="2" fill={FUR_DARK} opacity="0.6" />
        <ellipse cx="142" cy="220" rx="2.2" ry="2" fill={FUR_DARK} opacity="0.6" />
        <ellipse cx="148" cy="221" rx="2.2" ry="2" fill={FUR_DARK} opacity="0.6" />
        <ellipse cx="154" cy="220" rx="2.2" ry="2" fill={FUR_DARK} opacity="0.6" />

        {/* ============ CABEÇA ============ */}
        {/* orelhas */}
        <path
          d="M 60 92
             L 78 50
             L 100 86 Z"
          fill="url(#fur)"
        />
        <path
          d="M 70 84
             L 80 60
             L 92 82 Z"
          fill={INNER_EAR}
        />
        <path
          d="M 180 92
             L 162 50
             L 140 86 Z"
          fill="url(#fur)"
        />
        <path
          d="M 170 84
             L 160 60
             L 148 82 Z"
          fill={INNER_EAR}
        />

        {/* cabeça redonda */}
        <ellipse cx="120" cy="108" rx="60" ry="54" fill="url(#fur)" />

        {/* bochechas peludinhas */}
        <ellipse cx="74" cy="124" rx="14" ry="12" fill={FUR_LIGHT} />
        <ellipse cx="166" cy="124" rx="14" ry="12" fill={FUR_LIGHT} />

        {/* blush */}
        {blush && (
          <>
            <ellipse cx="78" cy="128" rx="10" ry="6" fill="url(#cheek)" />
            <ellipse cx="162" cy="128" rx="10" ry="6" fill="url(#cheek)" />
          </>
        )}

        {/* ============ OLHOS ============ */}
        {eyesClosed ? (
          <>
            <path
              d="M 88 108 Q 98 100 108 108"
              stroke={INK}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 132 108 Q 142 100 152 108"
              stroke={INK}
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* olhos grandes brilhantes */}
            <ellipse cx="98" cy="110" rx="9" ry="12" fill={INK} />
            <ellipse cx="142" cy="110" rx="9" ry="12" fill={INK} />
            {/* shine grande */}
            <ellipse cx="101" cy="106" rx="3" ry="3.6" fill="white" />
            <ellipse cx="145" cy="106" rx="3" ry="3.6" fill="white" />
            {/* shine pequeno */}
            <ellipse cx="95" cy="115" rx="1.4" ry="1.6" fill="white" opacity="0.8" />
            <ellipse cx="139" cy="115" rx="1.4" ry="1.6" fill="white" opacity="0.8" />
            {/* sobrancelhas tristes */}
            {mood === "sad" && (
              <>
                <path
                  d="M 88 95 Q 98 90 108 95"
                  stroke={INK}
                  strokeWidth="2.4"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 132 95 Q 142 90 152 95"
                  stroke={INK}
                  strokeWidth="2.4"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            )}
          </>
        )}

        {/* lágrima */}
        {tear && (
          <ellipse
            cx="92"
            cy="124"
            rx="2.4"
            ry="4"
            fill="oklch(0.72 0.13 230)"
          />
        )}

        {/* ============ NARIZINHO ============ */}
        <path
          d="M 114 132 L 126 132 L 120 140 Z"
          fill={NOSE}
        />

        {/* ============ BOQUINHA (formato w) ============ */}
        {mouthOpen ? (
          <>
            <ellipse cx="120" cy="148" rx="7" ry="6" fill="oklch(0.3 0.08 20)" />
            <ellipse cx="120" cy="151" rx="5" ry="4" fill={TONGUE} />
          </>
        ) : mood === "sad" ? (
          <>
            <path
              d="M 120 142 L 120 146"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 112 152 Q 120 146 128 152"
              stroke={INK}
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M 120 142 L 120 146"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 112 146 Q 116 152 120 146"
              stroke={INK}
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 120 146 Q 124 152 128 146"
              stroke={INK}
              strokeWidth="2.2"
              fill="none"
              strokeLinecap="round"
            />
            {tongueOut && (
              <ellipse cx="120" cy="152" rx="3.5" ry="2.6" fill={TONGUE} />
            )}
          </>
        )}

        {/* ============ BIGODES ============ */}
        <g stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.55">
          <path d="M 70 138 L 48 132" />
          <path d="M 70 142 L 46 144" />
          <path d="M 170 138 L 192 132" />
          <path d="M 170 142 L 194 144" />
        </g>

        {/* ============ COLEIRA ============ */}
        <path
          d="M 80 168
             Q 120 188 160 168"
          stroke="oklch(0.72 0.18 350)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="120" cy="186" r="5" fill="oklch(0.85 0.15 80)" />
        <circle cx="120" cy="186" r="2" fill="oklch(0.6 0.12 60)" />

        {/* ============ Z DE SONO ============ */}
        {mood === "sleepy" && (
          <text
            x="178"
            y="58"
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
