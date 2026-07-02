import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { scrapeGoogleMaps } from "@/lib/google-maps-scraper";
import { z } from "zod";

const schema = z.object({
  segmento: z.string().min(1),
  regiao: z.string().min(1),
  maxResults: z.number().int().min(1).max(50).default(20),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { segmento, regiao, maxResults } = body.data;
  const query = `${segmento} em ${regiao}`;

  let scraped: Awaited<ReturnType<typeof scrapeGoogleMaps>> = [];
  try {
    scraped = await scrapeGoogleMaps(query, maxResults);
  } catch (err) {
    console.error("[prospectar] erro no scraping:", err);
    return NextResponse.json({ error: "Falha no scraping. Verifique se o Chromium está instalado no servidor." }, { status: 500 });
  }

  // Filtra telefones já existentes pra esse agente (evita duplicatas)
  const existentes = await prisma.prospect.findMany({
    where: { agentConfigId: agentId },
    select: { telefone: true },
  });
  const telSet = new Set(existentes.map(e => e.telefone));

  const novos = scraped.filter(s => s.telefone && !telSet.has(s.telefone));
  const duplicatas = scraped.length - novos.length;

  if (novos.length > 0) {
    await prisma.prospect.createMany({
      data: novos.map(s => ({
        agentConfigId: agentId,
        nome: s.nome,
        empresa: s.empresa,
        telefone: s.telefone,
        segmento,
        regiao,
        sourceUrl: s.sourceUrl,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ total: scraped.length, novos: novos.length, duplicatas });
}
