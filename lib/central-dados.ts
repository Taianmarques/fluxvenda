import { prisma } from "@/lib/prisma";
import { carregarPerfil, lerCampos } from "@/lib/central";
import { perfilTemEssenciais, type CampoFerramenta, type PerfilKey } from "@/lib/central-shared";

// Dados de uma ferramenta pra tela (página própria ou painel lateral da biblioteca).
// O prompt interno NÃO entra aqui — nunca vai pro navegador.
export type FerramentaTela = {
  slug: string; nome: string; descricao: string; objetivo: string; icone: string;
  campos: CampoFerramenta[]; permitirCopiarPrompt: boolean;
  modulo: { id: string; nome: string; numero: number };
};
export type GeracaoTela = { id: string; resultado: string; salvo: boolean; createdAt: string; entradas: Record<string, string> };
export type FerramentaTelaDados = {
  ferramenta: FerramentaTela;
  favorito: boolean;
  perfilOk: boolean;
  nomeEmpresa: string;
  perfilValores: Partial<Record<PerfilKey, string>>; // só os campos do perfil que a ferramenta usa
  historico: GeracaoTela[];
};

export async function carregarFerramentaTela(userId: string, slug: string): Promise<FerramentaTelaDados | null> {
  const f = await prisma.centralFerramenta.findUnique({
    where: { slug },
    include: { modulo: { select: { id: true, nome: true, numero: true } } },
  });
  if (!f || !f.publicada) return null;

  const [favorito, perfil, historico] = await Promise.all([
    prisma.centralFavorito.findUnique({ where: { profileId_ferramentaId: { profileId: userId, ferramentaId: f.id } } }),
    carregarPerfil(userId),
    prisma.centralGeracao.findMany({
      where: { profileId: userId, ferramentaId: f.id },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, resultado: true, salvo: true, createdAt: true, entradas: true },
    }),
  ]);

  const campos = lerCampos(f.campos);
  const perfilValores = Object.fromEntries(campos.filter(c => c.perfil).map(c => [c.perfil!, perfil[c.perfil!] ?? ""]));

  return {
    ferramenta: {
      slug: f.slug, nome: f.nome, descricao: f.descricao, objetivo: f.objetivo, icone: f.icone,
      campos, permitirCopiarPrompt: f.permitirCopiarPrompt, modulo: f.modulo,
    },
    favorito: Boolean(favorito),
    perfilOk: perfilTemEssenciais(perfil),
    nomeEmpresa: perfil.nomeEmpresa,
    perfilValores,
    historico: historico.map(h => ({
      id: h.id, resultado: h.resultado, salvo: h.salvo, createdAt: h.createdAt.toISOString(),
      entradas: (h.entradas ?? {}) as Record<string, string>,
    })),
  };
}
