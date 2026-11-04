"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Hls from "hls.js";

export type AdInfo = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  targetUrl: string | null;
  placement: "PRE_ROLL" | "MID_ROLL" | "POST_ROLL";
};

type Props = {
  src: string;
  heading: string;
  slug: string;
  titleId: string;
  episodeId: string | null;
  startAt: number;
  next: { id: string; name: string } | null;
  intro: { start: number; end: number } | null;
  creditsAt: number | null;
  ads: AdInfo[];
  maxQuality: string;
};

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return `${h ? h + ":" : ""}${h ? String(m).padStart(2, "0") : m}:${String(sec).padStart(2, "0")}`;
};

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true }).catch(() => {});

export function Player(p: Props) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const startedRef = useRef(false);
  const lastSaveRef = useRef(0);
  const midShownRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [levels, setLevels] = useState<{ index: number; height: number }[]>([]);
  const [level, setLevel] = useState(-1); // -1 = auto
  const [tracks, setTracks] = useState<{ index: number; label: string }[]>([]);
  const [subs, setSubs] = useState<{ index: number; label: string }[]>([]);
  const [audio, setAudio] = useState(0);
  const [sub, setSub] = useState(-1);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ad, setAd] = useState<AdInfo | null>(null);
  const [adLeft, setAdLeft] = useState(0);
  const adQueue = useRef<AdInfo[]>(p.ads.filter((a) => a.placement === "PRE_ROLL"));
  const afterAd = useRef<() => void>(() => {});

  const maxH = parseInt(p.maxQuality, 10) || 4320;

  const playAd = useCallback((a: AdInfo, done: () => void) => {
    setAd(a);
    setAdLeft(a.mediaType === "image" ? 5 : 0);
    afterAd.current = done;
    videoRef.current?.pause();
    post("/api/ads/event", { adId: a.id, type: "view" });
  }, []);

  const finishAd = useCallback(() => {
    setAd(null);
    afterAd.current();
  }, []);

  // Obrázková reklama – odpočet
  useEffect(() => {
    if (!ad || ad.mediaType !== "image") return;
    const t = setInterval(() => setAdLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [ad]);
  useEffect(() => {
    if (ad?.mediaType === "image" && adLeft <= 0 && ad) finishAd();
  }, [adLeft, ad, finishAd]);

  // Inicializácia HLS
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const begin = () => {
      const first = adQueue.current.shift();
      const go = () => v.play().catch(() => {});
      if (first) playAd(first, go);
      else go();
    };

    if (Hls.isSupported() && /\.m3u8(\?|$)/.test(p.src)) {
      const hls = new Hls({ startPosition: p.startAt || -1 });
      hlsRef.current = hls;
      hls.loadSource(p.src);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, (_e, data) => {
        setLevels(data.levels.map((l, i) => ({ index: i, height: l.height })).filter((l) => !l.height || l.height <= maxH));
        // Plán obmedzuje najvyššiu kvalitu
        const allowed = data.levels.map((l, i) => ({ i, h: l.height })).filter((x) => !x.h || x.h <= maxH);
        if (allowed.length && allowed.length < data.levels.length) hls.autoLevelCapping = Math.max(...allowed.map((x) => x.i));
        begin();
      });
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_e, d) =>
        setTracks(d.audioTracks.map((t, i) => ({ index: i, label: t.name || t.lang || `Stopa ${i + 1}` }))));
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, d) =>
        setSubs(d.subtitleTracks.map((t, i) => ({ index: i, label: t.name || t.lang || `Titulky ${i + 1}` }))));
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (d.fatal) setError("Video sa nepodarilo načítať.");
      });
      return () => { hls.destroy(); hlsRef.current = null; };
    }

    // Safari (natívne HLS) alebo MP4
    v.src = p.src;
    const onMeta = () => { if (p.startAt) v.currentTime = p.startAt; begin(); };
    v.addEventListener("loadedmetadata", onMeta, { once: true });
    v.addEventListener("error", () => setError("Video sa nepodarilo načítať."), { once: true });
    return () => v.removeEventListener("loadedmetadata", onMeta);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.src]);

  const save = useCallback((force = false) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const now = Date.now();
    if (!force && now - lastSaveRef.current < 10000) return;
    lastSaveRef.current = now;
    post("/api/progress", {
      titleId: p.titleId, episodeId: p.episodeId,
      positionSec: Math.floor(v.currentTime), durationSec: Math.floor(v.duration),
      start: !startedRef.current,
    });
    startedRef.current = true;
  }, [p.titleId, p.episodeId]);

  useEffect(() => {
    const onHide = () => save(true);
    window.addEventListener("pagehide", onHide);
    return () => { window.removeEventListener("pagehide", onHide); save(true); };
  }, [save]);

  function goNext() {
    save(true);
    if (p.next) router.push(`/watch/${p.slug}?e=${p.next.id}`);
    else router.push(`/title/${p.slug}`);
  }

  function onEnded() {
    const post_ = p.ads.find((a) => a.placement === "POST_ROLL");
    const proceed = () => goNext();
    if (post_) playAd(post_, proceed);
    else proceed();
  }

  function onTimeUpdate() {
    const v = videoRef.current!;
    setTime(v.currentTime);
    save();
    // Reklama počas filmu – raz, približne v polovici
    const mid = p.ads.find((a) => a.placement === "MID_ROLL");
    if (mid && !midShownRef.current && v.duration > 600 && v.currentTime > v.duration / 2) {
      midShownRef.current = true;
      playAd(mid, () => v.play().catch(() => {}));
    }
  }

  const toggle = () => { const v = videoRef.current!; v.paused ? v.play() : v.pause(); };
  const seek = (t: number) => { videoRef.current!.currentTime = t; };
  const fullscreen = () => {
    const el = wrapRef.current!;
    document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (ad) return;
      const v = videoRef.current; if (!v) return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
      else if (e.key === "ArrowRight") v.currentTime += 10;
      else if (e.key === "ArrowLeft") v.currentTime -= 10;
      else if (e.key === "f") fullscreen();
      else if (e.key === "m") v.muted = !v.muted;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ad]);

  const inIntro = p.intro && time >= p.intro.start && time < p.intro.end;
  const inCredits = p.creditsAt != null && time >= p.creditsAt;

  return (
    <div ref={wrapRef} className="relative flex h-screen w-screen items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="h-full w-full"
        playsInline
        onClick={toggle}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
        onTimeUpdate={onTimeUpdate}
        onEnded={onEnded}
      />

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
          <p>{error}</p>
          <button onClick={() => router.push(`/title/${p.slug}`)} className="rounded bg-white/20 px-4 py-2">Späť</button>
        </div>
      )}

      {/* Reklama */}
      {ad && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
          {ad.mediaType === "video" ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={ad.mediaUrl} autoPlay playsInline className="h-full w-full object-contain" onEnded={finishAd} onError={finishAd} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.mediaUrl} alt="Reklama" className="max-h-full max-w-full object-contain" />
          )}
          <span className="absolute left-4 top-4 rounded bg-black/70 px-3 py-1 text-xs uppercase tracking-wider">
            Reklama{ad.mediaType === "image" && adLeft > 0 ? ` · ${adLeft}s` : ""}
          </span>
          {ad.targetUrl && (
            <a
              href={ad.targetUrl} target="_blank" rel="noopener noreferrer sponsored"
              onClick={() => post("/api/ads/event", { adId: ad.id, type: "click" })}
              className="absolute bottom-6 left-4 rounded bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Zistiť viac
            </a>
          )}
        </div>
      )}

      {/* Ovládanie */}
      {!ad && !error && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 to-transparent p-4 opacity-0 transition hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100">
          <p className="mb-2 text-sm text-white/80">{p.heading}</p>
          <input type="range" min={0} max={dur || 0} step={1} value={time} onChange={(e) => seek(Number(e.target.value))}
            className="w-full accent-[#e50914]" aria-label="Časová os" />
          <div className="mt-2 flex items-center gap-4 text-sm">
            <button onClick={toggle} aria-label={playing ? "Pauza" : "Prehrať"} className="text-2xl">{playing ? "❚❚" : "▶"}</button>
            <button onClick={() => seek(Math.max(0, time - 10))} aria-label="Späť 10 s">⟲ 10</button>
            <button onClick={() => seek(time + 10)} aria-label="Vpred 10 s">10 ⟳</button>
            <input type="range" min={0} max={1} step={0.05} value={vol}
              onChange={(e) => { const x = Number(e.target.value); setVol(x); videoRef.current!.volume = x; }}
              className="w-24 accent-white" aria-label="Hlasitosť" />
            <span className="text-white/70">{fmt(time)} / {fmt(dur)}</span>
            <span className="flex-1" />
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-label="Nastavenia">⚙ Nastavenia</button>
              {menu && (
                <div className="absolute bottom-10 right-0 w-56 space-y-3 rounded-lg bg-ink-800 p-3 text-sm shadow-xl">
                  {levels.length > 0 && (
                    <label className="block">Kvalita
                      <select value={level} onChange={(e) => { const i = Number(e.target.value); setLevel(i); if (hlsRef.current) hlsRef.current.currentLevel = i; }}
                        className="mt-1 w-full rounded bg-ink-700 p-1">
                        <option value={-1}>Auto</option>
                        {levels.map((l) => <option key={l.index} value={l.index}>{l.height ? `${l.height}p` : `Úroveň ${l.index}`}</option>)}
                      </select>
                    </label>
                  )}
                  {tracks.length > 1 && (
                    <label className="block">Jazyková stopa
                      <select value={audio} onChange={(e) => { const i = Number(e.target.value); setAudio(i); if (hlsRef.current) hlsRef.current.audioTrack = i; }}
                        className="mt-1 w-full rounded bg-ink-700 p-1">
                        {tracks.map((t) => <option key={t.index} value={t.index}>{t.label}</option>)}
                      </select>
                    </label>
                  )}
                  {subs.length > 0 && (
                    <label className="block">Titulky
                      <select value={sub} onChange={(e) => { const i = Number(e.target.value); setSub(i); if (hlsRef.current) hlsRef.current.subtitleTrack = i; }}
                        className="mt-1 w-full rounded bg-ink-700 p-1">
                        <option value={-1}>Vypnuté</option>
                        {subs.map((t) => <option key={t.index} value={t.index}>{t.label}</option>)}
                      </select>
                    </label>
                  )}
                  {levels.length === 0 && tracks.length <= 1 && subs.length === 0 && <p className="text-white/50">Žiadne ďalšie možnosti.</p>}
                </div>
              )}
            </div>
            <button onClick={fullscreen} aria-label="Celá obrazovka">⛶</button>
          </div>
        </div>
      )}

      {/* Preskočiť intro / titulky + ďalšia epizóda */}
      {!ad && inIntro && (
        <button onClick={() => seek(p.intro!.end)} className="absolute bottom-28 right-6 z-10 rounded border border-white/60 bg-black/60 px-5 py-2 font-semibold hover:bg-white hover:text-black">
          Preskočiť intro
        </button>
      )}
      {!ad && inCredits && (
        <button onClick={goNext} className="absolute bottom-28 right-6 z-10 rounded bg-white px-5 py-2 font-semibold text-black">
          {p.next ? `Ďalšia epizóda: ${p.next.name}` : "Preskočiť titulky"}
        </button>
      )}

      <button onClick={() => { save(true); router.push(`/title/${p.slug}`); }} aria-label="Zavrieť"
        className="absolute left-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-xl opacity-70 hover:opacity-100">←</button>
    </div>
  );
}
