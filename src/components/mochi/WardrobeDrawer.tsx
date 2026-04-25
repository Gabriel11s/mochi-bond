import { motion, AnimatePresence } from "framer-motion";
import { memo, useState } from "react";
import {
  SKINS,
  ACCESSORIES,
  parseAccessoryIds,
  serializeAccessoryIds,
  toggleAccessory,
  getAccessory,
  type Skin,
  type Accessory,
} from "@/lib/mochi-cosmetics";

interface Props {
  open: boolean;
  onClose: () => void;
  currentSkin: string;
  currentAccessory: string;
  onSave: (skin: string, accessory: string) => void | Promise<void>;
}

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
      className={`glass relative flex flex-col items-center gap-1 rounded-2xl p-3 ring-2 ring-inset transition-transform active:scale-95 ${
        selected ? "ring-pink" : "ring-transparent"
      }`}
    >
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-pink text-[10px] font-bold text-white shadow">
          ✓
        </span>
      )}
      <span className="text-3xl">{acc.emoji}</span>
      <span className="text-xs font-display font-semibold">{acc.label}</span>
    </button>
  );
});

const SLOT_LABELS: Record<string, string> = {
  hat: "🎩 cabeça",
  glasses: "🤓 óculos",
  face: "👨 rosto",
  neck: "🧣 pescoço",
  body: "👔 corpo",
};

function WardrobeContent({
  currentSkin,
  currentAccessory,
  onClose,
  onSave,
}: Omit<Props, "open">) {
  const [tab, setTab] = useState<"skin" | "acc">("skin");
  const [skin, setSkin] = useState(currentSkin);
  // múltiplos acessórios — salvo como string "tophat,sunglasses"
  const [accIds, setAccIds] = useState<string[]>(() => parseAccessoryIds(currentAccessory));

  const dirty =
    skin !== currentSkin || serializeAccessoryIds(accIds) !== (currentAccessory || "none");
  const previewSkin = SKINS.find((s) => s.id === skin) ?? SKINS[0];

  const handleSave = async () => {
    await onSave(skin, serializeAccessoryIds(accIds));
    onClose();
  };

  const pickAcc = (id: string) => {
    if (id === "none") {
      setAccIds([]);
      return;
    }
    setAccIds((prev) => toggleAccessory(prev, id));
  };

  // Acessórios agrupados por slot pra deixar claro a regra (1 por slot)
  const grouped = ACCESSORIES.reduce<Record<string, Accessory[]>>((map, a) => {
    if (a.id === "none") return map;
    (map[a.slot] ||= []).push(a);
    return map;
  }, {});

  return (
    <>
      <div className="flex justify-center pt-3">
        <div className="h-1.5 w-12 rounded-full bg-white/20" />
      </div>

      <div className="flex items-center gap-4 px-6 pt-3 pb-1">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5">
          <span
            className="absolute inset-2 rounded-full border-2 border-white/15 shadow-inner"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${previewSkin.body}, ${previewSkin.bodyMid} 60%, ${previewSkin.bodyEdge})`,
            }}
          />
          {/* Stack até 3 emojis dos acessórios escolhidos no canto */}
          <div className="absolute right-0.5 top-0.5 flex flex-col gap-0.5 items-end">
            {accIds.slice(0, 3).map((id) => (
              <span key={id} className="text-lg drop-shadow leading-none">
                {getAccessory(id).emoji}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl font-bold leading-tight">Guarda-roupa</h3>
          <p className="text-xs text-muted-foreground">
            {tab === "acc"
              ? "toca pra equipar; 1 item por categoria"
              : "Deixa ele do jeitinho de vocês"}
          </p>
        </div>
      </div>

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
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-3 pt-3"
        style={{ contain: "layout paint", WebkitOverflowScrolling: "touch" }}
      >
        {tab === "skin" ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {SKINS.map((s) => (
              <SkinButton key={s.id} skin={s} selected={skin === s.id} onPick={setSkin} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* botão "tirar tudo" */}
            <button
              type="button"
              onClick={() => setAccIds([])}
              disabled={accIds.length === 0}
              className="glass w-full rounded-2xl py-2.5 font-display text-xs font-semibold transition-transform active:scale-95 disabled:opacity-40"
            >
              ✨ tirar tudo
            </button>
            {Object.entries(grouped).map(([slot, items]) => (
              <div key={slot}>
                <h4 className="mb-2 px-1 font-display text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {SLOT_LABELS[slot] ?? slot}
                </h4>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {items.map((a) => (
                    <AccessoryButton
                      key={a.id}
                      acc={a}
                      selected={accIds.includes(a.id)}
                      onPick={pickAcc}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
