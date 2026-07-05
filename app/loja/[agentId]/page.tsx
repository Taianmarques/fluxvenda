import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { getInstanceStatus } from "@/lib/whatsapp";
import { LojaClient } from "./LojaClient";
import { ShoppingBag } from "lucide-react";

// Catálogo público — sem sessão; revalida a cada 60s para refletir estoque/preços
export const revalidate = 60;

// O segmento aceita o slug amigável (/loja/nome-da-loja) ou o id do agente (links antigos)
async function findStore(idOrSlug: string) {
  return prisma.agentConfig.findFirst({
    where: { OR: [{ storeSlug: idOrSlug }, { id: idOrSlug }] },
    select: {
      id: true,
      active: true,
      commerceEnabled: true,
      uazapiToken: true,
      storeLogoBase64: true,
      storeLogoMimeType: true,
      storeSlug: true,
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFee: true,
      deliveryFreeAbove: true,
      deliveryArea: true,
      team: { select: { name: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: Promise<{ agentId: string }> }): Promise<Metadata> {
  const { agentId } = await params;
  const config = await findStore(agentId);
  const storeName = config?.commerceEnabled ? (config.team?.name || "Catálogo") : "Catálogo";
  const hasLogo = Boolean(config?.commerceEnabled && config.storeLogoBase64);
  return {
    title: storeName,
    description: `Catálogo de produtos de ${storeName} — monte seu pedido e finalize pelo WhatsApp.`,
    manifest: `/loja/${agentId}/manifest.webmanifest`,
    ...(hasLogo ? { icons: { icon: `/loja/${agentId}/logo`, apple: `/loja/${agentId}/logo` } } : {}),
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

  const config = await findStore(agentId);

  if (!config || !config.commerceEnabled) return <Indisponivel />;

  const [products, banners, instanceStatus] = await Promise.all([
    prisma.product.findMany({
      where: { agentConfigId: config.id, active: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true, name: true, description: true, category: true, price: true, precoPromocional: true,
        stock: true, imagemBase64: true, imagemMimeType: true,
      },
    }),
    prisma.storeBanner.findMany({
      where: { agentConfigId: config.id, active: true },
      orderBy: { order: "asc" },
      select: { id: true, imagemBase64: true, imagemMimeType: true },
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
      logo={config.storeLogoBase64 ? `data:${config.storeLogoMimeType ?? "image/png"};base64,${config.storeLogoBase64}` : null}
      banners={banners.map((b) => `data:${b.imagemMimeType};base64,${b.imagemBase64}`)}
      delivery={{
        deliveryEnabled: config.deliveryEnabled,
        pickupEnabled: config.pickupEnabled,
        deliveryFee: config.deliveryFee,
        deliveryFreeAbove: config.deliveryFreeAbove,
        deliveryArea: config.deliveryArea,
      }}
      products={products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        price: p.price,
        precoPromocional: p.precoPromocional,
        stock: p.stock,
        image: p.imagemBase64 ? `data:${p.imagemMimeType ?? "image/jpeg"};base64,${p.imagemBase64}` : null,
      }))}
    />
  );
}
