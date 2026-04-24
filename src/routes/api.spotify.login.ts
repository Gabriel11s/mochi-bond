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
        const authorizeUrl = buildAuthorizeUrl(redirectUri, state);
        return new Response(null, {
          status: 302,
          headers: { Location: authorizeUrl },
        });
      },
    },
  },
});
