// Feature #1: Konami Code Easter Egg
// ↑↑↓↓←→←→ — em teclado ou swipe no mobile
import { useEffect, useRef, useCallback } from "react";

const KONAMI_KEYS = [
  "ArrowUp", "ArrowUp",
  "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight",
  "ArrowLeft", "ArrowRight",
];

// Converte swipe direction pra tecla equivalente
function swipeToKey(dx: number, dy: number): string | null {
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 30 && absDy < 30) return null;
  if (absDy > absDx) return dy < 0 ? "ArrowUp" : "ArrowDown";
  return dx < 0 ? "ArrowLeft" : "ArrowRight";
}

export function useKonamiCode(onActivate: () => void) {
  const seqRef = useRef<string[]>([]);
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  const activatedRef = useRef(false);

  const check = useCallback((key: string) => {
    if (activatedRef.current) return;
    seqRef.current.push(key);
    // Mantém só os últimos N (tamanho do código)
    if (seqRef.current.length > KONAMI_KEYS.length) {
      seqRef.current = seqRef.current.slice(-KONAMI_KEYS.length);
    }
    // Confere se bate
    if (
      seqRef.current.length === KONAMI_KEYS.length &&
      seqRef.current.every((k, i) => k === KONAMI_KEYS[i])
    ) {
      activatedRef.current = true;
      onActivate();
    }
  }, [onActivate]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (KONAMI_KEYS.includes(e.key)) check(e.key);
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchRef.current = { x: t.clientX, y: t.clientY };
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchRef.current.x;
      const dy = t.clientY - touchRef.current.y;
      const key = swipeToKey(dx, dy);
      if (key) check(key);
      touchRef.current = null;
    };

    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [check]);
}
