import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
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

  const updated = await prisma.agentConfig.update({
    where: { id: agentId },
    data: {
      phoneEnabled: Boolean(body.phoneEnabled),
      twilioAccountSid: body.twilioAccountSid || null,
      twilioAuthToken: body.twilioAuthToken || null,
      twilioPhoneNumber: body.twilioPhoneNumber || null,
      elevenlabsApiKey: body.elevenlabsApiKey || null,
      elevenlabsVoiceId: body.elevenlabsVoiceId || null,
      phoneCallPrompt: body.phoneCallPrompt ?? "",
      whatsappVoiceEnabled: Boolean(body.whatsappVoiceEnabled),
    },
    select: {
      id: true,
      phoneEnabled: true,
      twilioPhoneNumber: true,
      elevenlabsVoiceId: true,
      phoneCallPrompt: true,
    },
  });

  return NextResponse.json(updated);
}
