import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({ source: z.string().trim().max(120).optional() });

// Pública — o formulário avisa 1x por sessão do navegador que alguém abriu o link. É o
// denominador do funil (visitas → iniciaram → concluíram), por origem.
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = schema.safeParse(await req.json().catch(() => ({})));
  const form = await prisma.leadForm.findUnique({ where: { slug }, select: { id: true, active: true } });
  if (!form || !form.active) return NextResponse.json({ ok: true });

  await prisma.leadFormView.create({ data: { formId: form.id, source: body.success ? body.data.source || null : null } });
  return NextResponse.json({ ok: true });
}
