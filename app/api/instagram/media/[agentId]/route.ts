import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { userBelongsToAgentConfig } from "@/lib/team";
import { getRecentInstagramMedia } from "@/lib/instagram";

// Posts/reels recentes da conta conectada — alimenta o seletor "escopar condição a um post"
// na tela de Condições de comentário.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  if (!(await userBelongsToAgentConfig(userId, agentId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const connection = await prisma.instagramConnection.findUnique({
    where: { agentConfigId: agentId },
    select: { pageAccessToken: true },
  });
  if (!connection) return NextResponse.json({ error: "Instagram não conectado" }, { status: 400 });

  try {
    const media = await getRecentInstagramMedia(connection.pageAccessToken);
    return NextResponse.json({ media });
  } catch (err) {
    console.error("[instagram/media] erro ao buscar posts:", err);
    return NextResponse.json({ error: "Não foi possível buscar os posts do Instagram agora." }, { status: 502 });
  }
}
