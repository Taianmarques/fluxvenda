import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { generatePwaIconVariants } from "@/lib/branding";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  imageBase64: z.string().min(1).max(8_000_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
});

// Ícone do PWA (app/manifest.ts) — recebe UM upload e gera os 3 variants (192/512/512-maskable)
// via sharp. Não grava a imagem original, só os 3 derivados já prontos pra servir.
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  let variants;
  try {
    variants = await generatePwaIconVariants(Buffer.from(body.data.imageBase64, "base64"));
  } catch {
    return NextResponse.json({ error: "Não foi possível processar a imagem." }, { status: 400 });
  }

  const user = await currentUser();
  const updated = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {
      pwaIcon192Base64: variants.icon192.toString("base64"), pwaIcon192MimeType: "image/png",
      pwaIcon512Base64: variants.icon512.toString("base64"), pwaIcon512MimeType: "image/png",
      pwaIcon512MaskableBase64: variants.icon512Maskable.toString("base64"), pwaIcon512MaskableMimeType: "image/png",
      updatedByEmail: user?.emailAddresses[0]?.emailAddress,
    },
    create: {
      id: "singleton",
      pwaIcon192Base64: variants.icon192.toString("base64"), pwaIcon192MimeType: "image/png",
      pwaIcon512Base64: variants.icon512.toString("base64"), pwaIcon512MimeType: "image/png",
      pwaIcon512MaskableBase64: variants.icon512Maskable.toString("base64"), pwaIcon512MaskableMimeType: "image/png",
      updatedByEmail: user?.emailAddresses[0]?.emailAddress,
    },
  });

  return NextResponse.json({ pwaIconPreview: `data:${updated.pwaIcon512MimeType};base64,${updated.pwaIcon512Base64}` });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {
      pwaIcon192Base64: null, pwaIcon192MimeType: null,
      pwaIcon512Base64: null, pwaIcon512MimeType: null,
      pwaIcon512MaskableBase64: null, pwaIcon512MaskableMimeType: null,
    },
    create: { id: "singleton" },
  });

  return NextResponse.json({ pwaIconPreview: null });
}
