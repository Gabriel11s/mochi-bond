import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { Mood } from "@/lib/mochi-types";
import type { Outfit } from "@/lib/mochi-outfit";
import { DEFAULT_OUTFIT } from "@/lib/mochi-outfit";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
  outfit?: Outfit;
}

/**
 * MochiCute — versão "bichinho fofo inicial" (mochi-kawaii):
 * gatinho gordinho mochi tigrado, olhos enormes brilhantes, bochechas peludinhas,
 * coleirinha com sininho dourado. Mantém TODA a API e animações da versão premium:
 * - respira / pisca / orelhas mexem / rabo balança
 * - segue o cursor (eye-tracking + tilt sutil)
 * - reage com surpresa a movimentos rápidos do mouse
 * - estados: feliz, triste, sleepy, eating
 * - aceita os mesmos overlays de outfit (chapéu, laço, óculos, camisetinha)
 */
export function MochiCute({ mood, eating, bouncing, outfit = DEFAULT_OUTFIT }: Props) {
  const sleeping = mood === "sleepy" && !eating;
  const sad = mood === "sad" && !eating;
  const happy = (mood === "happy" || mood === "excited") && !eating;

  const containerRef = useRef<HTMLDivElement>(null);

  // Piscar
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (sleeping) return;
    let timer: number;
    const loop = () => {
      setBlink(true);
      window.setTimeout(() => setBlink(false), 130);
      timer = window.setTimeout(loop, 2200 + Math.random() * 2400);
    };
    timer = window.setTimeout(loop, 1500);
    return () => window.clearTimeout(timer);
  }, [sleeping]);

  // Mouse tracking (mesmo esquema do premium)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 140, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 140, damping: 18, mass: 0.6 });

  const [surprised, setSurprised] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const surpriseTimer = useRef<number | null>(null);

  useEffect(() => {
    if (sleeping) {
      mx.set(0);
      my.set(0);
      return;
    }
    const handle = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      const nx = Math.max(-1.4, Math.min(1.4, dx));
      const ny = Math.max(-1.4, Math.min(1.4, dy));
      mx.set(nx);
      my.set(ny);

      const now = performance.now();
      const last = lastPosRef.current;
      if (last) {
        const dt = now - last.t;
        const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        const speed = dist / Math.max(1, dt);
        if (speed > 2.2 && Math.hypot(dx, dy) < 1.1) {
          setSurprised(true);
          if (surpriseTimer.current) window.clearTimeout(surpriseTimer.current);
          surpriseTimer.current = window.setTimeout(() => setSurprised(false), 600);
        }
      }
      lastPosRef.current = { x: e.clientX, y: e.clientY, t: now };
    };
    const reset = () => {
      mx.set(0);
      my.set(0);
    };
    window.addEventListener("pointermove", handle, { passive: true });
    window.addEventListener("pointerleave", reset);
    return () => {
      window.removeEventListener("pointermove", handle);
      window.removeEventListener("pointerleave", reset);
      if (surpriseTimer.current) window.clearTimeout(surpriseTimer.current);
    };
  }, [sleeping, mx, my]);

  const headRotate = useTransform(sx, [-1, 1], [-4, 4]);
  const headX = useTransform(sx, [-1, 1], [-3, 3]);
  const headY = useTransform(sy, [-1, 1], [-2, 2]);

  const bodyAnim = bouncing
    ? { y: [0, -22, 0, -8, 0], scaleX: [1, 1.06, 0.95, 1.02, 1], scaleY: [1, 0.94, 1.05, 0.98, 1] }
    : eating
    ? { scaleX: [1, 0.95, 1.04, 0.98, 1], scaleY: [1, 1.05, 0.96, 1.02, 1] }
    : { y: [0, -3, 0], scaleY: [1, 1.02, 1] };

  const bodyTrans = bouncing
    ? { duration: 0.7, ease: "easeOut" as const }
    : eating
    ? { duration: 0.9, ease: "easeInOut" as const, repeat: 1 }
    : { duration: 3.6, ease: "easeInOut" as const, repeat: Infinity };

  return (
    <div
      ref={containerRef}
      className="relative flex h-72 w-full items-end justify-center sm:h-80"
    >
      {/* glow halo */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full blur-3xl opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 60%, var(--accent-pink) 0%, transparent 55%)",
        }}
      />
      {/* sombra no chão */}
      <motion.div
        className="absolute bottom-4 h-3 rounded-full blur-md"
        style={{ background: "oklch(0.08 0.04 300)" }}
        animate={{
          width: bouncing ? ["180px", "120px", "180px"] : "180px",
          opacity: bouncing ? [0.45, 0.25, 0.45] : 0.45,
        }}
        transition={{ duration: 0.7 }}
      />

      <motion.div
        className="relative z-10 h-72 w-72 sm:h-80 sm:w-80"
        animate={bodyAnim}
        transition={bodyTrans}
      >
        <svg
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full select-none overflow-visible"
          aria-label="Mochi the cute kitten"
        >
          <defs>
            {/* Paleta cute: creme + caramelo claro, listras tigradas */}
            <radialGradient id="cuteBody" cx="50%" cy="38%" r="70%">
              <stop offset="0%" stopColor="#fff6e6" />
              <stop offset="60%" stopColor="#fce6c2" />
              <stop offset="100%" stopColor="#e8c89a" />
            </radialGradient>
            <radialGradient id="cuteBelly" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#fce7c2" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cuteEarInner" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ffc8d4" />
              <stop offset="100%" stopColor="#f5a3b8" />
            </radialGradient>
            <radialGradient id="cuteBlush" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9bb0" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff9bb0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="cuteEye" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#5b3f78" />
              <stop offset="60%" stopColor="#2a1638" />
              <stop offset="100%" stopColor="#0d0418" />
            </radialGradient>
            <radialGradient id="cuteBell" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fff3a8" />
              <stop offset="60%" stopColor="#f0c64a" />
              <stop offset="100%" stopColor="#a8761c" />
            </radialGradient>
            <filter id="cuteShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2.2" />
              <feOffset dx="0" dy="2" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.22" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ===== RABO curlado atrás de tudo ===== */}
          <motion.g
            style={{ transformOrigin: "180px 180px", transformBox: "fill-box" }}
            animate={{ rotate: bouncing ? [0, 16, -10, 12, 0] : [-6, 10, -6] }}
            transition={{
              duration: bouncing ? 0.7 : 2.4,
              ease: "easeInOut",
              repeat: bouncing ? 0 : Infinity,
            }}
          >
            <path
              d="M 178 188 Q 210 175 208 148 Q 206 132 192 134"
              stroke="url(#cuteBody)"
              strokeWidth="18"
              strokeLinecap="round"
              fill="none"
              filter="url(#cuteShadow)"
            />
            {/* listrinhas no rabo */}
            <path d="M 198 142 Q 202 138 204 144" stroke="#c79a5a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />
            <path d="M 204 158 Q 208 156 210 162" stroke="#c79a5a" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.55" />
          </motion.g>

          {/* ===== CORPO mochi gordinho ===== */}
          <g filter="url(#cuteShadow)">
            {/* patinhas traseiras */}
            <ellipse cx="92" cy="208" rx="20" ry="12" fill="url(#cuteBody)" />
            <ellipse cx="148" cy="208" rx="20" ry="12" fill="url(#cuteBody)" />
            {/* corpo redondinho */}
            <ellipse cx="120" cy="180" rx="58" ry="40" fill="url(#cuteBody)" />
            {/* barriga clarinha */}
            <ellipse cx="120" cy="186" rx="36" ry="24" fill="url(#cuteBelly)" />
            {/* almofadinhas das patas */}
            <ellipse cx="86" cy="210" r="3" rx="3" ry="2.2" fill="#ff9bb0" opacity="0.85" />
            <ellipse cx="98" cy="210" r="3" rx="3" ry="2.2" fill="#ff9bb0" opacity="0.85" />
            <ellipse cx="142" cy="210" r="3" rx="3" ry="2.2" fill="#ff9bb0" opacity="0.85" />
            <ellipse cx="154" cy="210" r="3" rx="3" ry="2.2" fill="#ff9bb0" opacity="0.85" />
          </g>

          {/* listras tigradas no corpo */}
          <g opacity="0.45" stroke="#c79a5a" strokeWidth="2.4" strokeLinecap="round" fill="none">
            <path d="M 88 168 Q 92 172 88 180" />
            <path d="M 104 158 Q 108 164 104 174" />
            <path d="M 138 158 Q 134 164 138 174" />
            <path d="M 152 168 Q 148 172 152 180" />
          </g>

          {/* ===== CAMISETA overlay ===== */}
          <CuteShirt id={outfit.shirt} />

          {/* ===== HEAD GROUP (segue o mouse) ===== */}
          <motion.g
            style={{
              transformOrigin: "120px 130px",
              transformBox: "fill-box",
              rotate: headRotate,
              x: headX,
              y: headY,
            }}
          >
            {/* ===== ORELHAS animadas com tufinho ===== */}
            <motion.g
              style={{ transformOrigin: "82px 78px", transformBox: "fill-box" }}
              animate={{ rotate: sleeping ? 0 : [-2, 4, -2] }}
              transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
            >
              <g filter="url(#cuteShadow)">
                <path d="M 70 92 Q 60 46 92 56 Q 102 64 100 92 Z" fill="url(#cuteBody)" />
                <path d="M 78 86 Q 74 60 90 64 Q 96 70 95 86 Z" fill="url(#cuteEarInner)" />
                {/* tufinho */}
                <path d="M 68 60 Q 64 50 72 48 Q 70 56 75 58" stroke="#fff8ee" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
              </g>
            </motion.g>
            <motion.g
              style={{ transformOrigin: "158px 78px", transformBox: "fill-box" }}
              animate={{ rotate: sleeping ? 0 : [2, -4, 2] }}
              transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
            >
              <g filter="url(#cuteShadow)">
                <path d="M 170 92 Q 180 46 148 56 Q 138 64 140 92 Z" fill="url(#cuteBody)" />
                <path d="M 162 86 Q 166 60 150 64 Q 144 70 145 86 Z" fill="url(#cuteEarInner)" />
                <path d="M 172 60 Q 176 50 168 48 Q 170 56 165 58" stroke="#fff8ee" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.9" />
              </g>
            </motion.g>

            {/* ===== CABEÇA enorme mochi ===== */}
            <g filter="url(#cuteShadow)">
              <ellipse cx="120" cy="120" rx="68" ry="60" fill="url(#cuteBody)" />
              {/* bochechinhas peludinhas (volume) */}
              <ellipse cx="68" cy="138" rx="16" ry="14" fill="url(#cuteBody)" />
              <ellipse cx="172" cy="138" rx="16" ry="14" fill="url(#cuteBody)" />
            </g>

            {/* listras tigradas na cabeça */}
            <g opacity="0.5" stroke="#c79a5a" strokeWidth="2.4" strokeLinecap="round" fill="none">
              <path d="M 100 78 Q 104 72 108 78" />
              <path d="M 116 74 Q 120 68 124 74" />
              <path d="M 132 78 Q 136 72 140 78" />
              <path d="M 60 122 Q 54 124 50 130" />
              <path d="M 180 122 Q 186 124 190 130" />
            </g>

            {/* ===== Bochechas rosinha ===== */}
            <ellipse cx="76" cy="148" rx="14" ry="9" fill="url(#cuteBlush)" />
            <ellipse cx="164" cy="148" rx="14" ry="9" fill="url(#cuteBlush)" />

            {/* ===== Olhos enormes (pupila vertical de gato) ===== */}
            <CuteEyes
              sleeping={sleeping}
              happy={happy}
              blink={blink}
              surprised={surprised}
              sx={sx}
              sy={sy}
            />

            {/* ===== Óculos overlay ===== */}
            <CuteGlasses id={outfit.glasses} />

            {/* ===== Narizinho rosa ===== */}
            <path
              d="M 116 144 Q 120 152 124 144 Q 122 148 120 148 Q 118 148 116 144 Z"
              fill="#ff8fa6"
              stroke="#d4677e"
              strokeWidth="0.7"
            />

            {/* ===== Boquinha "w" / estados ===== */}
            {eating ? (
              <motion.ellipse
                cx="120"
                cy="160"
                rx="5"
                ry="6"
                fill="#3a1a2a"
                animate={{ ry: [6, 3.5, 6] }}
                transition={{ duration: 0.4, repeat: Infinity }}
              />
            ) : sad ? (
              <path
                d="M 110 162 Q 120 154 130 162"
                stroke="#3a2a4a"
                strokeWidth="2.4"
                strokeLinecap="round"
                fill="none"
              />
            ) : (
              <g stroke="#3a2a4a" strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M 120 150 Q 116 158 110 156" />
                <path d="M 120 150 Q 124 158 130 156" />
                {happy && (
                  <path
                    d="M 116 156 Q 120 160 124 156"
                    stroke="#ff8fa6"
                    fill="#ff9bb0"
                  />
                )}
              </g>
            )}

            {/* ===== Bigodinhos ===== */}
            <g stroke="#c9a878" strokeWidth="1.3" strokeLinecap="round" opacity="0.7">
              <path d="M 60 142 L 38 138" />
              <path d="M 62 150 L 40 152" />
              <path d="M 180 142 L 202 138" />
              <path d="M 178 150 L 200 152" />
            </g>

            {/* ===== Coleirinha + sininho dourado (assinatura cute) ===== */}
            <g filter="url(#cuteShadow)">
              <path
                d="M 76 184 Q 120 198 164 184"
                stroke="#d4677e"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
              {/* sininho */}
              <circle cx="120" cy="196" r="6" fill="url(#cuteBell)" stroke="#a8761c" strokeWidth="0.8" />
              <circle cx="120" cy="198" r="1.4" fill="#7a5210" />
              <ellipse cx="118" cy="194" rx="1.4" ry="0.8" fill="#fff8c8" opacity="0.9" />
            </g>

            {/* ===== Laço/gravatinha overlay ===== */}
            <CuteBow id={outfit.bow} />

            {/* ===== Chapéu overlay ===== */}
            <CuteHat id={outfit.hat} />
          </motion.g>
          {/* ===== /HEAD GROUP ===== */}

          {/* ===== Lágrima triste ===== */}
          {sad && (
            <motion.ellipse
              cx="80"
              cy="148"
              rx="2.6"
              ry="4.2"
              fill="#7ec8f0"
              opacity="0.85"
              animate={{ y: [0, 8, 0], opacity: [0.85, 0.4, 0.85] }}
              transition={{ duration: 2.2, repeat: Infinity }}
            />
          )}

          {/* ===== Z's de sono ===== */}
          {sleeping && (
            <AnimatePresence>
              <motion.g
                key="zzz"
                fill="#ffffff"
                fontFamily="var(--font-display)"
                fontWeight="700"
                opacity="0.9"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0], y: [0, -14, -28] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <text x="186" y="62" fontSize="20">z</text>
                <text x="204" y="46" fontSize="14">z</text>
                <text x="218" y="34" fontSize="10">z</text>
              </motion.g>
            </AnimatePresence>
          )}
        </svg>
      </motion.div>
    </div>
  );
}

