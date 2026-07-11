import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { getAgentConfigAsManager } from "@/lib/team";
import { listMessageTemplates } from "@/lib/whatsapp-cloud";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(user.id, agentId);
  if (!config) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!config.cloudApiWabaId || !config.cloudApiAccessToken) {
    return NextResponse.json({ error: "Conecte a API oficial antes de listar templates." }, { status: 400 });
  }

  try {
    const templates = await listMessageTemplates(config.cloudApiWabaId, config.cloudApiAccessToken);
    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Não foi possível buscar os templates." }, { status: 502 });
  }
}
