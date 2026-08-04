import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/lib/auth-client";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "SF Madeiras",
  description: "CRM e agente de IA da SF Madeiras",
  appleWebApp: { capable: true, title: "SF Madeiras", statusBarStyle: "black-translucent" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <html lang="pt-BR" className={`h-full antialiased ${inter.variable}`}>
        <body className="min-h-full">{children}</body>
      </html>
    </AuthProvider>
  );
}
