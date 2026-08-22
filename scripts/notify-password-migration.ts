// Dispara o e-mail de "defina sua nova senha" pra todo Profile que veio do Clerk
// e ainda não tem senha própria. Rodar manualmente (npx tsx scripts/notify-password-migration.ts)
// depois de confirmar que RESEND_API_KEY está configurado — não roda sozinho no
// deploy porque é um disparo de e-mail em massa pra clientes reais.
import { prisma } from "../lib/prisma";
import { generateToken, passwordResetExpiry } from "../lib/auth/tokens";
import { sendPasswordResetEmail } from "../lib/email";

async function main() {
  const profiles = await prisma.profile.findMany({
    where: { passwordHash: null },
    select: { id: true, email: true, name: true },
  });

  console.log(`Encontrados ${profiles.length} perfis sem senha própria.`);

  let sent = 0;
  for (const profile of profiles) {
    const passwordResetToken = generateToken();
    await prisma.profile.update({
      where: { id: profile.id },
      data: { passwordResetToken, passwordResetExpiresAt: passwordResetExpiry() },
    });
    const ok = await sendPasswordResetEmail(profile.email, profile.name, passwordResetToken, true);
    if (ok) sent++;
    console.log(`${ok ? "OK" : "FALHOU"} — ${profile.email}`);
  }

  console.log(`Enviados ${sent}/${profiles.length}.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
