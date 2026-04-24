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
 * Mochi — gatinho plush kawaii em SVG totalmente animado:
 * - respira (corpo/cabeça)
 * - pisca os olhos
 * - orelhas mexem
 * - rabo balança continuamente
 * - estados: feliz, triste, sleepy, eating
 * Suporta acessórios (chapéu, laço, óculos, camisetinha) por overlay.
 */
export function MochiPremium({ mood, eating, bouncing, outfit = DEFAULT_OUTFIT }: Props) {
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

  // ========== Mouse tracking (eye-tracking + head tilt) ==========
  // Normalized -1..1 coords relative to face center.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  // Springs para suavidade e fofura (pequeno overshoot).
  const sx = useSpring(mx, { stiffness: 140, damping: 18, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 140, damping: 18, mass: 0.6 });

  // Surpresa: olhos arregalam quando o mouse se aproxima rápido
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

      // Detectar movimento rápido pra reagir com surpresa
      const now = performance.now();
      const last = lastPosRef.current;
      if (last) {
        const dt = now - last.t;
        const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
        const speed = dist / Math.max(1, dt); // px/ms
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

  // Head tilt (sutil)
  const headRotate = useTransform(sx, [-1, 1], [-4, 4]);
  const headX = useTransform(sx, [-1, 1], [-3, 3]);
  const headY = useTransform(sy, [-1, 1], [-2, 2]);

  // animação de bounce extra
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
      {/* ground shadow */}
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
          viewBox="0 0 320 320"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full select-none overflow-visible"
          aria-label="Mochi the plush kitten"
        >
          <defs>
            <radialGradient id="bodyGrad" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fff8ee" />
              <stop offset="55%" stopColor="#faecd4" />
              <stop offset="100%" stopColor="#e8c89a" />
            </radialGradient>
            <radialGradient id="topShine" cx="40%" cy="20%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="bellyGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#fce7c2" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="earInner" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ffc8d4" />
              <stop offset="100%" stopColor="#f5a3b8" />
            </radialGradient>
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9bb0" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff9bb0" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="eyeGrad" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#3a2a4a" />
              <stop offset="70%" stopColor="#1a0f24" />
              <stop offset="100%" stopColor="#0a0510" />
            </radialGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="3" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.25" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ===== RABO (animado, atrás de tudo) ===== */}
          <motion.g
            style={{ transformOrigin: "240px 230px", transformBox: "fill-box" }}
            animate={{ rotate: bouncing ? [0, 18, -10, 12, 0] : [-6, 10, -6] }}
            transition={{
              duration: bouncing ? 0.7 : 2.4,
              ease: "easeInOut",
              repeat: bouncing ? 0 : Infinity,
            }}
          >
            <path
              d="M 235 240 Q 270 220 268 188 Q 266 168 250 168"
              stroke="url(#bodyGrad)"
              strokeWidth="22"
              strokeLinecap="round"
              fill="none"
              filter="url(#softShadow)"
            />
            <path
              d="M 250 175 Q 256 172 258 178"
              stroke="#e8c89a"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
          </motion.g>

          {/* ===== CORPO ===== */}
          <g filter="url(#softShadow)">
            <ellipse cx="118" cy="278" rx="28" ry="14" fill="url(#bodyGrad)" />
            <ellipse cx="202" cy="278" rx="28" ry="14" fill="url(#bodyGrad)" />
            <ellipse cx="160" cy="240" rx="78" ry="50" fill="url(#bodyGrad)" />
            <ellipse cx="160" cy="248" rx="50" ry="32" fill="url(#bellyGrad)" />
            <ellipse cx="128" cy="270" rx="20" ry="14" fill="url(#bodyGrad)" />
            <ellipse cx="192" cy="270" rx="20" ry="14" fill="url(#bodyGrad)" />
            <circle cx="122" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="128" cy="276" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="134" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="186" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="192" cy="276" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="198" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
          </g>

          {/* ===== CAMISETA (overlay no corpo) ===== */}
          <Shirt id={outfit.shirt} />

          {/* ===== HEAD GROUP (segue o cursor com tilt sutil) ===== */}
          <motion.g
            style={{
              transformOrigin: "160px 200px",
              transformBox: "fill-box",
              rotate: headRotate,
              x: headX,
              y: headY,
            }}
          >
          {/* ===== ORELHAS animadas independentes ===== */}
          <motion.g
            style={{ transformOrigin: "108px 100px", transformBox: "fill-box" }}
            animate={{ rotate: sleeping ? 0 : [-2, 4, -2] }}
            transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
          >
            <g filter="url(#softShadow)">
              <path
                d="M 92 112 Q 78 60 110 70 Q 122 78 124 110 Z"
                fill="url(#bodyGrad)"
              />
              <path
                d="M 100 105 Q 95 78 113 82 Q 119 88 119 105 Z"
                fill="url(#earInner)"
              />
            </g>
          </motion.g>
          <motion.g
            style={{ transformOrigin: "212px 100px", transformBox: "fill-box" }}
            animate={{ rotate: sleeping ? 0 : [2, -4, 2] }}
            transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
          >
            <g filter="url(#softShadow)">
              <path
                d="M 228 112 Q 242 60 210 70 Q 198 78 196 110 Z"
                fill="url(#bodyGrad)"
              />
              <path
                d="M 220 105 Q 225 78 207 82 Q 201 88 201 105 Z"
                fill="url(#earInner)"
              />
            </g>
          </motion.g>

          {/* ===== CABEÇA ===== */}
          <g filter="url(#softShadow)">
            <ellipse cx="160" cy="160" rx="92" ry="82" fill="url(#bodyGrad)" />
            <ellipse cx="135" cy="118" rx="55" ry="35" fill="url(#topShine)" />
            <ellipse cx="88" cy="178" rx="22" ry="18" fill="url(#bodyGrad)" />
            <ellipse cx="232" cy="178" rx="22" ry="18" fill="url(#bodyGrad)" />
          </g>

          {/* ===== Marcações tabby suaves ===== */}
          <g opacity="0.5">
            <path d="M 130 100 Q 134 92 138 100" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 145 96 Q 149 88 153 96" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 167 96 Q 171 88 175 96" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 182 100 Q 186 92 190 100" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 80 160 Q 72 162 68 168" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" fill="none" />
            <path d="M 240 160 Q 248 162 252 168" stroke="#d4a574" strokeWidth="3" strokeLinecap="round" fill="none" />
          </g>

          {/* ===== Bochechas rosinha ===== */}
          <ellipse cx="100" cy="190" rx="20" ry="12" fill="url(#blushGrad)" />
          <ellipse cx="220" cy="190" rx="20" ry="12" fill="url(#blushGrad)" />

          {/* ===== Olhos ===== */}
          <Eyes
            sleeping={sleeping}
            happy={happy}
            blink={blink}
            surprised={surprised}
            sx={sx}
            sy={sy}
          />

          {/* ===== Óculos overlay ===== */}
          <Glasses id={outfit.glasses} />

          {/* ===== Nariz ===== */}
          <path
            d="M 156 192 Q 160 200 164 192 Q 162 196 160 196 Q 158 196 156 192 Z"
            fill="#ff8fa6"
            stroke="#d4677e"
            strokeWidth="0.8"
          />

          {/* ===== Boca ===== */}
          {eating ? (
            <motion.ellipse
              cx="160"
              cy="208"
              rx="6"
              ry="7"
              fill="#3a1a2a"
              animate={{ ry: [7, 4, 7] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
          ) : sad ? (
            <path
              d="M 150 212 Q 160 204 170 212"
              stroke="#3a2a4a"
              strokeWidth="2.5"
              strokeLinecap="round"
              fill="none"
            />
          ) : (
            <g stroke="#3a2a4a" strokeWidth="2.5" strokeLinecap="round" fill="none">
              <path d="M 160 198 Q 156 206 150 204" />
              <path d="M 160 198 Q 164 206 170 204" />
              {happy && (
                <path
                  d="M 156 204 Q 160 208 164 204"
                  stroke="#ff8fa6"
                  fill="#ff9bb0"
                />
              )}
            </g>
          )}

          {/* ===== Bigodes ===== */}
          <g stroke="#c9a878" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
            <path d="M 80 188 L 56 184" />
            <path d="M 82 196 L 58 198" />
            <path d="M 240 188 L 264 184" />
            <path d="M 238 196 L 262 198" />
          </g>

          {/* ===== Laço/gravatinha (overlay no pescoço) ===== */}
          <Bow id={outfit.bow} />

          {/* ===== Chapéu (overlay topo) ===== */}
          <Hat id={outfit.hat} />
          </motion.g>
          {/* ===== /HEAD GROUP ===== */}

          {/* ===== Lágrima triste ===== */}
          {sad && (
            <motion.ellipse
              cx="120"
              cy="194"
              rx="3"
              ry="5"
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
                <text x="245" y="80" fontSize="22">z</text>
                <text x="265" y="62" fontSize="16">z</text>
                <text x="280" y="48" fontSize="11">z</text>
              </motion.g>
            </AnimatePresence>
          )}
        </svg>
      </motion.div>
    </div>
  );
}

/* ============= Sub-componentes ============= */

function Eyes({
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
  // Pupila pode se mover dentro do olho (raio do olho ~ 13/16)
  // Range pequeno e fofo, com clamp via useTransform.
  const pxRange = 6;
  const pyRange = 5;
  const pupilX = useTransform(sx, [-1, 1], [-pxRange, pxRange]);
  const pupilY = useTransform(sy, [-1, 1], [-pyRange, pyRange]);

  if (sleeping) {
    return (
      <g stroke="#3a2a4a" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M 116 168 Q 128 176 140 168" />
        <path d="M 180 168 Q 192 176 204 168" />
      </g>
    );
  }
  if (happy) {
    return (
      <g stroke="#3a2a4a" strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M 116 172 Q 128 160 140 172" />
        <path d="M 180 172 Q 192 160 204 172" />
      </g>
    );
  }
  if (blink) {
    return (
      <g stroke="#3a2a4a" strokeWidth="3.5" strokeLinecap="round" fill="none">
        <path d="M 116 170 L 140 170" />
        <path d="M 180 170 L 204 170" />
      </g>
    );
  }

  // Olhos normais com pupilas que seguem o cursor.
  // O olho (esclera) é creme/branco — a pupila escura é o que se move dentro.
  const scale = surprised ? 1.18 : 1;
  return (
    <motion.g
      initial={false}
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 360, damping: 18 }}
      style={{ transformOrigin: "160px 170px", transformBox: "fill-box" }}
    >
      {/* esclera (branco do olho) */}
      <ellipse cx="128" cy="170" rx="13" ry="16" fill="#fff8ee" stroke="#e8c89a" strokeWidth="1" />
      <ellipse cx="192" cy="170" rx="13" ry="16" fill="#fff8ee" stroke="#e8c89a" strokeWidth="1" />

      {/* pupilas (movem com o mouse) */}
      <motion.g style={{ x: pupilX, y: pupilY }}>
        <ellipse cx="128" cy="170" rx="9" ry="13" fill="url(#eyeGrad)" />
        <ellipse cx="124" cy="164" rx="3.5" ry="5" fill="#ffffff" opacity="0.95" />
        <circle cx="131" cy="176" r="1.6" fill="#ffffff" opacity="0.7" />
      </motion.g>
      <motion.g style={{ x: pupilX, y: pupilY }}>
        <ellipse cx="192" cy="170" rx="9" ry="13" fill="url(#eyeGrad)" />
        <ellipse cx="188" cy="164" rx="3.5" ry="5" fill="#ffffff" opacity="0.95" />
        <circle cx="195" cy="176" r="1.6" fill="#ffffff" opacity="0.7" />
      </motion.g>
    </motion.g>
  );
}

function Hat({ id }: { id: Outfit["hat"] }) {
  if (id === "none") return null;
  if (id === "tophat") {
    return (
      <g filter="url(#softShadow)">
        <rect x="118" y="40" width="84" height="50" rx="4" fill="#3a2a4a" />
        <rect x="100" y="86" width="120" height="10" rx="3" fill="#3a2a4a" />
        <rect x="118" y="60" width="84" height="6" fill="#c9b3ff" opacity="0.85" />
      </g>
    );
  }
  if (id === "beret_lilac") {
    return (
      <g filter="url(#softShadow)">
        <ellipse cx="160" cy="78" rx="58" ry="22" fill="#8a6fd4" />
        <ellipse cx="160" cy="74" rx="50" ry="16" fill="#c9b3ff" />
        <circle cx="160" cy="58" r="6" fill="#6b4fb8" />
      </g>
    );
  }
  if (id === "beanie_mint") {
    return (
      <g filter="url(#softShadow)">
        <path d="M 102 92 Q 160 30 218 92 Z" fill="#a8e6cf" />
        <rect x="100" y="86" width="120" height="14" rx="4" fill="#5fb89a" />
        <circle cx="160" cy="38" r="10" fill="#fff3d6" />
        <circle cx="160" cy="38" r="10" fill="#ffffff" opacity="0.4" />
        {/* tricô texture */}
        <g stroke="#5fb89a" strokeWidth="0.8" opacity="0.6">
          <path d="M 110 70 L 130 90" />
          <path d="M 130 60 L 150 90" />
          <path d="M 150 52 L 170 90" />
          <path d="M 170 52 L 190 90" />
          <path d="M 190 60 L 210 90" />
        </g>
      </g>
    );
  }
  if (id === "crown") {
    return (
      <g filter="url(#softShadow)">
        <path
          d="M 110 90 L 118 50 L 138 78 L 160 42 L 182 78 L 202 50 L 210 90 Z"
          fill="#fff3d6"
          stroke="#d4b88a"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="138" cy="80" r="3" fill="#c9b3ff" />
        <circle cx="160" cy="74" r="3" fill="#a8e6cf" />
        <circle cx="182" cy="80" r="3" fill="#c9b3ff" />
      </g>
    );
  }
  if (id === "flower_cream") {
    // 5 pétalas creme com miolo lilás, atrás da orelha esquerda
    return (
      <g filter="url(#softShadow)">
        <g transform="translate(108 96)">
          <ellipse cx="0" cy="-12" rx="9" ry="11" fill="#fff3d6" />
          <ellipse cx="11" cy="-4" rx="9" ry="11" fill="#fff3d6" transform="rotate(72 11 -4)" />
          <ellipse cx="7" cy="10" rx="9" ry="11" fill="#fff3d6" transform="rotate(144 7 10)" />
          <ellipse cx="-7" cy="10" rx="9" ry="11" fill="#fff3d6" transform="rotate(216 -7 10)" />
          <ellipse cx="-11" cy="-4" rx="9" ry="11" fill="#fff3d6" transform="rotate(288 -11 -4)" />
          <circle r="6" fill="#c9b3ff" />
          <circle r="2.5" fill="#fff3d6" />
        </g>
      </g>
    );
  }
  return null;
}

function Bow({ id }: { id: Outfit["bow"] }) {
  if (id === "none") return null;
  const colors: Record<string, { main: string; dark: string }> = {
    lilac: { main: "#c9b3ff", dark: "#8a6fd4" },
    mint: { main: "#a8e6cf", dark: "#5fb89a" },
    cream: { main: "#fff3d6", dark: "#d4b88a" },
  };
  if (id === "necktie_lilac") {
    return (
      <g filter="url(#softShadow)">
        <path d="M 152 232 L 168 232 L 174 248 L 160 296 L 146 248 Z" fill="#8a6fd4" />
        <path d="M 152 232 L 168 232 L 164 244 L 156 244 Z" fill="#c9b3ff" />
      </g>
    );
  }
  const c = colors[id];
  return (
    <g filter="url(#softShadow)">
      <ellipse cx="160" cy="232" rx="6" ry="8" fill={c.dark} />
      <path d="M 160 232 Q 138 218 130 234 Q 138 250 160 232 Z" fill={c.main} />
      <path d="M 160 232 Q 182 218 190 234 Q 182 250 160 232 Z" fill={c.main} />
      <path d="M 134 226 Q 142 232 134 240" stroke={c.dark} strokeWidth="1.2" fill="none" opacity="0.5" />
      <path d="M 186 226 Q 178 232 186 240" stroke={c.dark} strokeWidth="1.2" fill="none" opacity="0.5" />
    </g>
  );
}

function Glasses({ id }: { id: Outfit["glasses"] }) {
  if (id === "none") return null;
  if (id === "round_cream") {
    return (
      <g fill="none" stroke="#d4b88a" strokeWidth="3">
        <circle cx="128" cy="170" r="20" fill="#fff3d6" fillOpacity="0.18" />
        <circle cx="192" cy="170" r="20" fill="#fff3d6" fillOpacity="0.18" />
        <path d="M 148 170 L 172 170" />
      </g>
    );
  }
  if (id === "sun_lilac") {
    return (
      <g>
        <rect x="106" y="158" width="44" height="22" rx="10" fill="#3a2a4a" />
        <rect x="170" y="158" width="44" height="22" rx="10" fill="#3a2a4a" />
        <rect x="148" y="166" width="24" height="4" fill="#3a2a4a" />
        <rect x="112" y="162" width="14" height="6" rx="2" fill="#c9b3ff" opacity="0.65" />
        <rect x="176" y="162" width="14" height="6" rx="2" fill="#c9b3ff" opacity="0.65" />
      </g>
    );
  }
  if (id === "heart_mint") {
    return (
      <g fill="#a8e6cf" stroke="#5fb89a" strokeWidth="2">
        <path d="M 128 158 C 116 148 104 158 116 172 L 128 184 L 140 172 C 152 158 140 148 128 158 Z" />
        <path d="M 192 158 C 180 148 168 158 180 172 L 192 184 L 204 172 C 216 158 204 148 192 158 Z" />
        <path d="M 148 168 L 172 168" stroke="#5fb89a" strokeWidth="2" fill="none" />
      </g>
    );
  }
  return null;
}

function Shirt({ id }: { id: Outfit["shirt"] }) {
  if (id === "none") return null;
  if (id === "stripe_mint") {
    return (
      <g opacity="0.95">
        <defs>
          <clipPath id="bodyClipStripe">
            <ellipse cx="160" cy="240" rx="78" ry="50" />
          </clipPath>
        </defs>
        <g clipPath="url(#bodyClipStripe)">
          <rect x="80" y="220" width="160" height="8" fill="#a8e6cf" />
          <rect x="80" y="234" width="160" height="8" fill="#fff3d6" />
          <rect x="80" y="248" width="160" height="8" fill="#a8e6cf" />
          <rect x="80" y="262" width="160" height="8" fill="#fff3d6" />
          <rect x="80" y="276" width="160" height="8" fill="#a8e6cf" />
        </g>
      </g>
    );
  }
  if (id === "hoodie_lilac") {
    return (
      <g filter="url(#softShadow)">
        {/* capuz atrás */}
        <ellipse cx="160" cy="172" rx="98" ry="28" fill="#8a6fd4" opacity="0.95" />
        <path
          d="M 90 240 Q 90 215 115 215 L 205 215 Q 230 215 230 240 L 230 290 L 90 290 Z"
          fill="#c9b3ff"
        />
        <circle cx="148" cy="248" r="3" fill="#fff3d6" />
        <circle cx="172" cy="248" r="3" fill="#fff3d6" />
        <path d="M 150 248 L 150 268 M 170 248 L 170 268" stroke="#fff3d6" strokeWidth="1.5" />
      </g>
    );
  }
  if (id === "sweater_cream") {
    return (
      <g filter="url(#softShadow)">
        <path
          d="M 92 240 Q 92 218 116 218 L 204 218 Q 228 218 228 240 L 228 290 L 92 290 Z"
          fill="#fff3d6"
        />
        <g stroke="#d4b88a" strokeWidth="1" opacity="0.55">
          <path d="M 100 230 L 220 230" />
          <path d="M 100 244 L 220 244" />
          <path d="M 100 258 L 220 258" />
          <path d="M 100 272 L 220 272" />
        </g>
        <g stroke="#d4b88a" strokeWidth="1" opacity="0.4">
          <path d="M 120 218 L 120 290" />
          <path d="M 145 218 L 145 290" />
          <path d="M 175 218 L 175 290" />
          <path d="M 200 218 L 200 290" />
        </g>
        {/* corações pequenos */}
        <text x="148" y="266" fontSize="14" fill="#c9b3ff" opacity="0.8">♡</text>
        <text x="178" y="252" fontSize="10" fill="#a8e6cf" opacity="0.8">♡</text>
      </g>
    );
  }
  if (id === "scarf_mint") {
    // Cachecol envolto no pescoço (não cobre corpo, mais leve)
    return (
      <g filter="url(#softShadow)">
        <path
          d="M 108 222 Q 160 232 212 222 L 220 244 Q 160 256 100 244 Z"
          fill="#a8e6cf"
        />
        {/* ponta caindo */}
        <path
          d="M 200 244 Q 210 268 224 270 L 230 250 Q 218 248 212 240 Z"
          fill="#5fb89a"
        />
        {/* franjas */}
        <g stroke="#5fb89a" strokeWidth="1.5" strokeLinecap="round">
          <path d="M 222 270 L 220 282" />
          <path d="M 226 268 L 226 282" />
          <path d="M 230 264 L 232 278" />
        </g>
      </g>
    );
  }
  return null;
}
