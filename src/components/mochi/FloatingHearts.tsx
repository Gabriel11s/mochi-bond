import { AnimatePresence, motion } from "framer-motion";

interface Props {
  particles: { id: number; emoji: string; x: number }[];
}

export function FloatingHearts({ particles }: Props) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-1/3 z-20 flex justify-center">
      <div className="relative h-1 w-72">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -120, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeOut" }}
              className="absolute text-3xl"
              style={{ left: `${p.x}%` }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
