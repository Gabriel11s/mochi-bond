import { useEffect, useMemo, useState } from "react";
import { getBackground, type BackgroundId } from "@/lib/mochi-backgrounds";

interface Props {
  backgroundId: BackgroundId;
  /** Nonce que dispara um shimmer rápido na manta do casal (cinema).
   *  Cada incremento = uma reação. */
  reactPulse?: number;
}

/**
 * Cenário de fundo do quartinho. Cada `id` desenha uma cena diferente
 * 100% em SVG/CSS — leve, themável e nunca quebra.
 *
 * Camadas: céu (gradiente) → decorações (SVG) → chão (gradiente) → vinheta.
 */
export function BackgroundScene({ backgroundId, reactPulse = 0 }: Props) {
  const bg = getBackground(backgroundId);

  // pontos aleatórios determinísticos pra estrelas/bolhas/flores etc.
  const dots = useMemo(
    () =>
      Array.from({ length: 40 }).map((_, i) => ({
        x: ((i * 137.508) % 100),
        y: ((i * 53.123) % 100),
        size: 1 + ((i * 7) % 3),
        delay: (i * 0.3) % 4,
      })),
    [backgroundId]
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Céu / parede */}
      <div className="absolute inset-0" style={{ background: bg.sky }} />

      {/* Decorações específicas por cena */}
      <SceneDecorations id={backgroundId} dots={dots} accent={bg.accent} />

      {/* Chão */}
      <div
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{ background: bg.floor }}
      />




      {/* Vinheta sutil */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 50%, oklch(0 0 0 / 0.35) 100%)",
        }}
      />
    </div>
  );
}

/**
 * Casal aconchegado numa poltrona, vistos de costas — pura silhueta.
 * Fica posicionado na parte de baixo central da cena, criando sensação
 * de "estamos juntos vendo o cenário". Renderizado em SVG pra escalar bem.
 */
