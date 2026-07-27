import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  imageBase64: z.string().min(1).max(3_000_000),
  mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/svg+xml"]),
});

// Logo do menu lateral do CRM — sem redimensionar (SVG é aceito aqui, renderizado direto).
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const user = await currentUser();
  const updated = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { menuLogoBase64: body.data.imageBase64, menuLogoMimeType: body.data.mimeType, updatedByEmail: user?.emailAddresses[0]?.emailAddress },
    create: { id: "singleton", menuLogoBase64: body.data.imageBase64, menuLogoMimeType: body.data.mimeType, updatedByEmail: user?.emailAddresses[0]?.emailAddress },
  });

  return NextResponse.json({ menuLogo: `data:${updated.menuLogoMimeType};base64,${updated.menuLogoBase64}` });
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { menuLogoBase64: null, menuLogoMimeType: null },
    create: { id: "singleton" },
  });

  return NextResponse.json({ menuLogo: null });
}
