import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ferramentaSchema } from "@/lib/central-schema";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const [modulos, ferramentas] = await Promise.all([
    prisma.centralModulo.findMany({ orderBy: { numero: "asc" } }),
    prisma.centralFerramenta.findMany({ orderBy: [{ ordem: "asc" }, { nome: "asc" }] }),
  ]);
  return NextResponse.json({ modulos, ferramentas });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const body = ferramentaSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  if (!(await prisma.centralModulo.findUnique({ where: { id: body.data.moduloId } }))) {
    return NextResponse.json({ error: "Módulo não encontrado" }, { status: 400 });
  }
  if (await prisma.centralFerramenta.findUnique({ where: { slug: body.data.slug } })) {
    return NextResponse.json({ error: "Já existe uma ferramenta com esse identificador" }, { status: 400 });
  }
  const ferramenta = await prisma.centralFerramenta.create({ data: body.data });
  return NextResponse.json({ ferramenta });
}
