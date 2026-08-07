import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Proxy de download pra mídia do WhatsApp (imagem/vídeo/documento). O <a download> do HTML é
// ignorado pelo navegador em links cross-origin (a mídia vive em tanacidade.uazapi.com, não no
// nosso domínio) — por isso precisa passar pelo nosso próprio domínio com Content-Disposition:
// attachment. Só permite proxiar o host da UazAPI configurada, pra não virar um proxy aberto.
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("filename") || "arquivo";
  if (!url) return NextResponse.json({ error: "url obrigatória" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "url inválida" }, { status: 400 });
  }

  const allowedHost = (() => {
    try { return new URL(process.env.UAZAPI_URL ?? "").host; } catch { return ""; }
  })();
  if (parsed.protocol !== "https:" || !allowedHost || parsed.host !== allowedHost) {
    return NextResponse.json({ error: "host não permitido" }, { status: 400 });
  }

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Não foi possível baixar o arquivo" }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