/* ============= Sub-componentes (cute) ============= */

function CuteEyes({
  sleeping,
  happy,
  blink,
  surprised,
  sx,
  sy,
}: {
  sleeping: boolean;
  happy: boolean;
  blink: boolean;
  surprised: boolean;
  sx: MotionValue<number>;
  sy: MotionValue<number>;
}) {
  const pxRange = 4.5;
  const pyRange = 4;
  const pupilX = useTransform(sx, [-1, 1], [-pxRange, pxRange]);
  const pupilY = useTransform(sy, [-1, 1], [-pyRange, pyRange]);

  if (sleeping) {
    return (
      <g stroke="#3a2a4a" strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M 84 124 Q 94 132 104 124" />
        <path d="M 136 124 Q 146 132 156 124" />
      </g>
    );
  }
  if (happy) {
    return (
      <g stroke="#3a2a4a" strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path d="M 84 130 Q 94 118 104 130" />
        <path d="M 136 130 Q 146 118 156 130" />
      </g>
    );
  }
  if (blink) {
    return (
      <g stroke="#3a2a4a" strokeWidth="3.2" strokeLinecap="round" fill="none">
        <path d="M 84 128 L 104 128" />
        <path d="M 136 128 L 156 128" />
      </g>
    );
  }

  // Olhos enormes, pupila VERTICAL de gato (assinatura cute)
  const scale = surprised ? 1.18 : 1;
  return (
    <motion.g
      initial={false}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 360, damping: 18 }}
      style={{ transformOrigin: "120px 128px", transformBox: "fill-box" }}
    >
      {/* esclera (creme) */}
      <ellipse cx="94" cy="128" rx="12" ry="15" fill="#fff8ee" stroke="#e8c89a" strokeWidth="0.9" />
      <ellipse cx="146" cy="128" rx="12" ry="15" fill="#fff8ee" stroke="#e8c89a" strokeWidth="0.9" />

      {/* pupila vertical (gato) — segue o mouse */}
      <motion.g style={{ x: pupilX, y: pupilY }}>
        <ellipse cx="94" cy="128" rx="3.6" ry="11" fill="url(#cuteEye)" />
        {/* brilho grandão */}
        <ellipse cx="91" cy="122" rx="2.4" ry="3.4" fill="#ffffff" opacity="0.95" />
        <circle cx="96" cy="134" r="1.2" fill="#ffffff" opacity="0.75" />
      </motion.g>
      <motion.g style={{ x: pupilX, y: pupilY }}>
        <ellipse cx="146" cy="128" rx="3.6" ry="11" fill="url(#cuteEye)" />
        <ellipse cx="143" cy="122" rx="2.4" ry="3.4" fill="#ffffff" opacity="0.95" />
        <circle cx="148" cy="134" r="1.2" fill="#ffffff" opacity="0.75" />
      </motion.g>
    </motion.g>
  );
}

