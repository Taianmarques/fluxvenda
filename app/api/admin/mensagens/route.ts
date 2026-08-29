import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

async function assertAdmin(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { role: true } });
  return profile?.role === "ADMIN";
}

// Lista os templates de mensagem automática (boas-vindas, confirmação de demo) — sempre 4
// linhas fixas, semeadas pela migration; não dá pra criar/excluir, só editar o texto.
export async function GET() {
  const { userId } = await auth();
  if (!userId || !(await assertAdmin(userId))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const templates = await prisma.messageTemplate.findMany({ orderBy: { id: "asc" } });
  return NextResponse.json({ templates });
}
