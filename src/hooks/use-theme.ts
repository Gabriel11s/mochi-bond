import { useEffect } from "react";

export type Theme = "dark" | "light";

/**
 * Aplica o tema fixo baseado no parceiro:
 * - tita → dark (lua)
 * - gab  → light (sol)
 * Sem toggle: o tema é parte da identidade de cada um.
 */
export function usePartnerTheme(partnerKey: "gab" | "tita" | "outro") {
  const theme: Theme = partnerKey === "gab" ? "light" : "dark";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("light", theme === "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return { theme };
}
