import { prisma } from "@/lib/prisma";
import { RedefinirSenhaForm } from "./RedefinirSenhaForm";
import { TemaAuth } from "../TemaAuth";

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; tema?: string }>;
}) {
  const { token, tema } = await searchParams;
  // Conta só com produtos do Vendas IA (sem CRM/Plataforma) vê o visual do Vendas IA
  const conta = token
    ? await prisma.profile.findFirst({ where: { passwordResetToken: token }, select: { productsOwned: true } })
    : null;
  const vendasIA = tema === "vi" || (!!conta && conta.productsOwned.length === 0);
  return (
    <TemaAuth vendasIA={vendasIA}>
      <RedefinirSenhaForm token={token ?? ""} vendasIA={vendasIA} />
    </TemaAuth>
  );
}
