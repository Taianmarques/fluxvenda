import { SignInForm } from "./SignInForm";
import { TemaAuth } from "../TemaAuth";
import { caminhoInterno, ehRotaVendasIA } from "@/lib/vendas-ia";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string; verified?: string; tema?: string }>;
}) {
  const { redirect_url, verified, tema } = await searchParams;
  // Volta pra tela que a pessoa tentou abrir (o proxy manda a URL completa; só o caminho vale)
  const destino = caminhoInterno(redirect_url);
  // Visual do Vendas IA: links da compra (?tema=vi) ou quem tentou abrir uma tela do Vendas IA
  const vendasIA = tema === "vi" || (!!destino && ehRotaVendasIA(destino));
  const redirectUrl = destino ?? (vendasIA ? "/inicio" : "/dashboard");
  const initialNotice = verified === "1" ? "E-mail confirmado! Já pode entrar." : undefined;

  return (
    <TemaAuth vendasIA={vendasIA}>
      <SignInForm redirectUrl={redirectUrl} initialNotice={initialNotice} vendasIA={vendasIA} />
    </TemaAuth>
  );
}
