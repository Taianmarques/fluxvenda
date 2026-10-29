import { currentUser } from "@/lib/auth/server";
import { notFound, redirect } from "next/navigation";
import { ProductGate } from "../../ProductGate";
import { carregarFerramentaTela } from "@/lib/central-dados";
import { FerramentaClient } from "./FerramentaClient";

// Página única de todas as ferramentas da Central — a configuração vem do banco pelo slug.
// ?usar=<id> reabre um prompt do histórico/favoritos com os mesmos dados no formulário.
export default async function FerramentaPage({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ usar?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const [{ slug }, { usar }] = await Promise.all([params, searchParams]);

  return (
    <ProductGate product="PLATAFORMA">
      <FerramentaConteudo userId={user.id} slug={slug} reusarId={typeof usar === "string" ? usar : undefined} />
    </ProductGate>
  );
}

async function FerramentaConteudo({ userId, slug, reusarId }: { userId: string; slug: string; reusarId?: string }) {
  const dados = await carregarFerramentaTela(userId, slug, reusarId);
  if (!dados) notFound();
  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <FerramentaClient dados={dados} modo="pagina" />
      </div>
    </div>
  );
}
