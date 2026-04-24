import type { Mood } from "@/lib/mochi-types";
import type { Outfit } from "@/lib/mochi-outfit";
import type { MochiTheme } from "@/lib/mochi-theme";
import { MochiCute } from "./MochiCute";
import { MochiPremium } from "./MochiPremium";

interface Props {
  mood: Mood;
  eating?: boolean;
  bouncing?: boolean;
  outfit?: Outfit;
  theme?: MochiTheme;
}

/**
 * Mochi — wrapper que alterna em tempo real entre as duas estéticas:
 *  - "cute"    → bichinho fofo inicial (kawaii, tigrado, sininho)
 *  - "premium" → acabamento artesanal (gradientes ricos, sombra macia)
 *
 * Cada variante mantém a sua própria cadeia de hooks de animação isolada,
 * portanto a troca não quebra splines/loops em andamento — o React simplesmente
 * desmonta uma e monta a outra com seus próprios MotionValues.
 */
export function Mochi({
  mood,
  eating,
  bouncing,
  outfit,
  theme = "cute",
}: Props) {
  if (theme === "premium") {
    return (
      <MochiPremium
        mood={mood}
        eating={eating}
        bouncing={bouncing}
        outfit={outfit}
      />
    );
  }
  return (
    <MochiCute
      mood={mood}
      eating={eating}
      bouncing={bouncing}
      outfit={outfit}
    />
  );
}
