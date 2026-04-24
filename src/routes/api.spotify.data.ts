import { createFileRoute } from "@tanstack/react-router";
import {
  fetchArtists,
  fetchAudioFeatures,
  fetchNowPlaying,
  fetchTopTracks,
  getValidAccessToken,
} from "@/lib/spotify-server";
import type {
  NowPlayingResponse,
  SpotifyTrackLite,
  TopTracksResponse,
} from "@/lib/spotify-types";

function mapTrack(item: {
  id: string;
  name: string;
  external_urls: { spotify?: string };
  artists: Array<{ id: string; name: string }>;
  album: {
    name: string;
    images: Array<{ url: string; width?: number; height?: number }>;
  };
  duration_ms?: number;
}): SpotifyTrackLite {
  return {
    id: item.id,
    name: item.name,
    artists: item.artists.map((a) => ({ id: a.id, name: a.name })),
    album: {
      name: item.album.name,
      images: item.album.images.map((i) => ({
        url: i.url,
        width: i.width ?? null,
        height: i.height ?? null,
      })),
    },
    external_url: item.external_urls?.spotify ?? null,
    duration_ms: item.duration_ms,
  };
}

export const Route = createFileRoute("/api/spotify/data")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const partner = url.searchParams.get("partner") ?? "";
        const kind = url.searchParams.get("kind") ?? "now"; // "now" | "top"
        if (!partner) {
          return new Response(
            JSON.stringify({ error: "missing partner" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        let token;
        try {
          token = await getValidAccessToken(partner);
        } catch (e) {
          console.error("spotify token error:", e);
          return new Response(
            JSON.stringify({ error: "token_error" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }
        if (!token) {
          return new Response(
            JSON.stringify({ error: "not_connected" }),
            { status: 401, headers: { "Content-Type": "application/json" } },
          );
        }

        try {
          if (kind === "top") {
            const top = await fetchTopTracks(token.access_token);
            const body: TopTracksResponse = {
              items: (top?.items ?? []).map(mapTrack),
            };
            return new Response(JSON.stringify(body), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // now playing
          const now = await fetchNowPlaying(token.access_token);
          let body: NowPlayingResponse;
          if (!now || !now.item) {
            body = {
              is_playing: false,
              progress_ms: null,
              track: null,
              features: null,
              genres: [],
              artist_popularity: null,
            };
          } else {
            const track = mapTrack(now.item);

            // 1) audio-features (pode falhar com 403; tratamos como null)
            let features: NowPlayingResponse["features"] = null;
            try {
              const f = await fetchAudioFeatures(token.access_token, track.id);
              if (f) {
                features = {
                  energy: f.energy ?? null,
                  valence: f.valence ?? null,
                  danceability: f.danceability ?? null,
                  tempo: f.tempo ?? null,
                };
              }
            } catch (e) {
              console.warn("audio-features falhou:", e);
            }

            // 2) gêneros + popularidade dos artistas — fonte primária da vibe
            //    quando audio-features está bloqueado.
            let genres: string[] = [];
            let artist_popularity: number | null = null;
            try {
              const artistIds = now.item.artists.map((a) => a.id).filter(Boolean);
              const data = await fetchArtists(token.access_token, artistIds);
              if (data?.artists?.length) {
                const set = new Set<string>();
                let popSum = 0;
                let popCount = 0;
                for (const a of data.artists) {
                  for (const g of a.genres ?? []) set.add(g.toLowerCase());
                  if (typeof a.popularity === "number") {
                    popSum += a.popularity;
                    popCount += 1;
                  }
                  const tArtist = track.artists.find((x) => x.id === a.id);
                  if (tArtist) {
                    tArtist.genres = a.genres ?? [];
                    tArtist.popularity = a.popularity ?? null;
                  }
                }
                genres = Array.from(set);
                artist_popularity = popCount > 0 ? Math.round(popSum / popCount) : null;
              }
            } catch (e) {
              console.warn("artists fetch falhou:", e);
            }

            body = {
              is_playing: now.is_playing,
              progress_ms: now.progress_ms,
              track,
              features,
              genres,
              artist_popularity,
            };
          }
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("spotify data error:", e);
          return new Response(
            JSON.stringify({ error: "fetch_failed" }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
