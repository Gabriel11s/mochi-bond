import { AnimatePresence, motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";
import mochiIdle from "@/assets/mochi-cat.png";
import mochiHappy from "@/assets/mochi-cat-happy.png";
import mochiSad from "@/assets/mochi-cat-sad.png";
import mochiSleepy from "@/assets/mochi-cat-sleepy.png";
import mochiEating from "@/assets/mochi-cat-eating.png";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
}

/**
 * "Mochi" — gatinho plush fofo (renderizado com imagens AI por mood).
 */
export function Mochi({ mood, eating, bouncing }: Props) {
  const src = eating
    ? mochiEating
    : mood === "sleepy"
    ? mochiSleepy
    : mood === "sad"
    ? mochiSad
    : mood === "happy" || mood === "excited"
    ? mochiHappy
    : mochiIdle;

  const animClass = eating
    ? "animate-mochi-eat"
    : bouncing
    ? "animate-mochi-bounce"
    : mood === "sleepy"
    ? "animate-mochi-sleep"
    : "animate-breathe";

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
        className="absolute bottom-3 h-3 w-44 rounded-full opacity-40 blur-md"
        style={{ background: "oklch(0.1 0.04 300)" }}
      />

      <div className={`relative z-10 h-64 w-64 sm:h-72 sm:w-72 ${animClass}`}>
        <AnimatePresence mode="wait">
          <motion.img
            key={src}
            src={src}
            alt="Mochi the plush cat"
            width={1024}
            height={1024}
            loading="lazy"
            draggable={false}
            className="h-full w-full select-none object-contain"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
          />
        </AnimatePresence>
      </div>
    </div>
  );
}
