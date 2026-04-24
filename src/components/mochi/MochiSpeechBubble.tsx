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
          <div className="relative max-w-[260px] rounded-2xl bg-white/95 px-4 py-2 text-center text-[13px] font-medium text-zinc-800 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.4)] dark:bg-white/90">
            {message}
            {/* tail */}
            <div className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45 bg-white/95 dark:bg-white/90" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
