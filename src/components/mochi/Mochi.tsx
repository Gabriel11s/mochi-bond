import { motion } from "framer-motion";
import type { Mood } from "@/lib/mochi-types";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
}

/**
 * "Mochi" — gatinho kawaii estilo mochi (gordinho, redondinho).
 * ViewBox: 240 x 240
 */
export function Mochi({ mood, eating, bouncing }: Props) {
  const eyesClosed = mood === "sleepy";
  const blush = true; // sempre fofinho
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

  // paleta creme/caramelo macio
  const FUR_LIGHT = "oklch(0.96 0.02 80)";
  const FUR = "oklch(0.9 0.04 75)";
  const FUR_MID = "oklch(0.82 0.07 65)";
  const FUR_DARK = "oklch(0.62 0.1 50)"; // listras
  const BELLY = "oklch(0.985 0.012 90)";
  const INNER_EAR = "oklch(0.84 0.1 18)";
  const NOSE = "oklch(0.74 0.16 12)";
  const INK = "oklch(0.22 0.04 280)";
  const TONGUE = "oklch(0.74 0.17 12)";
  const BLUSH = "oklch(0.78 0.18 12)";

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
        className="absolute bottom-3 h-3 w-40 rounded-full opacity-40 blur-md"
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
          <radialGradient id="fur" cx="50%" cy="38%" r="68%">
            <stop offset="0%" stopColor={FUR_LIGHT} />
            <stop offset="70%" stopColor={FUR} />
            <stop offset="100%" stopColor={FUR_MID} />
          </radialGradient>
          <radialGradient id="bellyGrad" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor={BELLY} stopOpacity="1" />
            <stop offset="100%" stopColor={BELLY} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="cheek" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={BLUSH} stopOpacity="0.85" />
            <stop offset="100%" stopColor={BLUSH} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="earInner" cx="50%" cy="60%" r="60%">
            <stop offset="0%" stopColor="oklch(0.9 0.08 18)" />
            <stop offset="100%" stopColor={INNER_EAR} />
          </radialGradient>
          {/* máscara para listras só dentro do corpo */}
          <clipPath id="bodyClip">
            <ellipse cx="120" cy="172" rx="68" ry="52" />
          </clipPath>
          <clipPath id="headClip">
            <ellipse cx="120" cy="112" rx="66" ry="58" />
          </clipPath>
        </defs>

        {/* ============ CAUDA gordinha enroladinha ============ */}
        <path
          d="M 184 196
             Q 220 196 222 164
             Q 222 138 198 134
             Q 188 134 188 144"
          stroke="url(#fur)"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
        />
        {/* listrinhas da cauda */}
        <g stroke={FUR_DARK} strokeWidth="3.5" strokeLinecap="round" opacity="0.8">
          <path d="M 198 196 L 204 200" />
          <path d="M 214 184 L 220 184" />
          <path d="M 218 168 L 224 166" />
          <path d="M 212 150 L 218 146" />
        </g>

        {/* ============ CORPINHO mochi redondo ============ */}
        <ellipse cx="120" cy="172" rx="68" ry="52" fill="url(#fur)" />

        {/* listras tigradas no corpo */}
        <g
          clipPath="url(#bodyClip)"
          stroke={FUR_DARK}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        >
          <path d="M 70 150 Q 78 158 70 168" />
          <path d="M 64 174 Q 72 182 64 190" />
          <path d="M 78 196 Q 86 200 80 208" />
          <path d="M 170 150 Q 162 158 170 168" />
          <path d="M 176 174 Q 168 182 176 190" />
          <path d="M 162 196 Q 154 200 160 208" />
          <path d="M 120 130 Q 124 138 120 144" opacity="0.5" />
        </g>

        {/* barriguinha clara */}
        <ellipse cx="120" cy="186" rx="40" ry="30" fill="url(#bellyGrad)" />

        {/* patinhas da frente — almofadinhas */}
        <ellipse cx="92" cy="218" rx="16" ry="11" fill={FUR_LIGHT} />
        <ellipse cx="148" cy="218" rx="16" ry="11" fill={FUR_LIGHT} />
        {/* dedinhos rosados */}
        <g fill={INNER_EAR} opacity="0.85">
          <ellipse cx="84" cy="221" rx="2" ry="1.6" />
          <ellipse cx="92" cy="223" rx="2" ry="1.6" />
          <ellipse cx="100" cy="221" rx="2" ry="1.6" />
          <ellipse cx="140" cy="221" rx="2" ry="1.6" />
          <ellipse cx="148" cy="223" rx="2" ry="1.6" />
          <ellipse cx="156" cy="221" rx="2" ry="1.6" />
        </g>

        {/* ============ ORELHAS triangulares com tufinho ============ */}
        {/* esquerda */}
        <path
          d="M 64 96
             Q 60 50 84 54
             Q 100 70 102 92 Z"
          fill="url(#fur)"
        />
        <path
          d="M 76 86
             Q 76 64 88 64
             Q 96 78 96 90 Z"
          fill="url(#earInner)"
        />
        {/* direita */}
        <path
          d="M 176 96
             Q 180 50 156 54
             Q 140 70 138 92 Z"
          fill="url(#fur)"
        />
        <path
          d="M 164 86
             Q 164 64 152 64
             Q 144 78 144 90 Z"
          fill="url(#earInner)"
        />
        {/* tufinhos de pelo nas orelhas */}
        <g stroke={FUR_LIGHT} strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M 70 80 L 66 72" />
          <path d="M 74 76 L 72 68" />
          <path d="M 170 80 L 174 72" />
          <path d="M 166 76 L 168 68" />
        </g>

        {/* ============ CABEÇA redondinha mochi ============ */}
        <ellipse cx="120" cy="112" rx="66" ry="58" fill="url(#fur)" />

        {/* listrinhas tigradas na testa (M malhado) */}
        <g
          clipPath="url(#headClip)"
          stroke={FUR_DARK}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        >
          <path d="M 110 64 Q 114 72 110 80" />
          <path d="M 120 60 L 120 76" />
          <path d="M 130 64 Q 126 72 130 80" />
          {/* listras laterais */}
          <path d="M 70 100 Q 78 104 72 112" />
          <path d="M 168 100 Q 160 104 166 112" />
        </g>

        {/* bochechinhas peludinhas */}
        <ellipse cx="78" cy="132" rx="18" ry="14" fill={FUR_LIGHT} />
        <ellipse cx="162" cy="132" rx="18" ry="14" fill={FUR_LIGHT} />
        {/* tufos de pelo nas bochechas */}
        <g stroke={FUR_MID} strokeWidth="1.6" strokeLinecap="round" opacity="0.6" fill="none">
          <path d="M 62 134 L 56 132" />
          <path d="M 64 140 L 58 142" />
          <path d="M 178 134 L 184 132" />
          <path d="M 176 140 L 182 142" />
        </g>

        {/* blush rosado */}
        {blush && (
          <>
            <ellipse cx="80" cy="138" rx="11" ry="6.5" fill="url(#cheek)" />
            <ellipse cx="160" cy="138" rx="11" ry="6.5" fill="url(#cheek)" />
          </>
        )}

        {/* ============ OLHOS gigantes kawaii ============ */}
        {eyesClosed ? (
          <>
            {/* olhinhos felizes ^^ */}
            <path
              d="M 88 118 Q 100 108 112 118"
              stroke={INK}
              strokeWidth="3.4"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 128 118 Q 140 108 152 118"
              stroke={INK}
              strokeWidth="3.4"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            {/* olhos enormes redondos */}
            <ellipse cx="100" cy="118" rx="11" ry="14" fill={INK} />
            <ellipse cx="140" cy="118" rx="11" ry="14" fill={INK} />
            {/* iris colorida sutil */}
            <ellipse cx="100" cy="120" rx="8" ry="11" fill="oklch(0.35 0.1 200)" opacity="0.6" />
            <ellipse cx="140" cy="120" rx="8" ry="11" fill="oklch(0.35 0.1 200)" opacity="0.6" />
            {/* pupila vertical de gato */}
            <ellipse cx="100" cy="120" rx="2" ry="10" fill={INK} />
            <ellipse cx="140" cy="120" rx="2" ry="10" fill={INK} />
            {/* shine grande */}
            <ellipse cx="104" cy="112" rx="3.5" ry="4.5" fill="white" />
            <ellipse cx="144" cy="112" rx="3.5" ry="4.5" fill="white" />
            {/* shine pequeno embaixo */}
            <ellipse cx="96" cy="125" rx="1.8" ry="2" fill="white" opacity="0.85" />
            <ellipse cx="136" cy="125" rx="1.8" ry="2" fill="white" opacity="0.85" />
            {/* sobrancelhas tristes */}
            {mood === "sad" && (
              <>
                <path
                  d="M 88 100 Q 100 94 112 100"
                  stroke={INK}
                  strokeWidth="2.6"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M 128 100 Q 140 94 152 100"
                  stroke={INK}
                  strokeWidth="2.6"
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
            cy="134"
            rx="2.6"
            ry="4.4"
            fill="oklch(0.72 0.13 230)"
          />
        )}

        {/* ============ NARIZINHO triangular rosa ============ */}
        <path
          d="M 114 138
             Q 120 138 126 138
             Q 124 144 120 146
             Q 116 144 114 138 Z"
          fill={NOSE}
        />
        <ellipse cx="118" cy="140" rx="1" ry="0.8" fill="white" opacity="0.7" />

        {/* ============ BOQUINHA em w ============ */}
        {mouthOpen ? (
          <>
            <ellipse cx="120" cy="156" rx="8" ry="7" fill="oklch(0.3 0.08 20)" />
            <ellipse cx="120" cy="159" rx="5.5" ry="4.5" fill={TONGUE} />
            {/* dentinhos */}
            <rect x="116" y="150" width="2" height="3" fill="white" rx="0.5" />
            <rect x="122" y="150" width="2" height="3" fill="white" rx="0.5" />
          </>
        ) : mood === "sad" ? (
          <>
            <path
              d="M 120 148 L 120 152"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 110 160 Q 120 152 130 160"
              stroke={INK}
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <path
              d="M 120 148 L 120 152"
              stroke={INK}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 110 152 Q 115 160 120 152"
              stroke={INK}
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M 120 152 Q 125 160 130 152"
              stroke={INK}
              strokeWidth="2.6"
              fill="none"
              strokeLinecap="round"
            />
            {tongueOut && (
              <ellipse cx="120" cy="158" rx="4" ry="3" fill={TONGUE} />
            )}
          </>
        )}

        {/* ============ BIGODES finos ============ */}
        <g stroke={INK} strokeWidth="1.1" strokeLinecap="round" opacity="0.5" fill="none">
          <path d="M 70 144 Q 56 142 44 138" />
          <path d="M 72 150 Q 58 152 46 154" />
          <path d="M 170 144 Q 184 142 196 138" />
          <path d="M 168 150 Q 182 152 194 154" />
        </g>

        {/* ============ COLEIRA rosa com sininho ============ */}
        <path
          d="M 78 178
             Q 120 200 162 178"
          stroke="oklch(0.72 0.18 350)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        {/* sininho dourado */}
        <circle cx="120" cy="198" r="6" fill="oklch(0.85 0.16 80)" />
        <circle cx="120" cy="198" r="2.4" fill="oklch(0.55 0.12 60)" />
        <rect x="118" y="190" width="4" height="3" fill="oklch(0.55 0.12 60)" rx="1" />

        {/* ============ Z DE SONO ============ */}
        {mood === "sleepy" && (
          <text
            x="184"
            y="56"
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
