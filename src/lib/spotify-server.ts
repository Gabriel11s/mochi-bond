// Helpers do Spotify (server-only). Faz token refresh, fetch autenticado e
// expõe operações de alto nível: salvar tokens após callback, ler tokens,
// pegar "now playing", "top tracks" e "audio features".

import { supabaseAdmin } from "@/integrations/supabase/client.server";

// O Client ID é público (vai aparecer na URL de autorização). O secret fica no env.
export const SPOTIFY_CLIENT_ID = "7254d2883455440297aa4e5de79f7325";

export const SPOTIFY_SCOPES = [
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-top-read",
  "user-read-recently-played",
].join(" ");

export interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO
  scope: string;
  token_type: string;
}

function clientSecret(): string {
  const s = process.env.SPOTIFY_CLIENT_SECRET;
  if (!s) throw new Error("SPOTIFY_CLIENT_SECRET ausente");
  return s;
}

function basicAuth(): string {
  const raw = `${SPOTIFY_CLIENT_ID}:${clientSecret()}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", SPOTIFY_CLIENT_ID);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SPOTIFY_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("show_dialog", "true");
  return url.toString();
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify token exchange ${res.status}: ${t}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: basicAuth(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify refresh ${res.status}: ${t}`);
  }
  return (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  };
}

export async function fetchSpotifyMe(accessToken: string) {
  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Spotify /me ${res.status}`);
  return (await res.json()) as { id: string; display_name: string | null };
}

export async function saveConnection(
  partnerName: string,
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
  },
  profile: { id: string; display_name: string | null },
) {
  const expires_at = new Date(Date.now() + (tokens.expires_in - 30) * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("spotify_connections")
    .upsert(
      {
        partner_name: partnerName,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
        token_type: tokens.token_type,
        expires_at,
        spotify_user_id: profile.id,
        display_name: profile.display_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "partner_name" },
    );
  if (error) throw error;
}

/** Garante um access_token válido para o partner. Faz refresh se preciso. */
export async function getValidAccessToken(partnerName: string): Promise<{
  access_token: string;
  display_name: string | null;
  spotify_user_id: string | null;
} | null> {
  const { data, error } = await supabaseAdmin
    .from("spotify_connections")
    .select("*")
    .eq("partner_name", partnerName)
    .maybeSingle();
  if (error || !data) return null;

  const expiresAt = new Date(data.expires_at).getTime();
  if (expiresAt > Date.now() + 5_000) {
    return {
      access_token: data.access_token,
      display_name: data.display_name,
      spotify_user_id: data.spotify_user_id,
    };
  }

  // refresh
  const refreshed = await refreshAccessToken(data.refresh_token);
  const new_expires_at = new Date(
    Date.now() + (refreshed.expires_in - 30) * 1000,
  ).toISOString();
  await supabaseAdmin
    .from("spotify_connections")
    .update({
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? data.refresh_token,
      expires_at: new_expires_at,
      scope: refreshed.scope,
      token_type: refreshed.token_type,
      updated_at: new Date().toISOString(),
    })
    .eq("partner_name", partnerName);

  return {
    access_token: refreshed.access_token,
    display_name: data.display_name,
    spotify_user_id: data.spotify_user_id,
  };
}

async function spotifyGet<T>(accessToken: string, path: string): Promise<T | null> {
  const res = await fetch(`https://api.spotify.com/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 204) return null; // ex: nada tocando agora
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Spotify GET ${path} ${res.status}: ${t}`);
  }
  return (await res.json()) as T;
}

export async function fetchNowPlaying(accessToken: string) {
  return spotifyGet<{
    is_playing: boolean;
    progress_ms: number | null;
    item: {
      id: string;
      name: string;
      duration_ms: number;
      external_urls: { spotify?: string };
      artists: Array<{ id: string; name: string }>;
      album: {
        name: string;
        images: Array<{ url: string; width?: number; height?: number }>;
      };
    } | null;
  }>(accessToken, "v1/me/player/currently-playing");
}

export async function fetchTopTracks(accessToken: string) {
  return spotifyGet<{
    items: Array<{
      id: string;
      name: string;
      external_urls: { spotify?: string };
      artists: Array<{ id: string; name: string }>;
      album: {
        name: string;
        images: Array<{ url: string; width?: number; height?: number }>;
      };
    }>;
  }>(accessToken, "v1/me/top/tracks?time_range=long_term&limit=5");
}

export async function fetchAudioFeatures(accessToken: string, trackId: string) {
  return spotifyGet<{
    energy: number | null;
    valence: number | null;
    danceability: number | null;
    tempo: number | null;
  }>(accessToken, `v1/audio-features/${trackId}`);
}
