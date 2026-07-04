import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId obrigatório" }, { status: 400 });

  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Agente não encontrado" }, { status: 404 });

  // Cleanup de estados expirados (best-effort)
  prisma.oAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

  const state = crypto.randomUUID();
  await prisma.oAuthState.create({
    data: { state, agentConfigId: agentId, userId, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get("host")}`;
  const redirectUri = `${appUrl}/api/instagram/callback`;

  // Instagram Business Login — escopo correto para a API de Mensagens
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    redirect_uri: redirectUri,
    scope: "instagram_business_basic,instagram_business_manage_messages",
    response_type: "code",
    state,
  });

  return NextResponse.redirect(`https://www.instagram.com/oauth/authorize?${params}`);
}
