import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { podeUsarCentral } from "@/lib/central";
import { produtosLiberados } from "@/lib/infoprodutos";
import { SalvosClient } from "./SalvosClient";

// Prompts favoritos do usuário, de todos os produtos (só os dele; respostas de IA da versão antiga
// não aparecem). Prompt de produto sem acesso continua visível — foi ele quem preparou — mas
// "Reutilizar" só aparece pros produtos liberados.
export default async function SalvosPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!(await podeUsarCentral(user.id))) redirect("/biblioteca");

  const [salvos, liberados] = await Promise.all([
    prisma.centralGeracao.findMany({
      where: { profileId: user.id, tipo: "prompt", salvo: true },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, resultado: true, createdAt: true, entradas: true,
        ferramenta: { select: { slug: true, nome: true, icone: true, moduloId: true, publicada: true, modulo: { select: { produto: { select: { id: true, slug: true } } } } } },
      },
    }),
    produtosLiberados(user.id),
  ]);
  return (
    <SalvosClient
      inicial={salvos.map(s => ({
        id: s.id, prompt: s.resultado, createdAt: s.createdAt.toISOString(),
        entradas: (s.entradas ?? {}) as Record<string, string>,
        ferramenta: {
          slug: s.ferramenta.slug, nome: s.ferramenta.nome, icone: s.ferramenta.icone, moduloId: s.ferramenta.moduloId,
          produtoSlug: s.ferramenta.modulo.produto.slug,
          publicada: s.ferramenta.publicada && liberados.has(s.ferramenta.modulo.produto.id),
        },
      }))}
    />
  );
}
