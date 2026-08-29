import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getManagedTeam } from "@/lib/team";
import { maybeAlertHotLead } from "@/lib/hot-lead-alert";

// Disparado (fire-and-forget) quando o gestor abre o modal "Ver planos" dentro do CRM — um
// dos sinais de interesse forte que avisa o comercial durante o teste grátis (ver
// lib/hot-lead-alert.ts). Não rastreia a página pública de marketing, só esse modal logado.
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: true }); // silencioso — não é crítico

  const team = await getManagedTeam(userId);
  if (team) maybeAlertHotLead(team.id, "Abriu a tela de planos durante o teste grátis.").catch(() => {});

  return NextResponse.json({ ok: true });
}
