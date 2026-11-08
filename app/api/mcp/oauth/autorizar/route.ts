import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { criarCodigo, urlRetorno, validarPedido } from "@/lib/mcp/oauth";

// Resposta da tela /conectar-claude. A sessão é o cookie normal do FluxVenda (sameSite lax: não
// vai em POST vindo de outro site); o pedido é validado de novo aqui.
const schema = z.object({ aprovar: z.boolean(), pedido: z.record(z.string().max(2000)) });

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Faça login novamente." }, { status: 401 });

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

  const pedido = await validarPedido(body.data.pedido);
  if ("erro" in pedido) return NextResponse.json({ error: pedido.erro }, { status: 400 });

  if (!body.data.aprovar) return NextResponse.json({ redirect: urlRetorno(pedido.redirectUri, { error: "access_denied", state: pedido.state }) });
  const code = await criarCodigo(pedido, userId);
  return NextResponse.json({ redirect: urlRetorno(pedido.redirectUri, { code, state: pedido.state }) });
}
