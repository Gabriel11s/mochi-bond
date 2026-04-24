// Tipos compartilhados entre o panel e o servidor

export interface SpotifyArtistLite {
  id: string;
  name: string;
  /** Gêneros do Spotify para esse artista (pode estar vazio). */
  genres?: string[];
  /** 0–100. Quanto mais alto, mais popular o artista. */
  popularity?: number | null;
}

export interface SpotifyImage {
  url: string;
  width?: number | null;
  height?: number | null;
}

export interface SpotifyTrackLite {
  id: string;
  name: string;
  artists: SpotifyArtistLite[];
  album: {
    name: string;
    images: SpotifyImage[];
  };
  external_url?: string | null;
  duration_ms?: number;
}

export interface NowPlayingResponse {
  is_playing: boolean;
  progress_ms: number | null;
  track: SpotifyTrackLite | null;
  features: {
    energy: number | null;
    valence: number | null;
    danceability: number | null;
    tempo: number | null;
  } | null;
  /** Gêneros agregados de todos os artistas da faixa (lowercase, dedup). */
  genres: string[];
  /** Popularidade média dos artistas (0–100). */
  artist_popularity: number | null;
}

export interface TopTracksResponse {
  items: SpotifyTrackLite[];
}

export interface ConnectionStatus {
  connected: boolean;
  display_name: string | null;
  spotify_user_id: string | null;
}
