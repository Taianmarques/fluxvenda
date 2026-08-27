import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM = process.env.EMAIL_FROM ?? "FluxVenda <naoresponda@fluxvenda.com.br>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY não configurado — e-mail não enviado");
    return false;
  }
  const { error } = await resend.emails.send({ from: EMAIL_FROM, to, subject, html });
  if (error) {
    console.error("[email] Erro ao enviar:", error);
    return false;
  }
  return true;
}

export async function sendVerificationEmail(to: string, name: string, token: string): Promise<boolean> {
  const url = `${APP_URL}/verificar-email?token=${token}`;
  return send(
    to,
    "Confirme seu e-mail — FluxVenda",
    `<p>Olá, ${name}!</p>
     <p>Confirme seu e-mail pra ativar sua conta na FluxVenda:</p>
     <p><a href="${url}">${url}</a></p>
     <p>Esse link expira em 24 horas.</p>`
  );
}

// Gestor adicionou a pessoa direto na equipe (sem passar pelo link de convite). Com token
// pede pra definir a primeira senha; sem token (conta já tinha senha) só avisa e manda pro login.
export async function sendTeamMemberAddedEmail(to: string, name: string, teamName: string, token: string | null): Promise<boolean> {
  if (token) {
    const url = `${APP_URL}/redefinir-senha?token=${token}`;
    return send(
      to,
      `Você foi adicionado à equipe ${teamName} — FluxVenda`,
      `<p>Olá, ${name}!</p>
       <p>Você foi adicionado(a) à equipe <strong>${teamName}</strong> no FluxVenda. Defina sua senha pra acessar o CRM:</p>
       <p><a href="${url}">${url}</a></p>
       <p>Esse link expira em 1 hora. Se precisar de um novo, use "esqueci minha senha" na tela de login com este e-mail.</p>`
    );
  }
  const url = `${APP_URL}/sign-in`;
  return send(
    to,
    `Você foi adicionado à equipe ${teamName} — FluxVenda`,
    `<p>Olá, ${name}!</p>
     <p>Você foi adicionado(a) à equipe <strong>${teamName}</strong> no FluxVenda. Faça login normalmente com sua senha de sempre:</p>
     <p><a href="${url}">${url}</a></p>`
  );
}

// Aviso interno pra equipe FluxVenda quando alguém agenda uma demonstração pela aba
// "Recursos" da página de início. DEMO_NOTIFY_EMAIL ausente = no-op (mesmo padrão do resto
// do arquivo) — o agendamento em si não depende de e-mail, só o aviso.
export async function sendDemoBookingNotification(teamName: string, requesterName: string, requesterEmail: string, scheduledAt: Date): Promise<boolean> {
  const to = process.env.DEMO_NOTIFY_EMAIL ?? "";
  if (!to) {
    console.warn("[email] DEMO_NOTIFY_EMAIL não configurado — aviso de demonstração não enviado");
    return false;
  }
  const dataFormatada = scheduledAt.toLocaleString("pt-BR", { dateStyle: "full", timeStyle: "short" });
  return send(
    to,
    `Nova demonstração agendada — ${teamName}`,
    `<p>${requesterName} (${requesterEmail}), da equipe <strong>${teamName}</strong>, agendou uma demonstração do CRM.</p>
     <p><strong>Data/hora:</strong> ${dataFormatada}</p>`
  );
}

export async function sendPasswordResetEmail(to: string, name: string, token: string, isMigration = false): Promise<boolean> {
  const url = `${APP_URL}/redefinir-senha?token=${token}`;
  const intro = isMigration
    ? `<p>Atualizamos o sistema de login da FluxVenda — você precisa definir uma nova senha pra continuar acessando sua conta.</p>`
    : `<p>Recebemos um pedido pra redefinir a senha da sua conta.</p>`;
  return send(
    to,
    isMigration ? "Defina sua nova senha — FluxVenda" : "Redefinir senha — FluxVenda",
    `<p>Olá, ${name}!</p>
     ${intro}
     <p><a href="${url}">${url}</a></p>
     <p>Esse link expira em 1 hora. Se não foi você, pode ignorar este e-mail.</p>`
  );
}
