import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lerCampos } from "@/lib/central";
import { FerramentaEditorClient } from "./FerramentaEditorClient";

export const dynamic = "force-dynamic";

// /admin/central/nova cria; /admin/central/<id> edita
export default async function FerramentaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [modulos, todas] = await Promise.all([
    prisma.centralModulo.findMany({ orderBy: { numero: "asc" }, select: { id: true, numero: true, nome: true, produto: { select: { nome: true } } } }).then(ms => ms.map(m => ({ id: m.id, numero: m.numero, nome: `${m.produto.nome} › ${m.nome}` }))),
    prisma.centralFerramenta.findMany({ orderBy: [{ moduloId: "asc" }, { ordem: "asc" }], select: { id: true, slug: true, nome: true, moduloId: true } }),
  ]);

  if (id === "nova") return <FerramentaEditorClient modulos={modulos} todas={todas} inicial={null} />;

  const f = await prisma.centralFerramenta.findUnique({ where: { id } });
  if (!f) notFound();
  return (
    <FerramentaEditorClient
      modulos={modulos}
      todas={todas.filter(t => t.id !== f.id)}
      inicial={{
        id: f.id, slug: f.slug, moduloId: f.moduloId, nome: f.nome, descricao: f.descricao, objetivo: f.objetivo,
        campos: lerCampos(f.campos), prompt: f.prompt, instrucoes: f.instrucoes, icone: f.icone,
        publicada: f.publicada, permitirCopiarPrompt: f.permitirCopiarPrompt, ordem: f.ordem,
        comoUsar: f.comoUsar, formatoResposta: f.formatoResposta, continuacao: f.continuacao, relacionadas: f.relacionadas,
        acesso: f.acesso === "gestores" ? "gestores" : "todos", limiteDiario: f.limiteDiario,
      }}
    />
  );
}
