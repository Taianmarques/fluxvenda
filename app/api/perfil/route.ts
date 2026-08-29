import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { formatPhone } from "@/lib/whatsapp";

const schema = z.object({
  name: z.string().trim().min(2, { message: "Informe seu nome." }),
  phone: z.string().trim().optional(),
});

// Atualiza nome e contato do próprio perfil logado — sem exigir senha, já que não são
// credenciais de acesso (isso fica em /api/perfil/email e /api/perfil/senha).
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { name, phone } = body.data;

    const profile = await prisma.profile.update({
      where: { id: userId },
      data: { name, phone: phone?.trim() ? formatPhone(phone.trim()) : null },
    });

    return NextResponse.json({ ok: true, name: profile.name, phone: profile.phone });
  } catch (err) {
    console.error("[perfil]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
