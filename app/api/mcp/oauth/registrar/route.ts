import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dentroDoLimite, nomeDoCliente, redirectPermitido } from "@/lib/mcp/oauth";

// Registro dinâmico de cliente (RFC 7591): o Claude cria um cliente a cada conexão nova
const schema = z.object({ redirect_uris: z.array(z.string().max(300)).min(1).max(5) });

export async function POST(req: NextRequest) {
  // O tráfego do Claude sai de poucos IPs compartilhados, por isso o limite é alto
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "?";
  if (!dentroDoLimite(`registro:${ip}`, 600, 3_600_000)) return NextResponse.json({ error: "slow_down" }, { status: 429 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "invalid_client_metadata", error_description: "redirect_uris obrigatório" }, { status: 400 });
  if (!body.data.redirect_uris.every(redirectPermitido)) {
    return NextResponse.json({ error: "invalid_redirect_uri", error_description: "Este servidor só aceita conexões do Claude." }, { status: 400 });
  }

  const cliente = await prisma.mcpClient.create({ data: { nome: nomeDoCliente(body.data.redirect_uris), redirectUris: body.data.redirect_uris } });

  // Limpeza: registros que nunca viraram conexão e códigos vencidos
  const ontem = new Date(Date.now() - 86400000);
  prisma.mcpClient.deleteMany({ where: { createdAt: { lt: ontem }, tokens: { none: {} } } }).catch(() => {});
  prisma.mcpAuthCode.deleteMany({ where: { expiresAt: { lt: new Date() } } }).catch(() => {});

  return NextResponse.json({
    client_id: cliente.id, client_id_issued_at: Math.floor(cliente.createdAt.getTime() / 1000), client_name: cliente.nome,
    redirect_uris: cliente.redirectUris, grant_types: ["authorization_code", "refresh_token"], response_types: ["code"], token_endpoint_auth_method: "none",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
