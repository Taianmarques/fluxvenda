import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

const schema = z.object({
  times: z.array(z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/)).max(20),
});

// Horários fixos (seg-sex) oferecidos na aba Recursos > Agendar uma demonstração.
export async function PUT(req: NextRequest) {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const times = [...new Set(body.data.times)].sort();

  const user = await currentUser();
  const updated = await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { demoAvailableTimes: times, updatedByEmail: user?.emailAddresses[0]?.emailAddress },
    create: { id: "singleton", demoAvailableTimes: times, updatedByEmail: user?.emailAddresses[0]?.emailAddress },
  });

  return NextResponse.json({ times: updated.demoAvailableTimes });
}
