// Player das aulas: transforma o link colado pelo admin (Vimeo, YouTube ou arquivo .mp4) no que a
// página precisa para tocar. Vimeo é o principal; os outros ficam aceitos para não travar o admin.
//
// Vimeo aceito:
//   vimeo.com/123456789                 (público)
//   vimeo.com/123456789/abcdef1234      (não listado: o segundo trecho é o hash de privacidade)
//   player.vimeo.com/video/123456789?h=abcdef1234
//   vimeo.com/channels/x/123456789, vimeo.com/showcase/1/video/123456789, vimeo.com/manage/videos/123456789/abcdef

export type VideoEmbed = { tipo: "iframe"; src: string; provedor: "vimeo" | "youtube" } | { tipo: "arquivo"; src: string };

export function embedDoVideo(url: string | null | undefined): VideoEmbed | null {
  const bruto = (url ?? "").trim();
  if (!bruto) return null;
  let u: URL;
  try {
    u = new URL(bruto.startsWith("http") ? bruto : `https://${bruto}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = u.pathname.match(/\/(\d{6,})(?:\/([0-9a-f]{6,}))?/i);
    if (!m) return null;
    const hash = u.searchParams.get("h") ?? m[2] ?? "";
    const params = new URLSearchParams({ ...(hash ? { h: hash } : {}), dnt: "1", title: "0", byline: "0", portrait: "0" });
    return { tipo: "iframe", provedor: "vimeo", src: `https://player.vimeo.com/video/${m[1]}?${params}` };
  }

  if (host === "youtu.be" || host.endsWith("youtube.com")) {
    const id = host === "youtu.be"
      ? u.pathname.slice(1)
      : u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    if (!id || !/^[\w-]{6,}$/.test(id)) return null;
    return { tipo: "iframe", provedor: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` };
  }

  if (u.protocol === "https:" && /\.mp4$/i.test(u.pathname)) return { tipo: "arquivo", src: u.toString() };
  return null;
}

export function videoValido(url: string) {
  return embedDoVideo(url) !== null;
}
