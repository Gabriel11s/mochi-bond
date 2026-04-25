import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CoupleSettings, Mood, PetState } from "@/lib/mochi-types";
import { applyDecay } from "@/lib/mochi-types";
import { Mochi } from "./Mochi";

interface Props {
  onLogin: (partnerName: string) => void;
}

interface MochiPreview {
  skin: string;
  accessory: string;
  mood: Mood;
  hunger: number;
  happiness: number;
  energy: number;
}

export function LoginScreen({ onLogin }: Props) {
  const [settings, setSettings] = useState<CoupleSettings | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Mostra o Mochi exatamente como ele tá agora — skin, acessório e humor
  // (com decay aplicado) — pra que a tela de entrada seja sempre fiel.
  const [preview, setPreview] = useState<MochiPreview | null>(null);

  useEffect(() => {
    supabase
      .from("couple_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (data) setSettings(data as CoupleSettings);
      });

    supabase
      .from("pet_state")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const decayed = applyDecay(data as PetState);
        setPreview({
          skin: decayed.equipped_skin,
          accessory: decayed.equipped_accessory,
          mood: decayed.current_mood as Mood,
          hunger: decayed.hunger,
          happiness: decayed.happiness,
          energy: decayed.energy,
        });
      });
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!picked) {
      setError("Escolha quem é você 💗");
      return;
    }
    onLogin(picked);
  };

  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center"
      >
        <Mochi
          mood={preview?.mood ?? "happy"}
          skinId={preview?.skin}
          accessoryId={preview?.accessory}
          hunger={preview?.hunger}
          happiness={preview?.happiness}
          energy={preview?.energy}
        />
      </motion.div>

      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
        className="glass-strong mt-2 flex w-full max-w-sm flex-col gap-5 rounded-3xl p-7"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight">Pet Room</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Entre no cantinho de vocês
          </p>
        </div>

        {settings && (
          <div className="flex gap-2">
            {[settings.partner_one_name, settings.partner_two_name].map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setPicked(name)}
                className={`flex-1 rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition-all ${
                  picked === name
                    ? "border-pink bg-pink/15 text-foreground"
                    : "border-transparent bg-white/5 text-muted-foreground hover:bg-white/10"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl bg-danger-soft/20 px-3 py-2 text-center text-xs font-medium text-danger-soft"
          >
            {error}
          </motion.p>
        )}

        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-pink to-lilac px-6 py-3.5 font-display text-base font-bold text-white shadow-[var(--shadow-glow)] transition-all hover:brightness-110 active:scale-[0.98]"
        >
          entrar no cantinho
        </button>
      </motion.form>
    </div>
  );
}
