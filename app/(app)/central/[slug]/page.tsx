import { currentUser } from "@/lib/auth/server";
import { notFound, redirect } from "next/navigation";
import { ProductGate } from "../../ProductGate";
import { carregarFerramentaTela } from "@/lib/central-dados";
import { FerramentaClient } from "./FerramentaClient";

export default async function FerramentaPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { slug } = await params;

  return (
    <ProductGate product="PLATAFORMA">
      <FerramentaConteudo userId={user.id} slug={slug} />
    </ProductGate>
  );
}

async function FerramentaConteudo({ userId, slug }: { userId: string; slug: string }) {
  const dados = await carregarFerramentaTela(userId, slug);
  if (!dados) notFound();
  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <FerramentaClient dados={dados} modo="pagina" />
      </div>
    </div>
  );
}
