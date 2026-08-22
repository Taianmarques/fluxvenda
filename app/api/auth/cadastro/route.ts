import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, passwordSchema } from "@/lib/auth/password";
import { generateOtp, otpExpiry } from "@/lib/auth/tokens";
import { sendWhatsAppText, buildOtpMessage, formatPhone } from "@/lib/whatsapp";

const schema = z.object({
  name: z.string().trim().min(2, { message: "Informe seu nome." }),
  email: z.string().email({ message: "E-mail inválido." }).trim().toLowerCase(),
  password: passwordSchema,
  phone: z.string().trim().min(10, { message: "Informe um WhatsApp válido, com DDD." }),
});

// Passo 1 do cadastro: valida os dados, guarda como PendingSignup e manda o
// código de verificação por WhatsApp. A conta só é criada de fato no passo 2
// (/api/auth/cadastro/verificar), depois do código confirmado — assim não entra
// conta com número de WhatsApp errado/de outra pessoa na base.
export async function POST(req: NextRequest) {
  try {
    const body = schema.safeParse(await req.json());
    if (!body.success) {
      return NextResponse.json({ error: body.error.issues[0]?.message ?? "Dados inválidos" }, { status: 400 });
    }
    const { name, email, password, phone } = body.data;

    const existingProfile = await prisma.profile.findUnique({ where: { email }, select: { id: true } });
    if (existingProfile) {
      return NextResponse.json({ error: "Já existe uma conta com esse e-mail." }, { status: 409 });
    }

    // Limpeza oportunista de pendências expiradas — mantém a tabela enxuta sem cron.
    await prisma.pendingSignup.deleteMany({ where: { codeExpiresAt: { lt: new Date() } } });

    const passwordHash = await hashPassword(password);
    const formattedPhone = formatPhone(phone);
    const code = generateOtp();

    // upsert por e-mail: reenviar (clicar "cadastrar" de novo com os mesmos dados)
    // gera um código novo em vez de dar erro de duplicado.
    await prisma.pendingSignup.upsert({
      where: { email },
      create: { name, email, passwordHash, phone: formattedPhone, code, codeExpiresAt: otpExpiry() },
      update: { name, passwordHash, phone: formattedPhone, code, codeExpiresAt: otpExpiry(), attempts: 0 },
    });

    const sent = await sendWhatsAppText(formattedPhone, buildOtpMessage(code));
    if (!sent) {
      return NextResponse.json(
        { error: "Não foi possível enviar o código pro WhatsApp informado. Confira o número e tente novamente." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/cadastro]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
