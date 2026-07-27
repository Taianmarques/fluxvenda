import { prisma } from "@/lib/prisma";
import { BrandingClient } from "./BrandingClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminBrandingPage() {
  const settings = await prisma.platformSettings.findUnique({ where: { id: "singleton" } });

  const menuLogo = settings?.menuLogoBase64 && settings.menuLogoMimeType
    ? `data:${settings.menuLogoMimeType};base64,${settings.menuLogoBase64}`
    : null;
  const pwaIconPreview = settings?.pwaIcon512Base64 && settings.pwaIcon512MimeType
    ? `data:${settings.pwaIcon512MimeType};base64,${settings.pwaIcon512Base64}`
    : null;

  return (
    <BrandingClient
      initialMenuLogo={menuLogo}
      initialPwaIconPreview={pwaIconPreview}
      updatedAt={settings?.updatedAt ? settings.updatedAt.toLocaleString("pt-BR") : null}
      updatedByEmail={settings?.updatedByEmail ?? null}
    />
  );
}
