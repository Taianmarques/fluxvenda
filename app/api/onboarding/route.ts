import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { updateSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendWhatsAppText, getWelcomeMessage } from "@/lib/whatsapp";
import { maybeAlertHotLead } from "@/lib/hot-lead-alert";

const schema = z.object({
  role: z.enum(["VENDEDOR", "FUNCIONARIO", "GESTOR"]),
  // gestor
  companyName:   z.string().optional(),
  businessModel: z.enum(["B2B", "B2C"]).optional(),
  segment:       z.string().optional(),
  subsegment:    z.string().optional(),
  teamSize:      z.string().optional(),
  products:      z.array(z.enum(["CRM", "PLATAFORMA"])).optional(), // produtos contratados (só gestor)
  // vendedor
  inviteCode: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = schema.safeParse(await req.json());
    if (!body.success) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });

    const { role, companyName, businessModel, segment, subsegment, teamSize, products, inviteCode } = body.data;

    // Profile já existe desde o cadastro (nome/e-mail/telefone verificado por WhatsApp
    // definidos lá) — onboarding só completa role/segmento e marca como onboarded.
    const profile = await prisma.profile.update({
      where: { id: userId },
      data: { role, segment, onboarded: true },
    });
    const name = profile.name;

    let teamJoined = false;

    // Produtos contratados — se não vier nada (fluxo antigo/API direta), assume os dois.
    // Usado tanto pra criar a equipe (só GESTOR) quanto pra escolher a boas-vindas certa
    // (WELCOME_GESTOR_CRM ou WELCOME_GESTOR_PLATAFORMA) mais abaixo.
    const productsOwned: ("CRM" | "PLATAFORMA")[] = products && products.length > 0 ? products : ["CRM", "PLATAFORMA"];

    // GESTOR — cria a equipe
    if (role === "GESTOR") {
      const existing = await prisma.team.findUnique({ where: { managerId: userId } });
      if (!existing) {
        // Cadastro self-serve com CRM ainda não tem cobrança automática — libera 7 dias de
        // teste grátis automaticamente; o super admin remove o limite ao confirmar o pagamento
        const crmTrialEndsAt = productsOwned.includes("CRM") ? new Date(Date.now() + 7 * 86_400_000) : null;

        await prisma.team.create({
          data: {
            managerId:    userId,
            name:         companyName ?? `Equipe de ${name ?? "Gestor"}`,
            businessModel: businessModel ?? "B2B",
            segment:      segment ?? "",
            subsegment:   subsegment ?? "",
            size:         teamSize ?? "1-10",
            productsOwned,
            crmTrialEndsAt,
          },
        });
      }
    }

    // VENDEDOR ou FUNCIONARIO com código de convite — tenta entrar na equipe
    if ((role === "VENDEDOR" || role === "FUNCIONARIO") && inviteCode) {
      const team = await prisma.team.findUnique({ where: { invite: inviteCode } });
      if (team) {
        const alreadyMember = await prisma.teamMember.findFirst({
          where: { profileId: userId },
        });
        if (!alreadyMember) {
          await prisma.teamMember.create({
            data: { teamId: team.id, profileId: userId },
          });
          prisma.teamMember.count({ where: { teamId: team.id } }).then(count => {
            if (count >= 3) maybeAlertHotLead(team.id, `Adicionou ${count} pessoas na equipe durante o teste grátis.`);
          }).catch(() => {});
        }
        teamJoined = true;
      }
    }

    // Reemite o cookie de sessão já com role/onboarded atualizados — sem isso o
    // usuário continuaria "preso" nas regras da sessão antiga até logar de novo.
    await updateSession({ role, onboarded: true });

    // Dispara WhatsApp de boas-vindas em background — telefone já verificado no cadastro
    if (profile.phone) {
      getWelcomeMessage(name, role, companyName, productsOwned)
        .then(message => sendWhatsAppText(profile.phone!, message))
        .catch(() => {});
    }

    return NextResponse.json({ ok: true, teamJoined });
  } catch (err) {
    console.error("[onboarding]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
