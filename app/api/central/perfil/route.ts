import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { perfilSchema } from "@/lib/central-schema";
import { carregarPerfil, podeUsarCentral, salvarPerfil } from "@/lib/central";
import type { PerfilEmpresaDados } from "@/lib/central-shared";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });
  return NextResponse.json({ perfil: await carregarPerfil(userId) });
}

export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await podeUsarCentral(userId))) return NextResponse.json({ error: "Plataforma não contratada" }, { status: 403 });

  const body = perfilSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  await salvarPerfil(userId, body.data as PerfilEmpresaDados);
  return NextResponse.json({ ok: true });
}
