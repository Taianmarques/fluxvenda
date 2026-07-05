import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const banners = await prisma.storeBanner.findMany({
    where: { agentConfigId: agentId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ banners });
}

const schema = z.object({
  banners: z.array(z.object({
    id: z.string().optional(),          // presente = banner existente (mantém a imagem no banco)
    imagemBase64: z.string().max(3_000_000).optional(), // obrigatório só para banner novo
    imagemMimeType: z.string().optional(),
    active: z.boolean().default(true),
  })).max(10),
});

// PUT substitui a lista inteira: banners existentes fora da lista são removidos,
// novos (sem id) são criados; a ordem é a posição no array.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const incoming = body.data.banners;
  const keepIds = incoming.filter((b) => b.id).map((b) => b.id!) as string[];

  const ops = [
    prisma.storeBanner.deleteMany({
      where: { agentConfigId: agentId, id: { notIn: keepIds } },
    }),
    ...incoming.map((b, i) =>
      b.id
        ? prisma.storeBanner.updateMany({
            where: { id: b.id, agentConfigId: agentId },
            data: { order: i, active: b.active },
          })
        : prisma.storeBanner.create({
            data: {
              agentConfigId: agentId,
              imagemBase64: b.imagemBase64 ?? "",
              imagemMimeType: b.imagemMimeType ?? "image/jpeg",
              order: i,
              active: b.active,
            },
          })
    ),
  ];
  await prisma.$transaction(ops);

  const banners = await prisma.storeBanner.findMany({
    where: { agentConfigId: agentId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ banners });
}
