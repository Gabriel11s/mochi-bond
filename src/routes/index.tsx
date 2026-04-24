import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "@/hooks/use-session";
import { LoginScreen } from "@/components/mochi/LoginScreen";
import { PetRoom } from "@/components/mochi/PetRoom";
import { AmbientStars } from "@/components/mochi/AmbientStars";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mochi Room — o cantinho de vocês" },
      {
        name: "description",
        content:
          "Um cantinho digital privado para duas pessoas cuidarem de um bichinho fofo, juntas.",
      },
      { property: "og:title", content: "Mochi Room" },
      {
        property: "og:description",
        content:
          "Um cantinho digital privado para duas pessoas cuidarem de um bichinho fofo, juntas.",
      },
      { name: "theme-color", content: "#0f0d14" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, hydrated, login, logout } = useSession();

  if (!hydrated) {
    return <div className="min-h-[100dvh]" />;
  }

  return (
    <>
      <AmbientStars />
      {session ? (
        <PetRoom partnerName={session.partnerName} onLogout={logout} />
      ) : (
        <LoginScreen onLogin={login} />
      )}
    </>
  );
}
