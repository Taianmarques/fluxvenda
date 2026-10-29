import { prisma } from "@/lib/prisma";
import { carregarPerfil, lerCampos, verificarUsoFerramenta } from "@/lib/central";
import { perfilTemEssenciais, type CampoFerramenta, type PerfilKey } from "@/lib/central-shared";

// Dados de uma ferramenta pra tela (página própria ou painel lateral da biblioteca) — tudo vem da
// configuração no banco; a mesma página serve as 100 ferramentas e as que forem criadas no admin.
// O prompt interno NÃO entra aqui — nunca vai pro navegador.
export type FerramentaTela = {
  slug: string; nome: string; descricao: string; objetivo: string; icone: string;
  comoUsar: string; formatoResposta: string;
  campos: CampoFerramenta[]; permitirCopiarPrompt: boolean;
  modulo: { id: string; nome: string; numero: number };
};
export type GeracaoTela = {
  id: string; resultado: string; salvo: boolean; createdAt: string; entradas: Record<string, string>;
  pedidoAjuste?: string | null; editado?: boolean; // versão ajustada pela IA / corrigida à mão
};
export type FerramentaRelacionada = { slug: string; nome: string; descricao: string; icone: string; moduloId: string };
export type FerramentaTelaDados = {
  ferramenta: FerramentaTela;
  favorito: boolean;
  perfilOk: boolean;
  nomeEmpresa: string;
  perfilValores: Partial<Record<PerfilKey, string>>; // só os campos do perfil que a ferramenta usa
  historico: GeracaoTela[];
  relacionadas: FerramentaRelacionada[];
  uso: { permitido: boolean; motivo: string | null; usosHoje: number; limite: number | null };
  reusarEntradas: Record<string, string> | null;
};

const SELECT_RELACIONADA = { slug: true, nome: true, descricao: true, icone: true, moduloId: true } as const;

// Relacionadas escolhidas no admin (na ordem escolhida); sem escolha, as vizinhas do mesmo módulo
async function carregarRelacionadas(f: { id: string; moduloId: string; ordem: number; relacionadas: string[] }) {
  if (f.relacionadas.length > 0) {
    const lista = await prisma.centralFerramenta.findMany({
      where: { slug: { in: f.relacionadas }, publicada: true, id: { not: f.id } },
      select: SELECT_RELACIONADA,
    });
    return f.relacionadas.map(s => lista.find(l => l.slug === s)).filter((x): x is FerramentaRelacionada => Boolean(x));
  }
  const doModulo = await prisma.centralFerramenta.findMany({
    where: { moduloId: f.moduloId, publicada: true, id: { not: f.id } },
    select: { ...SELECT_RELACIONADA, ordem: true },
  });
  return doModulo
    .sort((a, b) => Math.abs(a.ordem - f.ordem) - Math.abs(b.ordem - f.ordem) || a.ordem - b.ordem)
    .slice(0, 3)
    .map(({ ordem: _ordem, ...r }) => r);
}

// reusarId: prompt antigo do próprio usuário cujos dados voltam pro formulário ("Reutilizar")
export async function carregarFerramentaTela(userId: string, slug: string, reusarId?: string): Promise<FerramentaTelaDados | null> {
  const f = await prisma.centralFerramenta.findUnique({
    where: { slug },
    include: { modulo: { select: { id: true, nome: true, numero: true } } },
  });
  if (!f || !f.publicada) return null;

  const [favorito, perfil, historico, relacionadas, uso, reusar] = await Promise.all([
    prisma.centralFavorito.findUnique({ where: { profileId_ferramentaId: { profileId: userId, ferramentaId: f.id } } }),
    carregarPerfil(userId),
    prisma.centralGeracao.findMany({
      where: { profileId: userId, ferramentaId: f.id, tipo: "prompt" },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { id: true, resultado: true, salvo: true, createdAt: true, entradas: true, pedidoAjuste: true, editado: true },
    }),
    carregarRelacionadas(f),
    verificarUsoFerramenta(userId, f),
    reusarId
      ? prisma.centralGeracao.findFirst({ where: { id: reusarId, profileId: userId, ferramentaId: f.id, tipo: "prompt" }, select: { entradas: true } })
      : null,
  ]);

  const campos = lerCampos(f.campos);
  const perfilValores = Object.fromEntries(campos.filter(c => c.perfil).map(c => [c.perfil!, perfil[c.perfil!] ?? ""]));

  return {
    ferramenta: {
      slug: f.slug, nome: f.nome, descricao: f.descricao, objetivo: f.objetivo, icone: f.icone,
      comoUsar: f.comoUsar, formatoResposta: f.formatoResposta,
      campos, permitirCopiarPrompt: f.permitirCopiarPrompt, modulo: f.modulo,
    },
    favorito: Boolean(favorito),
    perfilOk: perfilTemEssenciais(perfil),
    nomeEmpresa: perfil.nomeEmpresa,
    perfilValores,
    historico: historico.map(h => ({
      id: h.id, resultado: h.resultado, salvo: h.salvo, createdAt: h.createdAt.toISOString(),
      entradas: (h.entradas ?? {}) as Record<string, string>,
      pedidoAjuste: h.pedidoAjuste, editado: h.editado,
    })),
    relacionadas,
    uso,
    reusarEntradas: reusar ? (reusar.entradas ?? {}) as Record<string, string> : null,
  };
}
