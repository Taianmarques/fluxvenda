import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const access = await getAgentConfigAsManager(user.id, agentId);
  if (!access) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const provider = body.whatsappProvider === "CLOUD_API" ? "CLOUD_API" : "UAZAPI";

  // Gera o verify token na primeira vez que a API oficial é configurada — usado pelo
  // handshake GET que a Meta chama ao registrar o webhook no App Dashboard.
  const needsVerifyToken = provider === "CLOUD_API" && !access.cloudApiVerifyToken;

  const updated = await prisma.agentConfig.update({
    where: { id: agentId },
    data: {
      whatsappProvider: provider,
      cloudApiPhoneNumberId: body.cloudApiPhoneNumberId || null,
      cloudApiWabaId: body.cloudApiWabaId || null,
      cloudApiAccessToken: body.cloudApiAccessToken || null,
      ...(needsVerifyToken && { cloudApiVerifyToken: randomBytes(24).toString("hex") }),
    },
    select: {
      id: true,
      whatsappProvider: true,
      cloudApiPhoneNumberId: true,
      cloudApiWabaId: true,
      cloudApiVerifyToken: true,
      cloudApiPhoneNumber: true,
      cloudApiVerifiedName: true,
    },
  });

  return NextResponse.json(updated);
}
