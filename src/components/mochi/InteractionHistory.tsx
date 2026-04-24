import { motion } from "framer-motion";
import type { Interaction } from "@/lib/mochi-types";
import { timeAgo } from "@/lib/mochi-types";

interface Props {
  interactions: Interaction[];
}

export function InteractionHistory({ interactions }: Props) {
  if (interactions.length === 0) {
    return (
      <div className="glass rounded-2xl p-5 text-center text-sm text-muted-foreground">
        Nenhum cuidadinho ainda. Que tal começar agora?
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Últimos cuidadinhos
      </h3>
      <div className="flex flex-col gap-2">
        {interactions.slice(0, 6).map((it, i) => (
          <motion.div
            key={it.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass flex items-center gap-3 rounded-xl px-4 py-3"
          >
            <div className="text-2xl">{it.food_emoji ?? "💗"}</div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm">
                <span className="font-semibold">{it.partner_name}</span>{" "}
                <span className="text-muted-foreground">
                  {it.interaction_type === "feed"
                    ? `deu ${it.food_name?.toLowerCase()}`
                    : it.interaction_type === "pet"
                    ? "fez carinho"
                    : "brincou um pouco"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">{timeAgo(it.created_at)}</p>
            </div>
            {it.xp_delta > 0 && (
              <span className="rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-foreground/80">
                +{it.xp_delta} xp
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