function CoupleOnCouch({ accent }: { accent: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center"
      aria-hidden
    >
      {/* Halo de luz vindo da tela: borrão colorido no chão usando o accent
          do tema. blend "screen" deixa o brilho se misturar com o gradiente
          do floor em vez de simplesmente sobrepor uma cor opaca. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[42%]"
        style={{
          background: `radial-gradient(ellipse 60% 90% at 50% 100%, ${accent}, transparent 70%)`,
          opacity: 0.35,
          mixBlendMode: "screen",
          filter: "blur(14px)",
        }}
      />

      <svg
        viewBox="0 0 240 160"
        className="relative h-[38%] w-auto max-w-[80%] drop-shadow-[0_-6px_18px_rgba(0,0,0,0.35)]"
        preserveAspectRatio="xMidYEnd meet"
        style={{ filter: "blur(0.4px)" }}
      >
        <defs>
          {/* sombra elíptica embaixo da poltrona — preta no centro, accent
              nas bordas pra parecer que a luz da tela contorna o móvel */}
          <radialGradient id="couch-shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="oklch(0 0 0 / 0.6)" />
            <stop offset="55%" stopColor="oklch(0 0 0 / 0.35)" />
            <stop offset="100%" stopColor="oklch(0 0 0 / 0)" />
          </radialGradient>
          {/* halo colorido que "vaza" pelos lados da poltrona */}
          <radialGradient id="couch-rim" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0" />
            <stop offset="65%" stopColor={accent} stopOpacity="0.55" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* halo colorido (atrás) — bem largo, mistura com o chão */}
        <ellipse cx="120" cy="156" rx="125" ry="9" fill="url(#couch-rim)" style={{ mixBlendMode: "screen" } as React.CSSProperties} />
        {/* sombra escura principal */}
        <ellipse cx="120" cy="155" rx="105" ry="6" fill="url(#couch-shadow)" />

        {/* poltrona — encosto e base */}
        <g fill="oklch(0.08 0.02 290 / 0.92)">
          {/* base da poltrona */}
          <path d="M20 150 L20 110 Q20 96 36 96 L204 96 Q220 96 220 110 L220 150 Z" />
          {/* braço esquerdo */}
          <rect x="14" y="92" width="22" height="58" rx="8" />
          {/* braço direito */}
          <rect x="204" y="92" width="22" height="58" rx="8" />
          {/* almofada do encosto (curva orgânica) */}
          <path d="M36 100 Q60 70 120 72 Q180 70 204 100 L204 116 L36 116 Z" />
        </g>

        {/* manta jogada por cima — cor levemente mais clara pra dar textura */}
        <path
          d="M50 118 Q90 108 120 116 Q160 124 196 116 L200 150 L46 150 Z"
          fill="oklch(0.14 0.03 305 / 0.85)"
        />

        {/* keyframes locais — respiração + balanço bem leve */}
        <style>{`
          @keyframes couch-breathe-left {
            0%, 100% { transform: translateY(0) scaleY(1); }
            50%      { transform: translateY(-0.6px) scaleY(1.012); }
          }
          @keyframes couch-breathe-right {
            0%, 100% { transform: translateY(0) scaleY(1); }
            50%      { transform: translateY(-0.5px) scaleY(1.014); }
          }
          @keyframes couch-sway-left {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(-0.8deg); }
          }
          @keyframes couch-sway-right {
            0%, 100% { transform: rotate(0deg); }
            50%      { transform: rotate(0.6deg); }
          }
        `}</style>

        {/* casal — cada pessoa num <g> com origem própria pra animar */}
        <g fill="oklch(0.04 0.01 290 / 0.95)">
          {/* pessoa da esquerda */}
          <g
            style={{
              transformOrigin: "90px 130px",
              transformBox: "fill-box" as React.CSSProperties["transformBox"],
              animation: "couch-breathe-left 5.2s ease-in-out infinite",
            }}
          >
            {/* cabeça com balanço próprio (origem no pescoço) */}
            <g
              style={{
                transformOrigin: "98px 86px",
                transformBox: "fill-box" as React.CSSProperties["transformBox"],
                animation: "couch-sway-left 6.8s ease-in-out infinite",
              }}
            >
              <ellipse cx="98" cy="62" rx="20" ry="22" />
              <path d="M78 64 Q76 84 86 96 L84 110 L70 108 Q68 88 78 64 Z" />
            </g>
            {/* ombro/torso esquerdo */}
            <path d="M68 110 Q70 92 96 88 L120 88 L120 150 L60 150 Q58 128 68 110 Z" />
          </g>

          {/* pessoa da direita */}
          <g
            style={{
              transformOrigin: "150px 130px",
              transformBox: "fill-box" as React.CSSProperties["transformBox"],
              animation: "couch-breathe-right 4.6s ease-in-out infinite",
            }}
          >
            {/* cabeça da direita encostada na esquerda */}
            <g
              style={{
                transformOrigin: "142px 84px",
                transformBox: "fill-box" as React.CSSProperties["transformBox"],
                animation: "couch-sway-right 7.4s ease-in-out infinite",
              }}
            >
              <ellipse cx="142" cy="58" rx="22" ry="24" />
            </g>
            {/* ombro/torso direito (mais largo) */}
            <path d="M120 88 L150 86 Q176 90 178 112 Q182 132 180 150 L120 150 Z" />
          </g>
        </g>

        {/* rim light no topo das cabeças e ombros, usando o accent —
            simula a luz da tela batendo de frente neles */}
        <ellipse cx="98" cy="46" rx="11" ry="3.5" fill={accent} opacity="0.35" style={{ mixBlendMode: "screen" } as React.CSSProperties} />
        <ellipse cx="142" cy="42" rx="12" ry="4" fill={accent} opacity="0.4" style={{ mixBlendMode: "screen" } as React.CSSProperties} />
        <path
          d="M68 110 Q70 92 96 88 L120 88 L120 96 L70 116 Z"
          fill={accent}
          opacity="0.18"
          style={{ mixBlendMode: "screen" } as React.CSSProperties}
        />
      </svg>
    </div>
  );
}

interface DecoProps {
  id: BackgroundId;
  dots: { x: number; y: number; size: number; delay: number }[];
  accent: string;
}

