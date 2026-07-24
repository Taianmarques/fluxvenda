import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ptBR } from "@clerk/localizations";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Plataforma B2B",
  description: "Plataforma educacional de vendas B2B",
  appleWebApp: { capable: true, title: "FluxVenda", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={ptBR}>
      <html lang="pt-BR" className={`h-full antialiased ${inter.variable}`}>
        <body className="min-h-full">{children}</body>
      </html>
    </ClerkProvider>
  );
}
