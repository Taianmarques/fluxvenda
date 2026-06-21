import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  segment: z.string().min(1),
  initialMRR: z.number().positive(),
  teamSize: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const { name, segment, initialMRR, teamSize } = body.data;

    // Remove empresa anterior se existir
    await prisma.virtualCompany.deleteMany({ where: { profileId: userId } });

    const company = await prisma.virtualCompany.create({
      data: {
        profileId: userId,
        name,
        segment,
        currentMRR: initialMRR,
        currentMonth: 1,
      },
    });

    return NextResponse.json({ id: company.id });
  } catch (err) {
    console.error("[simulacao/nova]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
