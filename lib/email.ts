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
