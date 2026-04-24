import { motion, AnimatePresence } from "framer-motion";

interface Props {
  message: string | null;
}

export function MochiSpeechBubble({ message }: Props) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 8, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2"
        >
          <div className="glass-strong relative max-w-[260px] rounded-2xl px-4 py-2 text-center text-[13px] font-medium text-foreground shadow-lg ring-1 ring-inset ring-white/10">
            {message}
            {/* tail */}
            <div className="glass-strong absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45 ring-1 ring-inset ring-white/10" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
