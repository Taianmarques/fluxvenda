import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigWithRole } from "@/lib/team";
import { getChatProfilePicture } from "@/lib/whatsapp";

// Proxy pra foto de perfil real do WhatsApp do contato — redireciona pra URL assinada da CDN
// (nunca guardamos essa URL, ela expira). Instagram e agentes sem UazAPI não têm foto.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ agentId: string; id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new NextResponse(null, { status: 401 });

  const { agentId, id } = await params;
  const result = await getAgentConfigWithRole(userId, agentId);
  if (!result) return new NextResponse(null, { status: 404 });
  const { config, isManager } = result;

  const conversation = await prisma.conversation.findFirst({ where: { id, agentConfigId: config.id } });
  if (!conversation) return new NextResponse(null, { status: 404 });
  if (!isManager && conversation.assignedToId && conversation.assignedToId !== userId) {
    return new NextResponse(null, { status: 404 });
  }
  if (conversation.contactNumber.startsWith("ig_") || !config.uazapiToken) {
    return new NextResponse(null, { status: 404 });
  }

  const picUrl = await getChatProfilePicture(config.uazapiToken, `${conversation.contactNumber}@s.whatsapp.net`);
  if (!picUrl) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(picUrl, {
    headers: { "Cache-Control": "private, max-age=3600" },
  });
}
