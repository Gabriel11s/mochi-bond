import { motion, AnimatePresence } from "framer-motion";
import { memo, useState } from "react";
import { SKINS, ACCESSORIES, type Skin, type Accessory } from "@/lib/mochi-cosmetics";

interface Props {
  open: boolean;
  onClose: () => void;
  currentSkin: string;
  currentAccessory: string;
  onSave: (skin: string, accessory: string) => void | Promise<void>;
}

// Botões puros (sem framer-motion) — escolhas de roupa renderizam 30+ itens,
// cada motion.button custa caro no mobile. CSS active:scale dá o mesmo feedback.
const SkinButton = memo(function SkinButton({
  skin,
  selected,
  onPick,
}: {
  skin: Skin;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(skin.id)}
      className={`glass flex flex-col items-center gap-1.5 rounded-2xl p-3 ring-2 ring-inset transition-transform active:scale-95 ${
        selected ? "ring-pink" : "ring-transparent"
      }`}
    >
      <span
        className="h-10 w-10 rounded-full border-2 border-white/20 shadow-inner"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${skin.body}, ${skin.bodyMid} 60%, ${skin.bodyEdge})`,
        }}
      />
      <span className="text-xs font-display font-semibold">{skin.label}</span>
    </button>
  );
});

const AccessoryButton = memo(function AccessoryButton({
  acc,
  selected,
  onPick,
}: {
  acc: Accessory;
  selected: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(acc.id)}
      className={`glass flex flex-col items-center gap-1 rounded-2xl p-3 ring-2 ring-inset transition-transform active:scale-95 ${
        selected ? "ring-pink" : "ring-transparent"
      }`}
    >
      <span className="text-3xl">{acc.emoji}</span>
      <span className="text-xs font-display font-semibold">{acc.label}</span>
    </button>
  );
});

function WardrobeContent({
  currentSkin,
  currentAccessory,
  onClose,
  onSave,
}: Omit<Props, "open">) {
  const [tab, setTab] = useState<"skin" | "acc">("skin");
  const [skin, setSkin] = useState(currentSkin);
  const [acc, setAcc] = useState(currentAccessory);

  const dirty = skin !== currentSkin || acc !== currentAccessory;
  const previewSkin = SKINS.find((s) => s.id === skin) ?? SKINS[0];
  const previewAcc = ACCESSORIES.find((a) => a.id === acc) ?? ACCESSORIES[0];

  const handleSave = async () => {
    await onSave(skin, acc);
    onClose();
  };

  return (
    <>
      <div className="flex justify-center pt-3">
        <div className="h-1.5 w-12 rounded-full bg-white/20" />
      </div>

      <div className="flex items-center gap-4 px-6 pt-3 pb-1">
        {/* preview leve: só uma bolinha grande com a cor da skin + emoji do acessório
            (renderizar o Mochi SVG inteiro travava demais a cada troca) */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5">
          <span
            className="absolute inset-2 rounded-full border-2 border-white/15 shadow-inner"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${previewSkin.body}, ${previewSkin.bodyMid} 60%, ${previewSkin.bodyEdge})`,
            }}
          />
          {previewAcc.id !== "none" && (
            <span className="absolute right-0.5 top-0.5 text-2xl drop-shadow">
              {previewAcc.emoji}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold leading-tight">Guarda-roupa</h3>
          <p className="text-xs text-muted-foreground">Deixa ele do jeitinho de vocês</p>
        </div>
      </div>

      {/* tabs */}
      <div className="mx-6 mt-2 flex rounded-full bg-white/5 p-1">
        <button
          onClick={() => setTab("skin")}
          className={`flex-1 rounded-full py-2 text-sm font-display font-semibold transition-colors ${
            tab === "skin" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
          }`}
        >
          🎨 cores
        </button>
        <button
          onClick={() => setTab("acc")}
          className={`flex-1 rounded-full py-2 text-sm font-display font-semibold transition-colors ${
            tab === "acc" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
          }`}
        >
          🎀 acessórios
        </button>
      </div>

      <div
        className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-y-auto px-6 pb-3 pt-3 sm:grid-cols-4"
        style={{ contain: "layout paint", WebkitOverflowScrolling: "touch" }}
      >
        {tab === "skin"
          ? SKINS.map((s) => (
              <SkinButton key={s.id} skin={s} selected={skin === s.id} onPick={setSkin} />
            ))
          : ACCESSORIES.map((a) => (
              <AccessoryButton key={a.id} acc={a} selected={acc === a.id} onPick={setAcc} />
            ))}
      </div>

      <div className="flex gap-3 px-6 pb-6 pt-2">
        <button
          onClick={onClose}
          className="glass flex-1 rounded-2xl py-3 font-display text-sm font-semibold"
        >
          cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!dirty}
          className="flex-1 rounded-2xl bg-gradient-to-r from-pink to-lilac py-3 font-display text-sm font-bold text-white shadow-[var(--shadow-glow)] disabled:opacity-40"
        >
          salvar lookzinho
        </button>
      </div>
    </>
  );
}

export function WardrobeDrawer({ open, onClose, currentSkin, currentAccessory, onSave }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="glass-strong fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col overflow-hidden rounded-t-3xl pb-safe"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 240, damping: 30 }}
            style={{ willChange: "transform" }}
          >
            {/* só monta o conteúdo quando aberto — evita pesar a tree */}
            <WardrobeContent
              currentSkin={currentSkin}
              currentAccessory={currentAccessory}
              onClose={onClose}
              onSave={onSave}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
