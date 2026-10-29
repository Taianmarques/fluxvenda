import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { ferramentaSchema } from "@/lib/central-schema";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Importação em lote (JSON): lista de ferramentas no mesmo formato do editor. Atualiza as que já
// existem pelo identificador (slug) e cria as novas. Valida tudo antes de gravar — ou entra o
// lote inteiro, ou nada, com o erro apontando qual item está errado.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const lista: unknown[] = Array.isArray(raw) ? raw : Array.isArray(raw?.ferramentas) ? raw.ferramentas : [];
  if (lista.length === 0) return NextResponse.json({ error: "Envie uma lista de ferramentas" }, { status: 400 });
  if (lista.length > 300) return NextResponse.json({ error: "Máximo de 300 ferramentas por importação" }, { status: 400 });

  const modulos = new Set((await prisma.centralModulo.findMany({ select: { id: true } })).map(m => m.id));
  const validas = [];
  for (let i = 0; i < lista.length; i++) {
    const r = ferramentaSchema.safeParse(lista[i]);
    const nome = (lista[i] as { slug?: string; nome?: string })?.slug ?? (lista[i] as { nome?: string })?.nome ?? `#${i + 1}`;
    if (!r.success) return NextResponse.json({ error: `Item ${i + 1} (${nome}): ${r.error.issues[0]?.path.join(".")} — ${r.error.issues[0]?.message}` }, { status: 400 });
    if (!modulos.has(r.data.moduloId)) return NextResponse.json({ error: `Item ${i + 1} (${nome}): módulo "${r.data.moduloId}" não existe` }, { status: 400 });
    validas.push(r.data);
  }
  if (new Set(validas.map(v => v.slug)).size !== validas.length) {
    return NextResponse.json({ error: "Há identificadores (slug) repetidos no arquivo" }, { status: 400 });
  }

  const existentes = new Set((await prisma.centralFerramenta.findMany({ where: { slug: { in: validas.map(v => v.slug) } }, select: { slug: true } })).map(f => f.slug));
  await prisma.$transaction(validas.map(v => prisma.centralFerramenta.upsert({ where: { slug: v.slug }, create: v, update: v })));
  return NextResponse.json({ criadas: validas.filter(v => !existentes.has(v.slug)).length, atualizadas: validas.filter(v => existentes.has(v.slug)).length });
}
