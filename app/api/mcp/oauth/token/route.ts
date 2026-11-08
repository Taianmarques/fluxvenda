import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renovarToken, resourceValido, trocarCodigo } from "@/lib/mcp/oauth";

const SEM_CACHE = { "Cache-Control": "no-store", Pragma: "no-cache" };
const erro = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: SEM_CACHE });

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return erro("invalid_request");
  const campo = (nome: string) => {
    const v = form.get(nome);
    return typeof v === "string" && v ? v : undefined;
  };

  const clientId = campo("client_id");
  if (!clientId || !(await prisma.mcpClient.findUnique({ where: { id: clientId }, select: { id: true } }))) return erro("invalid_client", 401);
  if (!resourceValido(campo("resource"))) return erro("invalid_target");

  const tipo = campo("grant_type");
  if (tipo === "authorization_code") {
    const code = campo("code"), redirectUri = campo("redirect_uri"), verifier = campo("code_verifier");
    if (!code || !redirectUri || !verifier) return erro("invalid_request");
    const tokens = await trocarCodigo({ code, clientId, redirectUri, verifier });
    return tokens ? NextResponse.json(tokens, { headers: SEM_CACHE }) : erro("invalid_grant");
  }
  if (tipo === "refresh_token") {
    const refresh = campo("refresh_token");
    if (!refresh) return erro("invalid_request");
    const tokens = await renovarToken(refresh, clientId);
    return tokens ? NextResponse.json(tokens, { headers: SEM_CACHE }) : erro("invalid_grant");
  }
  return erro("unsupported_grant_type");
}