function CuteHat({ id }: { id: Outfit["hat"] }) {
  if (id === "none") return null;
  if (id === "tophat") {
    return (
      <g filter="url(#cuteShadow)">
        <rect x="88" y="22" width="64" height="40" rx="3" fill="#3a2a4a" />
        <rect x="74" y="58" width="92" height="8" rx="3" fill="#3a2a4a" />
        <rect x="88" y="38" width="64" height="5" fill="#c9b3ff" opacity="0.85" />
      </g>
    );
  }
  if (id === "beret_lilac") {
    return (
      <g filter="url(#cuteShadow)">
        <ellipse cx="120" cy="54" rx="44" ry="16" fill="#8a6fd4" />
        <ellipse cx="120" cy="50" rx="38" ry="12" fill="#c9b3ff" />
        <circle cx="120" cy="38" r="5" fill="#6b4fb8" />
      </g>
    );
  }
  if (id === "beanie_mint") {
    return (
      <g filter="url(#cuteShadow)">
        <path d="M 76 64 Q 120 18 164 64 Z" fill="#a8e6cf" />
        <rect x="74" y="58" width="92" height="11" rx="3" fill="#5fb89a" />
        <circle cx="120" cy="24" r="8" fill="#fff3d6" />
        <circle cx="120" cy="24" r="8" fill="#ffffff" opacity="0.4" />
      </g>
    );
  }
  if (id === "crown") {
    return (
      <g filter="url(#cuteShadow)">
        <path
          d="M 82 64 L 88 32 L 104 56 L 120 26 L 136 56 L 152 32 L 158 64 Z"
          fill="#fff3d6"
          stroke="#d4b88a"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="104" cy="56" r="2.2" fill="#c9b3ff" />
        <circle cx="120" cy="52" r="2.2" fill="#a8e6cf" />
        <circle cx="136" cy="56" r="2.2" fill="#c9b3ff" />
      </g>
    );
  }
  if (id === "flower_cream") {
    return (
      <g filter="url(#cuteShadow)">
        <g transform="translate(82 70)">
          <ellipse cx="0" cy="-10" rx="7" ry="9" fill="#fff3d6" />
          <ellipse cx="9" cy="-3" rx="7" ry="9" fill="#fff3d6" transform="rotate(72 9 -3)" />
          <ellipse cx="6" cy="8" rx="7" ry="9" fill="#fff3d6" transform="rotate(144 6 8)" />
          <ellipse cx="-6" cy="8" rx="7" ry="9" fill="#fff3d6" transform="rotate(216 -6 8)" />
          <ellipse cx="-9" cy="-3" rx="7" ry="9" fill="#fff3d6" transform="rotate(288 -9 -3)" />
          <circle r="4.5" fill="#c9b3ff" />
          <circle r="2" fill="#fff3d6" />
        </g>
      </g>
    );
  }
  return null;
}

