import { createFileRoute } from "@tanstack/react-router";
import { WordleGame } from "@/components/mochi/WordleGame";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/wordle")({
  head: () => ({
    meta: [
      { title: "Palavra do dia · Pet Room" },
      { name: "description", content: "Caça-palavras diário do casal — joga a palavra do dia ou pratica com palavras aleatórias." },
      { name: "theme-color", content: "#0f0d14" },
    ],
  }),
  component: WordlePage,
});

function WordlePage() {
  const { session, hydrated } = useSession();
  if (!hydrated) return <div className="min-h-[100dvh]" />;
  if (!session) {
    // Acesso direto sem login: redireciona pra home
    if (typeof window !== "undefined") window.location.href = "/";
    return <div className="min-h-[100dvh]" />;
  }
  return <WordleGame partnerName={session.partnerName} />;
}
