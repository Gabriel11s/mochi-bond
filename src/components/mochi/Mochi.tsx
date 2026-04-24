import { motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
}

/**
 * Mochi — gatinho plush kawaii (SVG handcrafted, proporções "mochi mochi").
 * Cabeça grande, corpinho mini, bochechas redondas, olhos brilhantes.
 */
export function Mochi({ mood, eating, bouncing }: Props) {
  const sleeping = mood === "sleepy" && !eating;
  const sad = mood === "sad" && !eating;
  const happy = (mood === "happy" || mood === "excited") && !eating;

  const animClass = eating
    ? "animate-mochi-eat"
    : bouncing
    ? "animate-mochi-bounce"
    : sleeping
    ? "animate-mochi-sleep"
    : "animate-breathe";

  return (
    <div className="relative flex h-72 w-full items-end justify-center sm:h-80">
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

      <div className={`relative z-10 h-72 w-72 sm:h-80 sm:w-80 ${animClass}`}>
        <svg
          viewBox="0 0 320 320"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full select-none"
          aria-label="Mochi the plush kitten"
        >
          <defs>
            {/* corpo - creme plush com sombra suave embaixo */}
            <radialGradient id="bodyGrad" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fff8ee" />
              <stop offset="55%" stopColor="#faecd4" />
              <stop offset="100%" stopColor="#e8c89a" />
            </radialGradient>
            {/* highlight macio em cima da cabeça */}
            <radialGradient id="topShine" cx="40%" cy="20%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            {/* barriguinha mais clarinha */}
            <radialGradient id="bellyGrad" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#fce7c2" stopOpacity="0" />
            </radialGradient>
            {/* orelha interna rosinha */}
            <radialGradient id="earInner" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="#ffc8d4" />
              <stop offset="100%" stopColor="#f5a3b8" />
            </radialGradient>
            {/* bochecha rosinha */}
            <radialGradient id="blushGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ff9bb0" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ff9bb0" stopOpacity="0" />
            </radialGradient>
            {/* olho brilhante */}
            <radialGradient id="eyeGrad" cx="50%" cy="40%" r="65%">
              <stop offset="0%" stopColor="#3a2a4a" />
              <stop offset="70%" stopColor="#1a0f24" />
              <stop offset="100%" stopColor="#0a0510" />
            </radialGradient>
            <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="3" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.25" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* ===== CORPINHO (pequeno, escondido atrás da cabeça grande) ===== */}
          <g filter="url(#softShadow)">
            {/* patinhas traseiras */}
            <ellipse cx="118" cy="278" rx="28" ry="14" fill="url(#bodyGrad)" />
            <ellipse cx="202" cy="278" rx="28" ry="14" fill="url(#bodyGrad)" />
            {/* corpinho redondo */}
            <ellipse cx="160" cy="240" rx="78" ry="50" fill="url(#bodyGrad)" />
            {/* barriga clarinha */}
            <ellipse cx="160" cy="248" rx="50" ry="32" fill="url(#bellyGrad)" />
            {/* patinhas frontais */}
            <ellipse cx="128" cy="270" rx="20" ry="14" fill="url(#bodyGrad)" />
            <ellipse cx="192" cy="270" rx="20" ry="14" fill="url(#bodyGrad)" />
            {/* dedinhos */}
            <circle cx="122" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="128" cy="276" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="134" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="186" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="192" cy="276" r="2.2" fill="#d4a574" opacity="0.6" />
            <circle cx="198" cy="274" r="2.2" fill="#d4a574" opacity="0.6" />

            {/* rabinho curvado */}
            <path
              d="M 235 240 Q 270 220 268 188 Q 266 168 250 168"
              stroke="url(#bodyGrad)"
              strokeWidth="22"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 250 175 Q 256 172 258 178"
              stroke="#e8c89a"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.5"
            />
          </g>

          {/* ===== ORELHAS ===== */}
          <g filter="url(#softShadow)">
            {/* esquerda */}
            <path
              d="M 92 112 Q 78 60 110 70 Q 122 78 124 110 Z"
              fill="url(#bodyGrad)"
            />
            <path
              d="M 100 105 Q 95 78 113 82 Q 119 88 119 105 Z"
              fill="url(#earInner)"
            />
            {/* direita */}
            <path
              d="M 228 112 Q 242 60 210 70 Q 198 78 196 110 Z"
              fill="url(#bodyGrad)"
            />
            <path
              d="M 220 105 Q 225 78 207 82 Q 201 88 201 105 Z"
              fill="url(#earInner)"
            />
          </g>

          {/* ===== CABEÇA (grande, mochi mochi) ===== */}
          <g filter="url(#softShadow)">
            <ellipse cx="160" cy="160" rx="92" ry="82" fill="url(#bodyGrad)" />
            {/* highlight em cima */}
            <ellipse cx="135" cy="118" rx="55" ry="35" fill="url(#topShine)" />
            {/* bochechas plush (volume) */}
            <ellipse cx="88" cy="178" rx="22" ry="18" fill="url(#bodyGrad)" />
            <ellipse cx="232" cy="178" rx="22" ry="18" fill="url(#bodyGrad)" />
          </g>

          {/* ===== MARCAÇÕES TABBY (manchinhas suaves) ===== */}
          <g opacity="0.5">
            <path
              d="M 130 100 Q 134 92 138 100"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 145 96 Q 149 88 153 96"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 167 96 Q 171 88 175 96"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 182 100 Q 186 92 190 100"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            {/* listrinhas laterais */}
            <path
              d="M 80 160 Q 72 162 68 168"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M 240 160 Q 248 162 252 168"
              stroke="#d4a574"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
            />
          </g>

          {/* ===== BOCHECHAS ROSINHAS ===== */}
          <ellipse cx="100" cy="190" rx="20" ry="12" fill="url(#blushGrad)" />
          <ellipse cx="220" cy="190" rx="20" ry="12" fill="url(#blushGrad)" />

          {/* ===== OLHOS ===== */}
          {sleeping ? (
            <g stroke="#3a2a4a" strokeWidth="3.5" strokeLinecap="round" fill="none">
              <path d="M 116 168 Q 128 176 140 168" />
              <path d="M 180 168 Q 192 176 204 168" />
            </g>
          ) : happy ? (
            <g stroke="#3a2a4a" strokeWidth="4" strokeLinecap="round" fill="none">
              <path d="M 116 172 Q 128 160 140 172" />
              <path d="M 180 172 Q 192 160 204 172" />
            </g>
          ) : (
            <g>
              {/* olho esquerdo */}
              <ellipse cx="128" cy="170" rx="13" ry="16" fill="url(#eyeGrad)" />
              <ellipse cx="124" cy="164" rx="4.5" ry="6" fill="#ffffff" opacity="0.95" />
              <circle cx="132" cy="174" r="2" fill="#ffffff" opacity="0.7" />
              {/* olho direito */}
              <ellipse cx="192" cy="170" rx="13" ry="16" fill="url(#eyeGrad)" />
              <ellipse cx="188" cy="164" rx="4.5" ry="6" fill="#ffffff" opacity="0.95" />
              <circle cx="196" cy="174" r="2" fill="#ffffff" opacity="0.7" />
            </g>
          )}

          {/* ===== NARIZ ===== */}
          <path
            d="M 156 192 Q 160 200 164 192 Q 162 196 160 196 Q 158 196 156 192 Z"
            fill="#ff8fa6"
            stroke="#d4677e"
            strokeWidth="0.8"
          />

          {/* ===== BOCA ===== */}
          {eating ? (
            <ellipse cx="160" cy="208" rx="6" ry="7" fill="#3a1a2a" />
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

          {/* ===== BIGODES ===== */}
          <g stroke="#c9a878" strokeWidth="1.4" strokeLinecap="round" opacity="0.7">
            <path d="M 80 188 L 56 184" />
            <path d="M 82 196 L 58 198" />
            <path d="M 240 188 L 264 184" />
            <path d="M 238 196 L 262 198" />
          </g>

          {/* ===== Z's de sono ===== */}
          {sleeping && (
            <g
              fill="#ffffff"
              fontFamily="var(--font-display)"
              fontWeight="700"
              opacity="0.85"
            >
              <text x="245" y="80" fontSize="22">
                z
              </text>
              <text x="265" y="62" fontSize="16">
                z
              </text>
              <text x="280" y="48" fontSize="11">
                z
              </text>
            </g>
          )}

          {/* ===== Lágrima triste ===== */}
          {sad && (
            <ellipse cx="120" cy="194" rx="3" ry="5" fill="#7ec8f0" opacity="0.85" />
          )}
        </svg>
      </div>
    </div>
  );
}
