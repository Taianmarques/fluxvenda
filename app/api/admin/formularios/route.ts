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

const createSchema = z.object({
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Só letras minúsculas, números e hífen"),
  title: z.string().min(1).max(120),
  headline: z.string().min(1).max(1000),
  questions: z.array(questionSchema).min(1).max(10),
  pixelId: z.string().max(40).optional(),
});

export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const forms = await prisma.leadForm.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  return NextResponse.json({ forms });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });

  const existing = await prisma.leadForm.findUnique({ where: { slug: body.data.slug } });
  if (existing) return NextResponse.json({ error: "Já existe um formulário com esse link" }, { status: 400 });

  const form = await prisma.leadForm.create({ data: body.data });
  return NextResponse.json({ form });
}
