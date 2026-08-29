import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { getManagedTeam } from "@/lib/team";

const schema = z.object({
  nome: z.string().trim().min(2, { message: "Informe o nome da empresa." }),
});

// Só o dono da equipe (ou co-gestor) pode renomear a empresa — afeta o time inteiro.
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const team = await getManagedTeam(userId);
    if (!team) return NextResponse.json({ error: "Só o gestor da equipe pode editar o nome da empresa." }, { status: 403 });

    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }

    const updated = await prisma.team.update({ where: { id: team.id }, data: { name: body.data.nome } });

    return NextResponse.json({ ok: true, nome: updated.name });
  } catch (err) {
    console.error("[equipe/nome]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
