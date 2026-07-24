import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !(await userBelongsToAgentConfig(userId, product.agentConfigId))) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const images = await prisma.productImage.findMany({ where: { productId }, orderBy: { order: "asc" } });
  return NextResponse.json({ images });
}

const schema = z.object({
  images: z.array(z.object({
    id: z.string().optional(),          // presente = foto existente (mantém a imagem no banco)
    imagemBase64: z.string().max(3_000_000).optional(), // obrigatório só para foto nova
    imagemMimeType: z.string().optional(),
  })).max(10),
});

// PUT substitui a galeria inteira: fotos existentes fora da lista são removidas, novas
// (sem id) são criadas; a ordem é a posição no array. A primeira vira a capa do produto
// (Product.imagemBase64), usada nas miniaturas do CRM e por enviar_foto_produto.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: productId } = await params;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || !(await userBelongsToAgentConfig(userId, product.agentConfigId))) {
    return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const incoming = body.data.images;
  const keepIds = incoming.filter((i) => i.id).map((i) => i.id!) as string[];

  const ops = [
    prisma.productImage.deleteMany({
      where: { productId, id: { notIn: keepIds } },
    }),
    ...incoming.map((img, i) =>
      img.id
        ? prisma.productImage.updateMany({
            where: { id: img.id, productId },
            data: { order: i },
          })
        : prisma.productImage.create({
            data: {
              productId,
              imagemBase64: img.imagemBase64 ?? "",
              imagemMimeType: img.imagemMimeType ?? "image/jpeg",
              order: i,
            },
          })
    ),
  ];
  await prisma.$transaction(ops);

  const images = await prisma.productImage.findMany({ where: { productId }, orderBy: { order: "asc" } });

  // A primeira foto da galeria vira a capa (usada fora daqui: miniaturas do CRM, card da loja, enviar_foto_produto)
  await prisma.product.update({
    where: { id: productId },
    data: {
      imagemBase64: images[0]?.imagemBase64 ?? null,
      imagemMimeType: images[0]?.imagemMimeType ?? null,
    },
  });

  return NextResponse.json({ images });
}
