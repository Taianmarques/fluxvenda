import { NextRequest, NextResponse } from "next/server";
import { auth, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getManagedTeam } from "@/lib/team";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(8).max(200),
  // ADMIN de propósito fora do enum — é o super-admin da plataforma inteira (área /admin,
  // todos os clientes), nunca deve ser atribuível a um membro de equipe por essa rota.
  role: z.enum(["VENDEDOR", "FUNCIONARIO", "GESTOR"]).default("VENDEDOR"),
});

// Cria o acesso de um atendente direto pelo CRM, sem passar pelo link de convite — o gestor
// já entrega o e-mail/senha prontos. Já onboarded (não passa pelo assistente de configuração
// inicial) e já como membro da equipe. role GESTOR dá o mesmo acesso do dono original (ver
// isManager em lib/team.ts) — útil pra um segundo sócio/gestor administrar tudo.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const team = await getManagedTeam(userId);
  if (!team) return NextResponse.json({ error: "Só o gestor cria usuários direto" }, { status: 403 });

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const { name, email, password, role } = body.data;

  const existing = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
  if (existing) return NextResponse.json({ error: "Já existe uma conta com esse e-mail" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const profile = await prisma.profile.create({
    data: { name, email, passwordHash, role, onboarded: true },
  });

  await prisma.teamMember.create({ data: { teamId: team.id, profileId: profile.id } });

  return NextResponse.json({ ok: true });
}
