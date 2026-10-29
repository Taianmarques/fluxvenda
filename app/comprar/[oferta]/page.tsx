import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { carregarOfertaCheckout } from "@/lib/compras";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

// Checkout público dos infoprodutos. Logado: o acesso vai pra conta dele e o que ele já tem não é
// oferecido de novo. Preços aqui são só exibição — a cobrança é recalculada no servidor.
export default async function ComprarPage({ params }: { params: Promise<{ oferta: string }> }) {
  const { oferta: slug } = await params;
  const user = await currentUser().catch(() => null);
  const oferta = await carregarOfertaCheckout(slug, user?.id ?? null);
  if (!oferta) notFound();

  const perfil = user ? await prisma.profile.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } }) : null;

  return (
    <CheckoutClient
      ofertaSlug={oferta.slug}
      principais={oferta.principais.map(i => ({ produtoId: i.produtoId, precoCentavos: i.precoCentavos, jaTem: i.jaTem, ...i.produto }))}
      bumps={oferta.bumps.map(i => ({ produtoId: i.produtoId, precoCentavos: i.precoCentavos, chamada: i.chamada, ...i.produto }))}
      logado={perfil ? { nome: perfil.name, email: perfil.email, telefone: perfil.phone ?? "" } : null}
    />
  );
}
