import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const questionSchema = z.object({
  key: z.string().min(1).max(40),
  label: z.string().min(1).max(200),
  type: z.enum(["TEXTO", "WHATSAPP", "EMAIL", "NUMERO"]),
});

const updateSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen").optional(),
  title: z.string().min(1).max(120).optional(),
  headline: z.string().min(1).max(1000).optional(),
  questions: z.array(questionSchema).min(1).max(10).optional(),
  pixelId: z.string().max(40).nullable().optional(),
  active: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const form = await prisma.leadForm.findUnique({
    where: { id },
    include: { submissions: { orderBy: { createdAt: "desc" }, take: 200 } },
  });
  if (!form) return NextResponse.json({ error: "Formulário não encontrado" }, { status: 404 });
  return NextResponse.json({ form });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = updateSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  if (body.data.slug) {
    const clash = await prisma.leadForm.findFirst({ where: { slug: body.data.slug, NOT: { id } } });
    if (clash) return NextResponse.json({ error: "Já existe um formulário com esse link" }, { status: 400 });
  }

  const form = await prisma.leadForm.update({ where: { id }, data: body.data });
  return NextResponse.json({ form });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.leadForm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
