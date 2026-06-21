import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Webhook do Clerk para sincronizar usuários criados/atualizados
export async function POST(req: NextRequest) {
  const payload = await req.json();
  const { type, data } = payload;

  if (type === "user.created") {
    const email = data.email_addresses?.[0]?.email_address ?? "";
    const name = `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim();

    await prisma.profile.upsert({
      where: { id: data.id },
      update: { email, name, avatarUrl: data.image_url },
      create: {
        id: data.id,
        email,
        name: name || email,
        avatarUrl: data.image_url,
      },
    });
  }

  if (type === "user.deleted") {
    await prisma.profile.deleteMany({ where: { id: data.id } });
  }

  return NextResponse.json({ ok: true });
}
