import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirAdmin } from "@/lib/admin-auth";

const schema = z.object({
  nome: z.string().trim().min(2, "Dê um nome à oferta").max(120),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Endereço: só letras minúsculas, números e hífen"),
});

// Cria uma oferta (inativa e vazia) — produtos, papéis e preços são definidos no editor
export async function POST(req: NextRequest) {
  if (!(await exigirAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
  if (await prisma.oferta.findUnique({ where: { slug: body.data.slug } })) return NextResponse.json({ error: "Já existe uma oferta com esse endereço" }, { status: 400 });
  const oferta = await prisma.oferta.create({ data: body.data });
  return NextResponse.json({ oferta });
}
