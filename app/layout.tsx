import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const SITE_NAME = "FluxVenda";
const SITE_DESCRIPTION = "CRM e agente de IA para WhatsApp e Instagram — atende, agenda e vende por você.";

// metadataBase dá URL absoluta pras imagens de pré-visualização (WhatsApp/Facebook/LinkedIn não
// aceitam caminho relativo em og:image). Páginas públicas de cliente (loja, agendar, agenda)
// sobrescrevem title/description com o nome da empresa dele, de propósito.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fluxvenda.com.br"),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: "pt_BR",
    images: [{ url: "/iconefluxvenda.png", width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: { card: "summary", title: SITE_NAME, description: SITE_DESCRIPTION, images: ["/iconefluxvenda.png"] },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`h-full antialiased ${inter.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
