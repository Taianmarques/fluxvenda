// Status callback do Twilio — atualiza o PhoneCall quando a chamada encerra.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STATUS_MAP: Record<string, "CONCLUIDA" | "PERDIDA" | "FALHADA"> = {
  completed: "CONCLUIDA",
  "no-answer": "PERDIDA",
  busy: "PERDIDA",
  failed: "FALHADA",
  canceled: "FALHADA",
};

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const callSid = formData.get("CallSid") as string;
  const callStatus = formData.get("CallStatus") as string;
  const durationStr = formData.get("CallDuration") as string;

  const mapped = STATUS_MAP[callStatus];
  if (!mapped || !callSid) return new NextResponse("ok");

  await prisma.phoneCall.updateMany({
    where: { twilioCallSid: callSid },
    data: {
      status: mapped,
      durationSecs: durationStr ? parseInt(durationStr) : undefined,
    },
  });

  return new NextResponse("ok");
}