function CuteBow({ id }: { id: Outfit["bow"] }) {
  if (id === "none") return null;
  const colors: Record<string, { main: string; dark: string }> = {
    lilac: { main: "#c9b3ff", dark: "#8a6fd4" },
    mint: { main: "#a8e6cf", dark: "#5fb89a" },
    cream: { main: "#fff3d6", dark: "#d4b88a" },
  };
  if (id === "necktie_lilac") {
    return (
      <g filter="url(#cuteShadow)">
        <path d="M 114 184 L 126 184 L 130 196 L 120 226 L 110 196 Z" fill="#8a6fd4" />
        <path d="M 114 184 L 126 184 L 124 192 L 116 192 Z" fill="#c9b3ff" />
      </g>
    );
  }
  const c = colors[id];
  return (
    <g filter="url(#cuteShadow)">
      {/* o laço fica em cima do sininho/coleira */}
      <ellipse cx="120" cy="184" rx="5" ry="7" fill={c.dark} />
      <path d="M 120 184 Q 102 172 95 186 Q 102 200 120 184 Z" fill={c.main} />
      <path d="M 120 184 Q 138 172 145 186 Q 138 200 120 184 Z" fill={c.main} />
    </g>
  );
}

function CuteGlasses({ id }: { id: Outfit["glasses"] }) {
  if (id === "none") return null;
  if (id === "round_cream") {
    return (
      <g fill="none" stroke="#d4b88a" strokeWidth="2.4">
        <circle cx="94" cy="128" r="16" fill="#fff3d6" fillOpacity="0.18" />
        <circle cx="146" cy="128" r="16" fill="#fff3d6" fillOpacity="0.18" />
        <path d="M 110 128 L 130 128" />
      </g>
    );
  }
  if (id === "sun_lilac") {
    return (
      <g>
        <rect x="76" y="118" width="36" height="20" rx="9" fill="#3a2a4a" />
        <rect x="128" y="118" width="36" height="20" rx="9" fill="#3a2a4a" />
        <rect x="110" y="124" width="20" height="3.2" fill="#3a2a4a" />
        <rect x="80" y="122" width="11" height="5" rx="1.8" fill="#c9b3ff" opacity="0.65" />
        <rect x="132" y="122" width="11" height="5" rx="1.8" fill="#c9b3ff" opacity="0.65" />
      </g>
    );
  }
  if (id === "heart_mint") {
    return (
      <g fill="#a8e6cf" stroke="#5fb89a" strokeWidth="1.6">
        <path d="M 94 116 C 84 108 74 116 84 128 L 94 138 L 104 128 C 114 116 104 108 94 116 Z" />
        <path d="M 146 116 C 136 108 126 116 136 128 L 146 138 L 156 128 C 166 116 156 108 146 116 Z" />
        <path d="M 110 124 L 130 124" stroke="#5fb89a" strokeWidth="1.6" fill="none" />
      </g>
    );
  }
  return null;
}

