import { NextRequest, NextResponse } from "next/server";
import { mkdir, open, unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { MEDIA_DIR } from "@/lib/media-store";
import { caminhoMidia, conteudoConfere, lerLinkEnvio, MAX_ENVIO_BYTES, registrarMidia, TIPOS_MIDIA, urlMidia } from "@/lib/mcp/biblioteca";

// Recebe o arquivo do link criado por admin_preparar_envio_midia. O link é assinado, vale 1 hora e
// serve uma vez só (o id do link vira o nome do arquivo; "wx" recusa se já existir).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const envio = await lerLinkEnvio(token);
  if (!envio || !TIPOS_MIDIA[envio.mime] || !/^[0-9a-f-]{36}$/.test(envio.id)) return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 403 });

  const perfil = await prisma.profile.findUnique({ where: { id: envio.profileId }, select: { role: true } });
  if (perfil?.role !== "ADMIN") return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  if (!req.body) return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });

  const arquivo = `${envio.id}.${TIPOS_MIDIA[envio.mime]}`;
  const destino = caminhoMidia(arquivo);
  await mkdir(MEDIA_DIR, { recursive: true });
  const saida = await open(destino, "wx").catch(() => null);
  if (!saida) return NextResponse.json({ error: "Este link já foi usado" }, { status: 409 });

  const descartar = async (error: string, status: number) => {
    await saida.close().catch(() => {});
    await unlink(destino).catch(() => {});
    return NextResponse.json({ error }, { status });
  };

  let total = 0;
  let inicio = Buffer.alloc(0);
  try {
    const leitor = req.body.getReader();
    for (;;) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.length;
      if (total > MAX_ENVIO_BYTES) {
        await leitor.cancel().catch(() => {});
        return descartar("Arquivo grande demais (máx. 200 MB)", 413);
      }
      if (inicio.length < 16) inicio = Buffer.concat([inicio, Buffer.from(value)]);
      await saida.write(value);
    }
  } catch (err) {
    console.error("[mcp/midia] envio", err);
    return descartar("Envio interrompido", 400);
  }
  if (total === 0) return descartar("Arquivo vazio", 400);
  if (!conteudoConfere(envio.mime, inicio)) return descartar(`O conteúdo não corresponde ao tipo ${envio.mime}`, 415);
  await saida.close();

  await registrarMidia({ id: envio.id, profileId: envio.profileId, nome: envio.nome, descricao: envio.descricao, mime: envio.mime, tamanho: total, arquivo });
  return NextResponse.json({ ok: true, id: envio.id, bytes: total, link: urlMidia(arquivo) }, { status: 201 });
}
