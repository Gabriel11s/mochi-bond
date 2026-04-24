import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { SKINS, ACCESSORIES } from "@/lib/mochi-cosmetics";
import { Mochi } from "./Mochi";

interface Props {
  open: boolean;
  onClose: () => void;
  currentSkin: string;
  currentAccessory: string;
  onSave: (skin: string, accessory: string) => void | Promise<void>;
}

export function WardrobeDrawer({ open, onClose, currentSkin, currentAccessory, onSave }: Props) {
  const [tab, setTab] = useState<"skin" | "acc">("skin");
  const [skin, setSkin] = useState(currentSkin);
  const [acc, setAcc] = useState(currentAccessory);

  const dirty = skin !== currentSkin || acc !== currentAccessory;

  const handleSave = async () => {
    await onSave(skin, acc);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
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
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
          >
            <div className="flex justify-center pt-3">
              <div className="h-1.5 w-12 rounded-full bg-white/20" />
            </div>

            <div className="flex items-center gap-4 px-6 pt-3 pb-1">
              {/* compact preview */}
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-white/5">
                <div className="absolute inset-0 flex items-center justify-center" style={{ transform: "scale(0.28)", transformOrigin: "center" }}>
                  <Mochi mood="happy" skinId={skin} accessoryId={acc} />
                </div>
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
                  className={`flex-1 rounded-full py-2 text-sm font-display font-semibold transition-all ${
                    tab === "skin" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                  }`}
                >
                  🎨 cores
                </button>
                <button
                  onClick={() => setTab("acc")}
                  className={`flex-1 rounded-full py-2 text-sm font-display font-semibold transition-all ${
                    tab === "acc" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground"
                  }`}
                >
                  🎀 acessórios
                </button>
              </div>

              <div className="grid max-h-[35vh] grid-cols-3 gap-3 overflow-y-auto px-6 pb-4 pt-4 sm:grid-cols-4">
                {tab === "skin"
                  ? SKINS.map((s) => (
                      <motion.button
                        key={s.id}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setSkin(s.id)}
                        className={`glass flex flex-col items-center gap-1.5 rounded-2xl p-3 ring-2 ring-inset transition-all ${
                          skin === s.id ? "ring-pink" : "ring-transparent"
                        }`}
                      >
                        <span
                          className="h-10 w-10 rounded-full border-2 border-white/20 shadow-inner"
                          style={{
                            background: `radial-gradient(circle at 35% 30%, ${s.body}, ${s.bodyMid} 60%, ${s.bodyEdge})`,
                          }}
                        />
                        <span className="text-xs font-display font-semibold">{s.label}</span>
                      </motion.button>
                    ))
                  : ACCESSORIES.map((a) => (
                      <motion.button
                        key={a.id}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAcc(a.id)}
                        className={`glass flex flex-col items-center gap-1 rounded-2xl p-3 ring-2 ring-inset transition-all ${
                          acc === a.id ? "ring-pink" : "ring-transparent"
                        }`}
                      >
                        <span className="text-3xl">{a.emoji}</span>
                        <span className="text-xs font-display font-semibold">{a.label}</span>
                      </motion.button>
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
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
