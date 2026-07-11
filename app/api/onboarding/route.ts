import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendWhatsAppText, buildWelcomeMessage } from "@/lib/whatsapp";

const schema = z.object({
  role: z.enum(["VENDEDOR", "FUNCIONARIO", "GESTOR"]),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
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

    const { role, name, email, phone, companyName, businessModel, segment, subsegment, teamSize, products, inviteCode } = body.data;

    // Cria ou atualiza o perfil
    await prisma.profile.upsert({
      where: { id: userId },
      update: { role, segment, onboarded: true, ...(name && { name }), ...(email && { email }), ...(phone && { phone }) },
      create: {
        id: userId,
        email: email ?? `${userId}@placeholder.com`,
        name: name ?? "Usuário",
        role,
        segment,
        onboarded: true,
        ...(phone && { phone }),
      },
    });

    let teamJoined = false;

    // GESTOR — cria a equipe
    if (role === "GESTOR") {
      const existing = await prisma.team.findUnique({ where: { managerId: userId } });
      if (!existing) {
        // Produtos contratados — se não vier nada (fluxo antigo/API direta), assume os dois
        const productsOwned: ("CRM" | "PLATAFORMA")[] = products && products.length > 0 ? products : ["CRM", "PLATAFORMA"];
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
        }
        teamJoined = true;
      }
    }

    // Atualiza metadados do Clerk em background (não bloqueia)
    updateClerkMetadata(userId, role).catch(() => {});

    // Dispara WhatsApp de boas-vindas em background
    if (phone) {
      const displayName = name ?? "Usuário";
      const message = buildWelcomeMessage(displayName, role, companyName);
      sendWhatsAppText(phone, message).catch(() => {});
    }

    return NextResponse.json({ ok: true, teamJoined });
  } catch (err) {
    console.error("[onboarding]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

async function updateClerkMetadata(userId: string, role: string) {
  const { clerkClient } = await import("@clerk/nextjs/server");
  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { onboarded: true, role },
  });
}
