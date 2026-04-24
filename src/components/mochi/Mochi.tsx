import { motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
}

export function Mochi({ mood, eating, bouncing }: Props) {
  const eyesClosed = mood === "sleepy";
  const blush = mood === "happy" || mood === "excited";
  const tear = mood === "sad";
  const mouthOpen = eating || mood === "excited";

  const animClass = eating
    ? "animate-mochi-eat"
    : bouncing
    ? "animate-mochi-bounce"
    : mood === "sleepy"
    ? "animate-mochi-sleep"
    : "animate-breathe";

  return (
    <div className="relative flex h-72 w-72 items-end justify-center sm:h-80 sm:w-80">
      {/* glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle, var(--accent-pink) 0%, transparent 65%)",
        }}
      />
      {/* shadow */}
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
          <radialGradient id="mochi-body" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="oklch(0.99 0.02 80)" />
            <stop offset="60%" stopColor="oklch(0.95 0.04 50)" />
            <stop offset="100%" stopColor="oklch(0.85 0.06 30)" />
          </radialGradient>
          <radialGradient id="mochi-cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="oklch(0.78 0.18 10)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ears */}
        <ellipse cx="62" cy="62" rx="14" ry="20" fill="url(#mochi-body)" transform="rotate(-25 62 62)" />
        <ellipse cx="138" cy="62" rx="14" ry="20" fill="url(#mochi-body)" transform="rotate(25 138 62)" />
        <ellipse cx="62" cy="66" rx="6" ry="10" fill="oklch(0.78 0.14 10 / 0.6)" transform="rotate(-25 62 66)" />
        <ellipse cx="138" cy="66" rx="6" ry="10" fill="oklch(0.78 0.14 10 / 0.6)" transform="rotate(25 138 66)" />

        {/* body */}
        <ellipse cx="100" cy="115" rx="68" ry="62" fill="url(#mochi-body)" />

        {/* cheeks */}
        {blush && (
          <>
            <ellipse cx="62" cy="125" rx="14" ry="9" fill="url(#mochi-cheek)" />
            <ellipse cx="138" cy="125" rx="14" ry="9" fill="url(#mochi-cheek)" />
          </>
        )}

        {/* eyes */}
        {eyesClosed ? (
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

        {/* sleep Z */}
        {mood === "sleepy" && (
          <text x="150" y="70" fill="oklch(0.78 0.13 300)" fontSize="22" fontFamily="var(--font-display)" fontWeight="700">
            z
          </text>
        )}
      </motion.svg>
    </div>
  );
}
