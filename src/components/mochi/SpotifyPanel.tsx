import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type {
  ConnectionStatus,
  NowPlayingResponse,
  SpotifyTrackLite,
  TopTracksResponse,
} from "@/lib/spotify-types";
import { buildMochiReaction, type MochiMusicReaction } from "@/lib/spotify-vibe";
import { clamp } from "@/lib/mochi-types";

interface Props {
  partnerName: string;
  petName: string;
  /** Quando o Mochi reage à música, dispara um balão de fala no PetRoom. */
  onReaction?: (reaction: MochiMusicReaction) => void;
  /** Estado controlado de abertura do painel (controlado pelo PetRoom). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Comunica o "tocando agora" pro PetRoom mostrar a barra de vibe sempre visível. */
  onNowChange?: (now: NowPlayingResponse | null) => void;
}

type Tab = "now" | "top" | "vibe";

const POLL_MS = 20_000;

function getSpotifyAppOrigin() {
  if (typeof window === "undefined") return "";
  try {
    if (document.referrer) {
      const referrerUrl = new URL(document.referrer);
      if (referrerUrl.protocol === "https:" && referrerUrl.hostname.includes("lovable.app")) {
        return referrerUrl.origin;
      }
    }
  } catch {
    // cai no origin atual
  }
  return window.location.origin;
}

