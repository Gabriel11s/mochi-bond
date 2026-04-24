// ============= Mochi visual theme =============
// "cute"    → versão kawaii inicial (gatinho mochi tigrado, sininho)
// "premium" → versão atual (acabamento artesanal, gradientes ricos)

export type MochiTheme = "cute" | "premium";

export const DEFAULT_MOCHI_THEME: MochiTheme = "cute";

const KEY = "mochi-theme-v1";

export function loadMochiTheme(): MochiTheme {
  if (typeof window === "undefined") return DEFAULT_MOCHI_THEME;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "cute" || raw === "premium") return raw;
    return DEFAULT_MOCHI_THEME;
  } catch {
    return DEFAULT_MOCHI_THEME;
  }
}

export function saveMochiTheme(t: MochiTheme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, t);
  } catch {
    // ignore
  }
}
