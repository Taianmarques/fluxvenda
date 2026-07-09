// Serve o áudio MP3 gerado pelo ElevenLabs para o Twilio fazer <Play>.
// URL pública, sem auth — acessada diretamente pelo Twilio durante a chamada.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string; turnId: string }> }
) {
  const { turnId } = await params;

  const turn = await prisma.phoneCallTurn.findUnique({
    where: { id: turnId },
    select: { audioData: true },
  });

  if (!turn?.audioData) {
    return new NextResponse("Audio not found", { status: 404 });
  }

  const buffer = Buffer.from(turn.audioData, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=3600",
    },
  });
}
