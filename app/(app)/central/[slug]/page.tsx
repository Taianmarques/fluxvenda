import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Link antigo de ferramenta (/central/<slug>) → endereço novo dentro do produto dela
export default async function FerramentaAntiga({ params, searchParams }: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ usar?: string }>;
}) {
  const [{ slug }, { usar }] = await Promise.all([params, searchParams]);
  const f = await prisma.centralFerramenta.findUnique({ where: { slug }, select: { modulo: { select: { produto: { select: { slug: true } } } } } });
  if (!f) notFound();
  redirect(`/biblioteca/${f.modulo.produto.slug}/${slug}${typeof usar === "string" ? `?usar=${encodeURIComponent(usar)}` : ""}`);
}
