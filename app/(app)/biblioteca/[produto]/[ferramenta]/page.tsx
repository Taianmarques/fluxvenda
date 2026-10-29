import { currentUser } from "@/lib/auth/server";
import { notFound, redirect } from "next/navigation";
import { carregarFerramentaTela } from "@/lib/central-dados";
import { temAcessoAoProduto } from "@/lib/infoprodutos";
import { FerramentaClient } from "./FerramentaClient";

// Página única de todas as ferramentas de todos os produtos — a configuração vem do banco pelo
// slug. Sem acesso ao produto, volta pra página do produto (que mostra a apresentação dele).
// ?usar=<id> reabre um prompt do histórico/favoritos com os mesmos dados no formulário.
export default async function FerramentaPage({ params, searchParams }: {
  params: Promise<{ produto: string; ferramenta: string }>;
  searchParams: Promise<{ usar?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const [{ produto, ferramenta }, { usar }] = await Promise.all([params, searchParams]);

  const dados = await carregarFerramentaTela(user.id, ferramenta, typeof usar === "string" ? usar : undefined);
  if (!dados) notFound();
  if (!(await temAcessoAoProduto(user.id, dados.ferramenta.produto.id))) redirect(`/biblioteca/${dados.ferramenta.produto.slug}`);
  // URL com o produto errado (ex: link antigo) → endereço certo
  if (dados.ferramenta.produto.slug !== produto) {
    redirect(`/biblioteca/${dados.ferramenta.produto.slug}/${ferramenta}${usar ? `?usar=${encodeURIComponent(usar)}` : ""}`);
  }

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <FerramentaClient dados={dados} modo="pagina" />
      </div>
    </div>
  );
}
