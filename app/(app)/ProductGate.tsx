import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { getEffectiveProducts, hasProduct, type ProductName } from "@/lib/products";

const PRODUCT_INFO: Record<ProductName, { label: string; href: string; description: string }> = {
  CRM: {
    label: "CRM",
    href: "/produtos/crm",
    description: "Agente de WhatsApp com IA, atendimento automático, agendamento, comércio e cobrança.",
  },
  PLATAFORMA: {
    label: "Plataforma de Treinamento",
    href: "/produtos/plataforma",
    description: "Scanner, trilhas, simulação de vendas, objeções, scripts e gamificação da equipe.",
  },
};

// Envolve páginas de um produto específico (CRM ou Plataforma) — se a equipe/perfil não
// contratou esse produto, mostra uma tela de bloqueio com CTA em vez do conteúdo real.
// O item de menu correspondente já aparece com cadeado (ver AppSidebar) — isso protege
// também quem chega direto pela URL.
export async function ProductGate({ product, children }: { product: ProductName; children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const products = await getEffectiveProducts(user.id);
  if (hasProduct(products, product)) return <>{children}</>;

  const info = PRODUCT_INFO[product];
  return (
    <div className="min-h-full bg-gray-950 text-white p-6 flex items-center justify-center">
      <div className="max-w-md text-center space-y-4">
        <Lock size={48} className="mx-auto text-gray-600" />
        <h1 className="text-2xl font-bold">{info.label} não contratado</h1>
        <p className="text-gray-400">{info.description}</p>
        <Link
          href={info.href}
          className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium"
        >
          Conhecer o {info.label}
        </Link>
      </div>
    </div>
  );
}
