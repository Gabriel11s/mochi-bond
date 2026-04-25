import { createFileRoute } from "@tanstack/react-router";
import { buildAuthorizeUrl } from "@/lib/spotify-server";

function redirectUriFromRequest(request: Request) {
  const url = new URL(request.url);
  return `${url.origin}/api/spotify/callback`;
}

export const Route = createFileRoute("/api/spotify/login")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const partner = url.searchParams.get("partner") ?? "";
        if (!partner) {
          return new Response("missing partner", { status: 400 });
        }
        // state: leva o partner pra recuperar no callback (assinatura simples)
        const state = Buffer.from(
          JSON.stringify({ partner, t: Date.now() }),
        ).toString("base64url");
        const redirectUri = redirectUriFromRequest(request);
        // Debug: imprime o redirect_uri exato que o Spotify vai validar.
        // Se aparecer "Not matching configuration", essa URL precisa estar
        // cadastrada IDENTICA no Spotify Developer Dashboard.
        console.log("[Spotify login] redirect_uri sendo usado:", redirectUri);
        const authorizeUrl = buildAuthorizeUrl(redirectUri, state);
        return new Response(null, {
          status: 302,
          headers: { Location: authorizeUrl },
        });
      },
    },
  },
});