function SceneDecorations({ id, dots, accent }: DecoProps) {
  switch (id) {
    case "quartinho":
      return (
        <>
          {/* janela com lua */}
          <div className="absolute right-[8%] top-[8%] h-32 w-24 rounded-2xl border-4 border-white/10 bg-gradient-to-b from-indigo-900/40 to-purple-900/40 shadow-inner">
            <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-100/80 blur-[1px] shadow-[0_0_30px_rgba(255,240,180,0.6)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-white/15" />
              <div className="absolute h-px w-full bg-white/15" />
            </div>
          </div>
          {/* quadrinho na parede */}
          <div className="absolute left-[8%] top-[12%] h-16 w-20 rotate-[-4deg] rounded-md border-2 border-yellow-200/30 bg-pink-200/15 p-1">
            <div className="h-full w-full rounded-sm bg-gradient-to-br from-pink-300/40 to-purple-300/40" />
          </div>
          {/* mini estantezinha */}
          <div className="absolute bottom-[35%] left-[5%] flex gap-0.5">
            {["#f9a8d4", "#c4b5fd", "#fde68a", "#a7f3d0"].map((c, i) => (
              <div key={i} className="h-8 w-2 rounded-sm" style={{ background: c, opacity: 0.7 }} />
            ))}
          </div>
        </>
      );

    case "biblioteca":
      return (
        <>
          {/* estantes de livros nas duas laterais */}
          {[0, 1, 2, 3].map((row) => (
            <div
              key={`l${row}`}
              className="absolute left-0 flex w-[18%] gap-0.5 px-1"
              style={{ top: `${10 + row * 18}%`, height: "12%" }}
            >
              {["#b91c1c", "#a16207", "#15803d", "#1e40af", "#7c2d12", "#be185d", "#a16207"].map(
                (c, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ background: c, opacity: 0.55, height: `${70 + ((i * 13) % 30)}%` }}
                  />
                )
              )}
            </div>
          ))}
          {[0, 1, 2, 3].map((row) => (
            <div
              key={`r${row}`}
              className="absolute right-0 flex w-[18%] gap-0.5 px-1"
              style={{ top: `${10 + row * 18}%`, height: "12%" }}
            >
              {["#1e40af", "#7c2d12", "#a16207", "#15803d", "#b91c1c", "#a16207", "#be185d"].map(
                (c, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ background: c, opacity: 0.55, height: `${70 + ((i * 17) % 30)}%` }}
                  />
                )
              )}
            </div>
          ))}
          {/* abajur no centro alto */}
          <div className="absolute left-1/2 top-[6%] -translate-x-1/2">
            <div className="h-2 w-12 rounded-full bg-yellow-200/40 blur-md" />
            <div className="mx-auto mt-1 h-3 w-8 rounded-b-full bg-amber-700/40" />
          </div>
        </>
      );

    case "cinema":
      return (
        <>
          {/* tela do cinema */}
          <div className="absolute left-1/2 top-[8%] h-[28%] w-[70%] -translate-x-1/2 rounded-md border-4 border-zinc-700/60 bg-gradient-to-br from-zinc-100/15 to-zinc-300/5 shadow-[0_0_60px_rgba(255,255,255,0.15)]">
            <div className="absolute inset-2 rounded-sm bg-gradient-to-br from-pink-200/10 via-purple-200/15 to-yellow-200/10" />
          </div>
          {/* casal aconchegado na poltrona — silhueta de costas vendo o filme */}
          <CoupleOnCouch accent={accent} />
          {/* balde de pipoca */}
          <div className="absolute bottom-[12%] right-[10%] h-10 w-8">
            <div className="h-2 w-full rounded-full bg-yellow-100" />
            <div className="h-full w-full bg-gradient-to-b from-red-500 to-red-700"
              style={{ clipPath: "polygon(15% 0, 85% 0, 95% 100%, 5% 100%)" }}
            />
          </div>
        </>
      );

    case "cafe":
      return (
        <>
          {/* luzinhas penduradas */}
          <svg className="absolute inset-x-0 top-0 h-[15%] w-full" preserveAspectRatio="none" viewBox="0 0 100 20">
            <path d="M0 5 Q 25 15, 50 5 T 100 5" stroke={accent} strokeWidth="0.3" fill="none" opacity="0.4" />
            {[10, 25, 40, 55, 70, 85].map((x, i) => (
              <circle key={i} cx={x} cy={6 + Math.sin(i) * 2} r="0.8" fill={accent} opacity="0.9">
                <animate attributeName="opacity" values="0.5;1;0.5" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
              </circle>
            ))}
          </svg>
          {/* xícaras na prateleira */}
          <div className="absolute left-[6%] top-[25%] flex gap-2">
            {["#fde68a", "#f9a8d4", "#a7f3d0"].map((c, i) => (
              <div key={i} className="h-6 w-5 rounded-b-md border-2 border-white/30" style={{ background: c, opacity: 0.7 }} />
            ))}
          </div>
          {/* vapor subindo */}
          <div className="absolute bottom-[35%] right-[15%]">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 w-1 rounded-full bg-white/30 blur-[2px]"
                style={{ animation: `float-up ${3 + i}s ease-in-out infinite`, animationDelay: `${i * 0.7}s`, marginLeft: i * 4 }}
              />
            ))}
          </div>
        </>
      );

    case "jardim":
      return (
        <>
          {/* nuvens fofas */}
          {[
            { x: 15, y: 12, s: 1 },
            { x: 65, y: 18, s: 1.2 },
            { x: 40, y: 8, s: 0.8 },
          ].map((c, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/70 blur-sm"
              style={{
                left: `${c.x}%`,
                top: `${c.y}%`,
                width: `${60 * c.s}px`,
                height: `${22 * c.s}px`,
              }}
            />
          ))}
          {/* flores no chão */}
          {dots.slice(0, 14).map((d, i) => (
            <div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${d.x}%`,
                bottom: `${5 + (d.y % 25)}%`,
                opacity: 0.85,
                animation: `shimmer ${3 + d.delay}s ease-in-out infinite`,
              }}
            >
              {["🌸", "🌷", "🌼", "🌺"][i % 4]}
            </div>
          ))}
          {/* borboleta */}
          <div className="absolute right-[20%] top-[30%] text-3xl" style={{ animation: "float-up 6s ease-in-out infinite" }}>
            🦋
          </div>
        </>
      );

    case "praia":
      return (
        <>
          {/* sol */}
          <div
            className="absolute left-1/2 top-[18%] h-24 w-24 -translate-x-1/2 rounded-full"
            style={{
              background: "radial-gradient(circle, oklch(0.95 0.18 80) 0%, oklch(0.85 0.2 50) 70%, transparent 100%)",
              boxShadow: "0 0 80px oklch(0.85 0.18 60 / 0.6)",
            }}
          />
          {/* reflexo do sol no mar */}
          <div className="absolute inset-x-0 top-[38%] h-2 bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent blur-sm" />
          {/* palmeira */}
          <div className="absolute bottom-[18%] right-[8%] text-7xl">🌴</div>
          <div className="absolute bottom-[15%] left-[10%] text-4xl">🐚</div>
        </>
      );

    case "espaco":
      return (
        <>
          {/* estrelas */}
          {dots.map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${d.x}%`,
                top: `${d.y * 0.7}%`,
                width: `${d.size}px`,
                height: `${d.size}px`,
                opacity: 0.9,
                animation: `shimmer ${2 + d.delay}s ease-in-out infinite`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
          {/* planeta */}
          <div
            className="absolute right-[10%] top-[15%] h-20 w-20 rounded-full"
            style={{
              background: "radial-gradient(circle at 30% 30%, oklch(0.78 0.18 30), oklch(0.45 0.2 25))",
              boxShadow: "0 0 40px oklch(0.7 0.18 30 / 0.5)",
            }}
          />
          {/* anel */}
          <div
            className="absolute right-[5%] top-[20%] h-3 w-32 rotate-[-15deg] rounded-full border-2 border-yellow-200/40"
          />
          {/* lua pequena */}
          <div className="absolute left-[12%] top-[35%] h-8 w-8 rounded-full bg-zinc-300/80 shadow-[0_0_20px_rgba(255,255,255,0.4)]" />
        </>
      );

    case "floresta":
      return (
        <>
          {/* pinheiros silhueta */}
          {[5, 18, 32, 50, 68, 82, 95].map((x, i) => (
            <div
              key={i}
              className="absolute bottom-[25%]"
              style={{ left: `${x}%`, transform: `translateX(-50%) scale(${0.8 + (i % 3) * 0.3})` }}
            >
              <div
                className="h-32 w-12"
                style={{
                  background: "oklch(0.25 0.1 145)",
                  clipPath: "polygon(50% 0, 100% 100%, 0 100%)",
                  opacity: 0.85,
                }}
              />
            </div>
          ))}
          {/* raios de sol */}
          <div
            className="absolute left-[20%] top-0 h-[60%] w-32 rotate-[15deg] bg-gradient-to-b from-yellow-200/40 to-transparent blur-md"
          />
          {/* cogumelinho */}
          <div className="absolute bottom-[15%] left-[15%] text-3xl">🍄</div>
        </>
      );

    case "cozinha":
      return (
        <>
          {/* azulejos quadriculados */}
          <div
            className="absolute inset-x-0 bottom-0 h-[45%] opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(oklch(0.5 0.05 30 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0.05 30 / 0.3) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          {/* potinhos na prateleira */}
          <div className="absolute left-[10%] top-[20%] flex gap-2">
            {["🍯", "🧂", "🌶️", "🫙"].map((e, i) => (
              <div key={i} className="text-2xl">{e}</div>
            ))}
          </div>
          {/* panela pendurada */}
          <div className="absolute right-[12%] top-[15%] text-3xl rotate-12">🍳</div>
          <div className="absolute right-[25%] top-[18%] text-2xl">🥄</div>
        </>
      );

    case "loja-doces":
      return (
        <>
          {/* prateleiras de doces */}
          {[20, 35, 50].map((y, row) => (
            <div
              key={row}
              className="absolute inset-x-[8%] flex justify-around"
              style={{ top: `${y}%` }}
            >
              {["🍭", "🍬", "🍫", "🧁", "🍩", "🍪"]
                .slice(row * 2, row * 2 + 5)
                .concat(["🍭", "🍬"])
                .slice(0, 5)
                .map((e, i) => (
                  <div key={i} className="text-3xl">{e}</div>
                ))}
            </div>
          ))}
          {/* listras pastel sutis no fundo */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0 20px, oklch(0.95 0.1 350 / 0.5) 20px 22px)",
            }}
          />
        </>
      );

    case "ateliê":
      return (
        <>
          {/* cavalete com tela */}
          <div className="absolute right-[8%] top-[18%] flex flex-col items-center">
            <div className="h-24 w-20 rounded-sm border-4 border-amber-800/60 bg-white/80">
              <div className="m-1 h-full w-[calc(100%-8px)] bg-gradient-to-br from-pink-300 via-yellow-200 to-blue-300" />
            </div>
            <div className="mt-1 h-16 w-1 bg-amber-800/70" style={{ transform: "rotate(8deg)" }} />
          </div>
          {/* potes de tinta */}
          <div className="absolute bottom-[30%] left-[8%] flex gap-1.5">
            {["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7"].map((c, i) => (
              <div
                key={i}
                className="h-6 w-5 rounded-b-md"
                style={{ background: c, opacity: 0.85, boxShadow: `0 -2px 0 ${c}` }}
              />
            ))}
          </div>
          {/* respingos */}
          {dots.slice(0, 8).map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: `${4 + d.size * 2}px`,
                height: `${4 + d.size * 2}px`,
                background: ["#ef4444", "#3b82f6", "#eab308", "#22c55e", "#a855f7"][i % 5],
                opacity: 0.4,
              }}
            />
          ))}
        </>
      );

    case "trem-noite":
      return (
        <>
          {/* moldura da janela */}
          <div className="absolute inset-x-[5%] top-[5%] bottom-[35%] rounded-2xl border-[6px] border-zinc-800/80 bg-gradient-to-b from-indigo-950/40 to-purple-900/30 shadow-inner" />
          {/* luzes da cidade passando */}
          {dots.slice(0, 25).map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                left: `${10 + (d.x * 0.8)}%`,
                top: `${15 + (d.y * 0.4)}%`,
                width: `${1 + (i % 3)}px`,
                height: `${1 + (i % 3)}px`,
                background: i % 3 === 0 ? "oklch(0.92 0.16 80)" : "oklch(0.85 0.14 30)",
                opacity: 0.8,
                animation: `shimmer ${1.5 + d.delay}s ease-in-out infinite`,
              }}
            />
          ))}
          {/* silhueta de prédios */}
          <div className="absolute inset-x-[7%] bottom-[37%] flex items-end gap-1">
            {[40, 60, 35, 70, 50, 45, 65, 38, 55].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-zinc-900/80"
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
          {/* trilhos */}
          <div className="absolute inset-x-0 bottom-[12%] h-1 bg-zinc-700/60" />
          <div className="absolute inset-x-0 bottom-[8%] h-1 bg-zinc-700/40" />
        </>
      );

    case "ski":
      return (
        <>
          {/* montanhas */}
          <div className="absolute inset-x-0 bottom-[30%] flex items-end justify-center">
            <div
              className="h-40 w-64"
              style={{
                background: "linear-gradient(180deg, oklch(0.85 0.04 240), oklch(0.62 0.06 240))",
                clipPath: "polygon(0 100%, 30% 30%, 50% 60%, 70% 10%, 100% 100%)",
              }}
            />
          </div>
          {/* topo nevado */}
          <div className="absolute inset-x-0 bottom-[55%] flex items-end justify-center">
            <div
              className="h-12 w-64"
              style={{
                background: "white",
                clipPath: "polygon(28% 100%, 32% 60%, 35% 80%, 50% 90%, 68% 30%, 72% 60%, 70% 100%)",
                opacity: 0.9,
              }}
            />
          </div>
          {/* neve caindo */}
          {dots.slice(0, 30).map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                left: `${d.x}%`,
                top: `${d.y}%`,
                width: `${d.size + 1}px`,
                height: `${d.size + 1}px`,
                opacity: 0.85,
                animation: `float-up ${5 + d.delay}s linear infinite reverse`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
          {/* cabaninha */}
          <div className="absolute bottom-[30%] right-[10%] text-5xl">🏠</div>
          <div className="absolute bottom-[28%] left-[15%] text-3xl">⛷️</div>
        </>
      );

    case "aquario":
      return (
        <>
          {/* raios de luz vindos de cima */}
          {[20, 40, 60, 80].map((x, i) => (
            <div
              key={i}
              className="absolute top-0 w-12 origin-top blur-md"
              style={{
                left: `${x}%`,
                height: "60%",
                background: "linear-gradient(180deg, rgba(255,255,255,0.25), transparent)",
                transform: `translateX(-50%) skewX(${(i % 2 === 0 ? -8 : 8)}deg)`,
              }}
            />
          ))}
          {/* bolhas */}
          {dots.slice(0, 20).map((d, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/40 bg-white/10"
              style={{
                left: `${d.x}%`,
                bottom: `${(d.y % 60)}%`,
                width: `${4 + d.size * 2}px`,
                height: `${4 + d.size * 2}px`,
                animation: `float-up ${4 + d.delay}s ease-in infinite`,
                animationDelay: `${d.delay}s`,
              }}
            />
          ))}
          {/* peixinhos */}
          <div className="absolute right-[15%] top-[40%] text-3xl">🐠</div>
          <div className="absolute left-[20%] top-[55%] text-2xl">🐟</div>
          <div className="absolute right-[30%] top-[60%] text-2xl">🐡</div>
          {/* coral / planta */}
          <div className="absolute bottom-[10%] left-[8%] text-4xl">🪸</div>
          <div className="absolute bottom-[8%] right-[20%] text-3xl">🌿</div>
        </>
      );
  }
}
