import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { getAgentConfigWithRole } from "@/lib/team";
import { ComercioClient } from "../../comercio/ComercioClient";

export default async function ComercioPage({ params }: { params: Promise<{ agentId: string }> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { agentId } = await params;
  const result = await getAgentConfigWithRole(user.id, agentId);
  const config = result?.config;

  if (!config?.active) {
    return (
      <div className="h-full bg-gray-950 text-white p-6 flex items-center justify-center">
        <div className="max-w-md text-center space-y-4">
          <ShoppingCart size={48} className="mx-auto text-blue-400" />
          <h1 className="text-2xl font-bold">Nenhum agente de WhatsApp ativo</h1>
          <p className="text-gray-400">Configure e conecte seu agente de atendimento para usar o comércio.</p>
          <Link href="/ferramentas" className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-5 py-2.5 text-sm font-medium">
            Ir para Ferramentas
          </Link>
        </div>
      </div>
    );
  }

  const [products, orders, banners] = await Promise.all([
    prisma.product.findMany({ where: { agentConfigId: config.id }, orderBy: { createdAt: "asc" } }),
    prisma.order.findMany({
      where: { agentConfigId: config.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { items: true },
    }),
    prisma.storeBanner.findMany({ where: { agentConfigId: config.id }, orderBy: { order: "asc" } }),
  ]);

  return (
    <ComercioClient
      agentId={config.id}
      initialCommerceEnabled={config.commerceEnabled}
      initialCatalogOnly={config.catalogOnly}
      initialAsaasSandbox={config.asaasSandbox}
      initialHasAsaasApiKey={Boolean(config.asaasApiKey)}
      initialAsaasWebhookToken={config.asaasWebhookToken}
      initialInstallmentsEnabled={config.installmentsEnabled}
      initialMaxInstallments={config.maxInstallments}
      initialInterestFreeInstallments={config.interestFreeInstallments}
      initialInstallmentInterestRate={config.installmentInterestRate}
      initialStoreLogo={config.storeLogoBase64 ? `data:${config.storeLogoMimeType ?? "image/png"};base64,${config.storeLogoBase64}` : null}
      initialBanners={banners.map(b => ({
        id: b.id, dataUri: `data:${b.imagemMimeType};base64,${b.imagemBase64}`, active: b.active,
      }))}
      initialProducts={products.map(p => ({
        id: p.id, name: p.name, description: p.description, category: p.category, price: p.price, precoPromocional: p.precoPromocional,
        stock: p.stock, active: p.active, imagemBase64: p.imagemBase64, imagemMimeType: p.imagemMimeType,
      }))}
      initialOrders={orders.map(o => ({
        id: o.id,
        contactName: o.contactName,
        contactNumber: o.contactNumber,
        status: o.status,
        total: o.total,
        asaasInvoiceUrl: o.asaasInvoiceUrl,
        createdAt: o.createdAt.toISOString(),
        items: o.items.map(i => ({ id: i.id, name: i.name, unitPrice: i.unitPrice, quantity: i.quantity })),
      }))}
    />
  );
}
