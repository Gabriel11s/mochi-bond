import { createFileRoute } from "@tanstack/react-router";
import {
  exchangeCodeForTokens,
  fetchSpotifyMe,
  saveConnection,
} from "@/lib/spotify-server";

export const Route = createFileRoute("/api/spotify/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const stateRaw = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        const homeRedirect = (qs: string) =>
          new Response(null, {
            status: 302,
            headers: { Location: `/${qs}` },
          });

        if (error) return homeRedirect(`?spotify_error=${encodeURIComponent(error)}`);
        if (!code || !stateRaw) return homeRedirect(`?spotify_error=missing_code`);

        let partner = "";
        try {
          const decoded = JSON.parse(
            Buffer.from(stateRaw, "base64url").toString("utf8"),
          );
          partner = String(decoded?.partner ?? "");
        } catch {
          return homeRedirect(`?spotify_error=bad_state`);
        }
        if (!partner) return homeRedirect(`?spotify_error=no_partner`);

        const redirectUri = `${url.origin}/api/spotify/callback`;
        try {
          const tokens = await exchangeCodeForTokens(code, redirectUri);
          const profile = await fetchSpotifyMe(tokens.access_token);
          await saveConnection(partner, tokens, profile);
        } catch (e) {
          console.error("spotify callback error:", e);
          return homeRedirect(`?spotify_error=exchange_failed`);
        }

        return homeRedirect(`?spotify_connected=1`);
      },
    },
  },
});
