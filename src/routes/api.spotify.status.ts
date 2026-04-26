import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/spotify/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const partner = url.searchParams.get("partner") ?? "";
        if (!partner) {
          return new Response(JSON.stringify({ connected: false }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const { data } = await supabaseAdmin
          .from("spotify_connections")
          .select("partner_name, display_name, spotify_user_id")
          .ilike("partner_name", partner.trim())
          .maybeSingle();

        return new Response(
          JSON.stringify({
            connected: !!data,
            display_name: data?.display_name ?? null,
            spotify_user_id: data?.spotify_user_id ?? null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
      DELETE: async ({ request }) => {
        const url = new URL(request.url);
        const partner = url.searchParams.get("partner") ?? "";
        if (!partner) return new Response("missing partner", { status: 400 });
        await supabaseAdmin
          .from("spotify_connections")
          .delete()
          .ilike("partner_name", partner.trim());
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
