import { motion } from "framer-motion";

interface BarProps {
  label: string;
  value: number;
  emoji: string;
  color: string;
}

function Bar({ label, value, emoji, color }: BarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none">{emoji}</span>
          {label}
        </span>
        <span className="tabular-nums text-foreground/70">{Math.round(value)}</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color, boxShadow: `0 0 12px ${color}` }}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
    </div>
  );
}

interface Props {
  hunger: number;
  happiness: number;
  energy: number;
}

export function StatusBars({ hunger, happiness, energy }: Props) {
  return (
    <div className="grid w-full grid-cols-3 gap-4">
      <Bar label="Fome" value={hunger} emoji="🍙" color="var(--accent-cream)" />
      <Bar label="Humor" value={happiness} emoji="💗" color="var(--accent-pink)" />
      <Bar label="Energia" value={energy} emoji="✨" color="var(--accent-mint)" />
    </div>
  );
}
