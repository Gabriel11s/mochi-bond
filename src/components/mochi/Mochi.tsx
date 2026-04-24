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
  const tongueOut = mood === "happy" || mood === "excited";

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
        className="absolute bottom-3 h-3 w-52 rounded-full opacity-40 blur-md"
        style={{ background: "oklch(0.1 0.04 300)" }}
      />

      <motion.svg
        viewBox="0 0 240 200"
        className={`relative z-10 h-64 w-72 sm:h-72 sm:w-80 ${animClass}`}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 14 }}
      >
        <defs>
          {/* warm chestnut/caramel dachshund coat */}
          <radialGradient id="dax-body" cx="50%" cy="35%" r="75%">
            <stop offset="0%" stopColor="oklch(0.78 0.13 55)" />
            <stop offset="55%" stopColor="oklch(0.65 0.15 45)" />
            <stop offset="100%" stopColor="oklch(0.5 0.14 35)" />
          </radialGradient>
          <radialGradient id="dax-head" cx="40%" cy="40%" r="70%">
            <stop offset="0%" stopColor="oklch(0.8 0.12 55)" />
            <stop offset="100%" stopColor="oklch(0.6 0.15 40)" />
          </radialGradient>
          <radialGradient id="dax-ear" cx="50%" cy="20%" r="80%">
            <stop offset="0%" stopColor="oklch(0.55 0.14 35)" />
            <stop offset="100%" stopColor="oklch(0.38 0.12 30)" />
          </radialGradient>
          <radialGradient id="dax-belly" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="oklch(0.88 0.07 65)" />
            <stop offset="100%" stopColor="oklch(0.78 0.1 55)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="dax-cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0.75 0.18 10)" stopOpacity="0.75" />
            <stop offset="100%" stopColor="oklch(0.75 0.18 10)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ===== BODY (sausage shape) ===== */}
        {/* Tail */}
        <path
          d="M 198 122 Q 220 110 222 92 Q 222 84 215 82"
          stroke="url(#dax-body)"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />

        {/* Long sausage body */}
        <ellipse cx="135" cy="135" rx="78" ry="32" fill="url(#dax-body)" />

        {/* Belly highlight */}
        <ellipse cx="135" cy="148" rx="60" ry="14" fill="url(#dax-belly)" />

        {/* Tiny back legs */}
        <ellipse cx="180" cy="165" rx="9" ry="14" fill="url(#dax-body)" />
        <ellipse cx="195" cy="167" rx="8" ry="12" fill="oklch(0.55 0.14 38)" />
        {/* paws */}
        <ellipse cx="180" cy="174" rx="10" ry="5" fill="oklch(0.4 0.12 30)" />
        <ellipse cx="195" cy="175" rx="9" ry="4.5" fill="oklch(0.35 0.1 28)" />

        {/* Tiny front legs */}
        <ellipse cx="92" cy="163" rx="9" ry="14" fill="url(#dax-body)" />
        <ellipse cx="78" cy="165" rx="8" ry="12" fill="oklch(0.55 0.14 38)" />
        <ellipse cx="92" cy="172" rx="10" ry="5" fill="oklch(0.4 0.12 30)" />
        <ellipse cx="78" cy="173" rx="9" ry="4.5" fill="oklch(0.35 0.1 28)" />

        {/* ===== HEAD ===== */}
        {/* slightly elongated dachshund head */}
        <ellipse cx="68" cy="98" rx="42" ry="38" fill="url(#dax-head)" />
        {/* snout extension */}
        <ellipse cx="38" cy="108" rx="22" ry="18" fill="url(#dax-head)" />

        {/* Long floppy ears */}
        <path
          d="M 78 70 Q 92 70 100 88 Q 104 110 96 130 Q 88 138 80 130 Q 76 110 76 90 Z"
          fill="url(#dax-ear)"
        />
        <path
          d="M 58 68 Q 44 70 38 88 Q 36 108 44 128 Q 52 136 60 128 Q 64 108 62 88 Z"
          fill="url(#dax-ear)"
        />
        {/* ear inner */}
        <path
          d="M 82 90 Q 90 100 90 118 Q 86 124 82 118 Q 80 105 82 90 Z"
          fill="oklch(0.7 0.15 18 / 0.4)"
        />

        {/* cheeks */}
        {blush && (
          <>
            <ellipse cx="42" cy="115" rx="9" ry="6" fill="url(#dax-cheek)" />
            <ellipse cx="80" cy="118" rx="9" ry="6" fill="url(#dax-cheek)" />
          </>
        )}

        {/* eyes */}
        {eyesClosed ? (
          <>
            <path d="M 56 100 Q 62 96 68 100" stroke="oklch(0.18 0.04 30)" strokeWidth="2.8" fill="none" strokeLinecap="round" />
            <path d="M 78 100 Q 84 96 90 100" stroke="oklch(0.18 0.04 30)" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            {/* eye whites for sparkle */}
            <ellipse cx="62" cy="100" rx="6" ry="7.5" fill="oklch(0.18 0.04 30)" />
            <ellipse cx="84" cy="100" rx="6" ry="7.5" fill="oklch(0.18 0.04 30)" />
            {/* shines */}
            <ellipse cx="64" cy="97" rx="2" ry="2.5" fill="white" />
            <ellipse cx="86" cy="97" rx="2" ry="2.5" fill="white" />
            <ellipse cx="60" cy="103" rx="1" ry="1.2" fill="white" opacity="0.7" />
            <ellipse cx="82" cy="103" rx="1" ry="1.2" fill="white" opacity="0.7" />
            {/* tiny eyebrows for expression */}
            {mood === "sad" && (
              <>
                <path d="M 56 92 Q 62 88 68 92" stroke="oklch(0.25 0.05 30)" strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M 78 92 Q 84 88 90 92" stroke="oklch(0.25 0.05 30)" strokeWidth="2" fill="none" strokeLinecap="round" />
              </>
            )}
          </>
        )}

        {/* tear */}
        {tear && (
          <ellipse cx="58" cy="112" rx="2" ry="3.5" fill="oklch(0.7 0.13 230)" />
        )}

        {/* nose */}
        <ellipse cx="22" cy="104" rx="6" ry="5" fill="oklch(0.2 0.04 30)" />
        <ellipse cx="20" cy="102" rx="1.6" ry="1.2" fill="white" opacity="0.6" />

        {/* mouth */}
        {mouthOpen ? (
          <>
            <ellipse cx="28" cy="118" rx="6" ry="5" fill="oklch(0.3 0.08 20)" />
            {tongueOut && (
              <ellipse cx="28" cy="121" rx="4" ry="4" fill="oklch(0.7 0.15 10)" />
            )}
          </>
        ) : mood === "sad" ? (
          <path d="M 22 118 Q 28 114 34 118" stroke="oklch(0.25 0.05 30)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        ) : (
          <>
            <path d="M 22 116 Q 28 122 34 116" stroke="oklch(0.25 0.05 30)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            {tongueOut && (
              <ellipse cx="28" cy="120" rx="3" ry="2.5" fill="oklch(0.72 0.16 10)" />
            )}
          </>
        )}

        {/* tiny collar */}
        <path
          d="M 92 122 Q 105 130 118 124"
          stroke="oklch(0.7 0.18 350)"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="106" cy="129" r="3" fill="oklch(0.85 0.15 80)" />

        {/* sleep Z */}
        {mood === "sleepy" && (
          <text
            x="100"
            y="65"
            fill="oklch(0.78 0.13 300)"
            fontSize="20"
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
