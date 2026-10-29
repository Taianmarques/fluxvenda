import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { lerCampos } from "@/lib/central";
import { FerramentaEditorClient } from "./FerramentaEditorClient";

export const dynamic = "force-dynamic";

// /admin/central/nova cria; /admin/central/<id> edita
export default async function FerramentaEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const modulos = await prisma.centralModulo.findMany({ orderBy: { numero: "asc" }, select: { id: true, numero: true, nome: true } });

  if (id === "nova") return <FerramentaEditorClient modulos={modulos} inicial={null} />;

  const f = await prisma.centralFerramenta.findUnique({ where: { id } });
  if (!f) notFound();
  return (
    <FerramentaEditorClient
      modulos={modulos}
      inicial={{
        id: f.id, slug: f.slug, moduloId: f.moduloId, nome: f.nome, descricao: f.descricao, objetivo: f.objetivo,
        campos: lerCampos(f.campos), prompt: f.prompt, instrucoes: f.instrucoes, icone: f.icone,
        publicada: f.publicada, permitirCopiarPrompt: f.permitirCopiarPrompt, ordem: f.ordem,
      }}
    />
  );
}
