import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { getInstanceStatus } from "@/lib/whatsapp";
import { LojaClient } from "./LojaClient";
import { ShoppingBag } from "lucide-react";

// Catálogo público — sem sessão; revalida a cada 60s para refletir estoque/preços
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ agentId: string }> }): Promise<Metadata> {
  const { agentId } = await params;
  const config = await prisma.agentConfig.findUnique({
    where: { id: agentId },
    select: { commerceEnabled: true, team: { select: { name: true } } },
  });
  const storeName = config?.commerceEnabled ? (config.team?.name || "Catálogo") : "Catálogo";
  return {
    title: storeName,
    description: `Catálogo de produtos de ${storeName} — monte seu pedido e finalize pelo WhatsApp.`,
    manifest: `/loja/${agentId}/manifest.webmanifest`,
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

function Indisponivel() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
      <div className="text-center space-y-3 max-w-sm">
        <ShoppingBag size={44} className="mx-auto text-gray-300" />
        <p className="font-semibold text-lg">Catálogo indisponível</p>
        <p className="text-sm text-gray-500">Esta loja não está ativa no momento. Se você recebeu este link, fale diretamente com a empresa.</p>
      </div>
    </div>
  );
}

export default async function LojaPage({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const config = await prisma.agentConfig.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      active: true,
      commerceEnabled: true,
      uazapiToken: true,
      team: { select: { name: true } },
    },
  });

  if (!config || !config.commerceEnabled) return <Indisponivel />;

  const [products, instanceStatus] = await Promise.all([
    prisma.product.findMany({
      where: { agentConfigId: config.id, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, description: true, price: true, precoPromocional: true,
        stock: true, imagemBase64: true, imagemMimeType: true,
      },
    }),
    config.uazapiToken
      ? getInstanceStatus(config.uazapiToken).catch(() => null)
      : Promise.resolve(null),
  ]);

  const whatsappNumber = instanceStatus?.ownerNumber?.replace(/\D/g, "") || null;

  return (
    <LojaClient
      agentId={config.id}
      storeName={config.team?.name || "Catálogo"}
      whatsappNumber={whatsappNumber}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        precoPromocional: p.precoPromocional,
        stock: p.stock,
        image: p.imagemBase64 ? `data:${p.imagemMimeType ?? "image/jpeg"};base64,${p.imagemBase64}` : null,
      }))}
    />
  );
}
