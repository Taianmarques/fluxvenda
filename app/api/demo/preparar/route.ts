import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lerCampos } from "@/lib/central";
import { montarPromptFinal } from "@/lib/central-prompt";
import { validarEntradas } from "@/lib/central-entradas";

// Demonstração gratuita da landing: monta o prompt de uma ferramenta marcada como demoPublica,
// sem login. Mesmo montador das ferramentas da biblioteca (lib/central-prompt.ts) — só sem perfil
// da empresa e sem histórico. Não chama IA. Nenhuma outra ferramenta é acessível por aqui.
//
// Proteção contra abuso: limite por IP em memória (o app roda num processo só no PM2).
const LIMITE = 20;
const JANELA_MS = 60 * 60 * 1000;
const usos = new Map<string, number[]>();

function ipDe(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "desconhecido";
}

function dentroDoLimite(ip: string) {
  const agora = Date.now();
  const recentes = (usos.get(ip) ?? []).filter(t => agora - t < JANELA_MS);
  if (recentes.length >= LIMITE) { usos.set(ip, recentes); return false; }
  recentes.push(agora);
  usos.set(ip, recentes);
  // Evita o mapa crescer sem fim: de vez em quando descarta IPs sem uso recente
  if (usos.size > 5000) for (const [k, v] of usos) if (!v.some(t => agora - t < JANELA_MS)) usos.delete(k);
  return true;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!slug) return NextResponse.json({ error: "Ferramenta não informada" }, { status: 400 });

  const ferramenta = await prisma.centralFerramenta.findUnique({
    where: { slug },
    select: { demoPublica: true, prompt: true, instrucoes: true, formatoResposta: true, campos: true, modulo: { select: { produto: { select: { regrasQualidade: true } } } } },
  });
  if (!ferramenta?.demoPublica) return NextResponse.json({ error: "Ferramenta não encontrada" }, { status: 404 });

  const campos = lerCampos(ferramenta.campos);
  const v = validarEntradas(campos, body?.entradas);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  if (!dentroDoLimite(ipDe(req))) {
    return NextResponse.json({ error: "Você já testou bastante por agora. Tente de novo em uma hora — ou tenha acesso às 100 ferramentas." }, { status: 429 });
  }

  const prompt = montarPromptFinal({
    prompt: ferramenta.prompt, instrucoes: ferramenta.instrucoes, formatoResposta: ferramenta.formatoResposta,
    entradas: v.entradas, perfil: null, campos, regrasQualidade: ferramenta.modulo.produto.regrasQualidade,
  });
  return NextResponse.json({ prompt });
}