export function SpotifyPanel({
  partnerName,
  petName,
  onReaction,
  open,
  onOpenChange,
  onNowChange,
}: Props) {
  const [tab, setTab] = useState<Tab>("now");
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [now, setNow] = useState<NowPlayingResponse | null>(null);
  const [top, setTop] = useState<SpotifyTrackLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const lastReactedTrackRef = useRef<string | null>(null);

  // status
  useEffect(() => {
    let active = true;
    fetch(`/api/spotify/status?partner=${encodeURIComponent(partnerName)}`)
      .then((r) => r.json())
      .then((d: ConnectionStatus) => {
        if (active) setStatus(d);
      })
      .catch(() => {
        if (active) setStatus({ connected: false, display_name: null, spotify_user_id: null });
      });
    return () => {
      active = false;
    };
  }, [partnerName]);

  // refresh status quando a URL ganha ?spotify_connected=1 ou erro
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const ok = url.searchParams.get("spotify_connected");
    const err = url.searchParams.get("spotify_error");
    if (ok || err) {
      url.searchParams.delete("spotify_connected");
      url.searchParams.delete("spotify_error");
      window.history.replaceState({}, "", url.toString());
      if (ok) {
        setJustConnected(true);
        fetch(`/api/spotify/status?partner=${encodeURIComponent(partnerName)}`)
          .then((r) => r.json())
          .then((d: ConnectionStatus) => setStatus(d))
          .catch(() => {});
        onOpenChange(true);
      }
    }
  }, [partnerName, onOpenChange]);

  useEffect(() => {
    if (!justConnected || !status?.display_name) return;
    const timeout = window.setTimeout(() => setJustConnected(false), 4000);
    return () => window.clearTimeout(timeout);
  }, [justConnected, status?.display_name]);

  const loadNow = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/spotify/data?partner=${encodeURIComponent(partnerName)}&kind=now`,
        );
        if (!r.ok) {
          const empty = { is_playing: false, progress_ms: null, track: null, features: null };
          setNow(empty);
          onNowChange?.(empty);
          return;
        }
        const d: NowPlayingResponse = await r.json();
        setNow(d);
        onNowChange?.(d);
      } finally {
        setLoading(false);
      }
    },
    [partnerName, onNowChange],
  );

  const loadTop = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const r = await fetch(
          `/api/spotify/data?partner=${encodeURIComponent(partnerName)}&kind=top`,
        );
        if (!r.ok) {
          setTop([]);
          return;
        }
        const d: TopTracksResponse = await r.json();
        setTop(d.items ?? []);
      } finally {
        setLoading(false);
      }
    },
    [partnerName],
  );

  // poll do "tocando agora" SEMPRE que estiver conectado, mesmo com painel fechado,
  // pra alimentar a barra de vibe que fica visível no PetRoom.
  useEffect(() => {
    if (!status?.connected) return;
    loadNow();
    const t = window.setInterval(loadNow, POLL_MS);
    return () => window.clearInterval(t);
  }, [status?.connected, loadNow]);

  useEffect(() => {
    if (!open || !status?.connected) return;
    if (tab !== "top") return;
    loadTop();
  }, [open, status?.connected, tab, loadTop]);

  // Mochi reage à música nova (só uma vez por faixa, com cooldown via track id)
  useEffect(() => {
    if (!now?.track || !now.is_playing) return;
    if (lastReactedTrackRef.current === now.track.id) return;
    lastReactedTrackRef.current = now.track.id;

    const artistNames = now.track.artists.map((a) => a.name);
    const reaction = buildMochiReaction(
      now.features,
      partnerName,
      now.track.name,
      artistNames,
    );
    onReaction?.(reaction);

    // aplica boost sutil nos stats (com cooldown anti-spam: máx 1 boost por faixa)
    if (reaction.happinessDelta !== 0 || reaction.energyDelta !== 0) {
      applyMusicBoost({
        partnerName,
        track: now.track,
        reaction,
      }).catch((e) => console.warn("music boost falhou:", e));
    }
  }, [now?.track?.id, now?.is_playing, now?.features, partnerName, onReaction]);

  const handleConnect = () => {
    if (typeof window === "undefined") return;
    const loginUrl = new URL("/api/spotify/login", getSpotifyAppOrigin());
    loginUrl.searchParams.set("partner", partnerName);
    window.open(loginUrl.toString(), "_top");
  };

  const handleDisconnect = async () => {
    await fetch(`/api/spotify/status?partner=${encodeURIComponent(partnerName)}`, {
      method: "DELETE",
    });
    setStatus({ connected: false, display_name: null, spotify_user_id: null });
    setNow(null);
    setTop([]);
  };

  // Painel modal centralizado (controlado pelo PetRoom)
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-20 backdrop-blur-sm sm:pt-24"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="glass-strong w-[300px] overflow-hidden rounded-2xl p-3 shadow-xl sm:w-[340px]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <SpotifyIcon className="h-3.5 w-3.5 text-[#1DB954]" />
                Spotify
                {status?.display_name ? ` · ${status.display_name}` : ""}
              </p>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </header>

            {justConnected && status?.display_name && (
              <div className="mb-3 rounded-xl bg-primary/10 px-3 py-2 text-sm text-foreground">
                Spotify conectado com sucesso · {status.display_name}
              </div>
            )}

            {!status?.connected ? (
              <div className="space-y-3 py-2">
                <p className="text-sm leading-snug">
                  conecta seu Spotify pra {petName} reagir às suas músicas, {partnerName.toLowerCase()} ✨
                </p>
                <button
                  onClick={handleConnect}
                  className="w-full rounded-xl bg-gradient-to-r from-[#1DB954] to-[#1ed760] px-4 py-2 text-sm font-semibold text-black shadow-md transition-all active:scale-[0.97]"
                >
                  conectar Spotify
                </button>
              </div>
            ) : (
              <>
                <div className="mb-2 flex gap-1 text-xs">
                  {(
                    [
                      { id: "now", label: "🎧 agora" },
                      { id: "top", label: "🔥 top 5" },
                      { id: "vibe", label: "😺 vibe" },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${
                        tab === t.id
                          ? "bg-foreground/10 font-semibold"
                          : "text-muted-foreground hover:bg-foreground/5"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="min-h-[120px]">
                  {tab === "now" && (
                    <NowPlayingCard now={now} loading={loading} onRefresh={loadNow} />
                  )}
                  {tab === "top" && <TopList tracks={top} loading={loading} />}
                  {tab === "vibe" && <VibeCard now={now} partnerName={partnerName} />}
                </div>

                <button
                  onClick={handleDisconnect}
                  className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  desconectar
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpotifyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function NowPlayingCard({
  now,
  loading,
  onRefresh,
}: {
  now: NowPlayingResponse | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  if (loading && !now) {
    return <p className="py-6 text-center text-xs text-muted-foreground">carregando…</p>;
  }
  if (!now || !now.track) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-muted-foreground">nada tocando agora 💤</p>
        <button
          onClick={onRefresh}
          className="mt-2 rounded-full bg-foreground/10 px-3 py-1 text-xs"
        >
          atualizar
        </button>
      </div>
    );
  }
  const t = now.track;
  const cover = t.album.images[0]?.url;
  return (
    <div className="flex gap-3">
      {cover && (
        <img
          src={cover}
          alt=""
          className="h-16 w-16 flex-shrink-0 rounded-lg object-cover shadow"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{t.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {t.artists.map((a) => a.name).join(", ")}
        </p>
        <p className="mt-1 truncate text-[10px] text-muted-foreground">
          {now.is_playing ? "▶︎ tocando" : "⏸ pausado"} · {t.album.name}
        </p>
      </div>
    </div>
  );
}

function TopList({ tracks, loading }: { tracks: SpotifyTrackLite[]; loading: boolean }) {
  if (loading && tracks.length === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">carregando…</p>;
  }
  if (tracks.length === 0) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        sem dados de top tracks ainda
      </p>
    );
  }
  return (
    <ol className="space-y-2">
      {tracks.map((t, i) => {
        const cover = t.album.images[t.album.images.length - 1]?.url ?? t.album.images[0]?.url;
        return (
          <li key={t.id} className="flex items-center gap-2">
            <span className="w-4 text-center text-xs font-bold text-muted-foreground">
              {i + 1}
            </span>
            {cover && (
              <img src={cover} alt="" className="h-9 w-9 rounded object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{t.name}</p>
              <p className="truncate text-[10px] text-muted-foreground">
                {t.artists.map((a) => a.name).join(", ")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function VibeCard({
  now,
  partnerName,
  petName,
}: {
  now: NowPlayingResponse | null;
  partnerName: string;
  petName: string;
}) {
  if (!now?.track) {
    return (
      <p className="py-6 text-center text-xs text-muted-foreground">
        toca alguma coisa pra {petName} sentir a vibe 🎶
      </p>
    );
  }
  const artistNames = now.track.artists.map((a) => a.name);
  const reaction = buildMochiReaction(
    now.features,
    partnerName,
    now.track.name,
    artistNames,
  );
  const f = now.features;
  return (
    <div className="space-y-2">
      <p className="text-xs italic leading-snug">"{reaction.message}"</p>
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <Stat label="energia" v={f?.energy} />
        <Stat label="alegria" v={f?.valence} />
        <Stat label="dança" v={f?.danceability} />
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        vibe detectada: <span className="font-semibold">{reaction.vibe}</span>
      </p>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number | null | undefined }) {
  const pct = v == null ? 0 : Math.round(v * 100);
  return (
    <div className="rounded-lg bg-foreground/5 p-1.5 text-center">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-bold tabular-nums">{v == null ? "—" : `${pct}%`}</p>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Boost de stats: armazenamos em localStorage o último track id que rendeu
// boost para esse partner, evitando que o mesmo track seja contado de novo.
// O delta é pequeno (vide spotify-vibe.ts) e tem cooldown global de 5min.

const BOOST_KEY = (p: string) => `mochi-music-boost:${p}`;
const BOOST_COOLDOWN_MS = 5 * 60 * 1000;

async function applyMusicBoost({
  partnerName,
  track,
  reaction,
}: {
  partnerName: string;
  track: SpotifyTrackLite;
  reaction: MochiMusicReaction;
}) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(BOOST_KEY(partnerName));
    const prev = raw ? (JSON.parse(raw) as { trackId: string; t: number }) : null;
    if (prev?.trackId === track.id) return;
    if (prev && Date.now() - prev.t < BOOST_COOLDOWN_MS) return;

    const { data: pet } = await supabase.from("pet_state").select("*").eq("id", 1).single();
    if (!pet) return;

    const newHappiness = clamp(pet.happiness + reaction.happinessDelta);
    const newEnergy = clamp(pet.energy + reaction.energyDelta);

    await supabase
      .from("pet_state")
      .update({
        happiness: newHappiness,
        energy: newEnergy,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    await supabase.from("music_reactions").insert({
      partner_name: partnerName,
      track_id: track.id,
      track_name: track.name,
      artist_name: track.artists.map((a) => a.name).join(", "),
      vibe: reaction.vibe,
      energy: null,
      valence: null,
      danceability: null,
      happiness_delta: reaction.happinessDelta,
      energy_delta: reaction.energyDelta,
      message: reaction.message,
    });

    window.localStorage.setItem(
      BOOST_KEY(partnerName),
      JSON.stringify({ trackId: track.id, t: Date.now() }),
    );
  } catch (e) {
    console.warn("applyMusicBoost", e);
  }
}