function CuteShirt({ id }: { id: Outfit["shirt"] }) {
  if (id === "none") return null;
  if (id === "stripe_mint") {
    return (
      <g opacity="0.95">
        <defs>
          <clipPath id="cuteBodyClip">
            <ellipse cx="120" cy="180" rx="58" ry="40" />
          </clipPath>
        </defs>
        <g clipPath="url(#cuteBodyClip)">
          <rect x="60" y="160" width="120" height="6" fill="#a8e6cf" />
          <rect x="60" y="172" width="120" height="6" fill="#fff3d6" />
          <rect x="60" y="184" width="120" height="6" fill="#a8e6cf" />
          <rect x="60" y="196" width="120" height="6" fill="#fff3d6" />
          <rect x="60" y="208" width="120" height="6" fill="#a8e6cf" />
        </g>
      </g>
    );
  }
  if (id === "hoodie_lilac") {
    return (
      <g filter="url(#cuteShadow)">
        <ellipse cx="120" cy="124" rx="74" ry="22" fill="#8a6fd4" opacity="0.9" />
        <path
          d="M 64 180 Q 64 158 86 158 L 154 158 Q 176 158 176 180 L 176 220 L 64 220 Z"
          fill="#c9b3ff"
        />
        <circle cx="110" cy="186" r="2.4" fill="#fff3d6" />
        <circle cx="130" cy="186" r="2.4" fill="#fff3d6" />
      </g>
    );
  }
  if (id === "sweater_cream") {
    return (
      <g filter="url(#cuteShadow)">
        <path
          d="M 66 180 Q 66 160 88 160 L 152 160 Q 174 160 174 180 L 174 220 L 66 220 Z"
          fill="#fff3d6"
        />
        <g stroke="#d4b88a" strokeWidth="0.9" opacity="0.55">
          <path d="M 70 172 L 170 172" />
          <path d="M 70 184 L 170 184" />
          <path d="M 70 196 L 170 196" />
          <path d="M 70 208 L 170 208" />
        </g>
        <text x="110" y="200" fontSize="11" fill="#c9b3ff" opacity="0.85">♡</text>
        <text x="134" y="190" fontSize="8" fill="#a8e6cf" opacity="0.85">♡</text>
      </g>
    );
  }
  if (id === "scarf_mint") {
    return (
      <g filter="url(#cuteShadow)">
        <path
          d="M 78 172 Q 120 184 162 172 L 168 192 Q 120 204 72 192 Z"
          fill="#a8e6cf"
        />
        <path
          d="M 154 192 Q 162 214 174 216 L 178 198 Q 168 196 162 188 Z"
          fill="#5fb89a"
        />
      </g>
    );
  }
  return null;
}
