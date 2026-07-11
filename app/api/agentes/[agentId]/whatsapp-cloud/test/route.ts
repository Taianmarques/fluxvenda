import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getAgentConfigAsManager } from "@/lib/team";
import { getPhoneNumberInfo } from "@/lib/whatsapp-cloud";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(user.id, agentId);
  if (!config) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!config.cloudApiPhoneNumberId || !config.cloudApiAccessToken) {
    return NextResponse.json({ error: "Preencha o Phone Number ID e o Access Token antes de testar." }, { status: 400 });
  }

  try {
    const info = await getPhoneNumberInfo(config.cloudApiPhoneNumberId, config.cloudApiAccessToken);
    await prisma.agentConfig.update({
      where: { id: agentId },
      data: { cloudApiPhoneNumber: info.displayPhoneNumber, cloudApiVerifiedName: info.verifiedName },
    });
    return NextResponse.json(info);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Não foi possível validar as credenciais." }, { status: 502 });
  }
}
