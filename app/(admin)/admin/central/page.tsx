import { prisma } from "@/lib/prisma";
import { CentralAdminClient } from "./CentralAdminClient";

export const dynamic = "force-dynamic";

export default async function CentralAdminPage() {
  const [modulos, ferramentas, usos] = await Promise.all([
    prisma.centralModulo.findMany({ orderBy: { numero: "asc" } }),
    prisma.centralFerramenta.findMany({
      orderBy: [{ ordem: "asc" }, { nome: "asc" }],
      select: { id: true, slug: true, nome: true, descricao: true, icone: true, moduloId: true, publicada: true, ordem: true, updatedAt: true },
    }),
    prisma.centralGeracao.groupBy({ by: ["ferramentaId"], _count: { _all: true } }),
  ]);
  const usoPor = new Map(usos.map(u => [u.ferramentaId, u._count._all]));

  return (
    <CentralAdminClient
      modulos={modulos.map(m => ({ id: m.id, numero: m.numero, nome: m.nome, icone: m.icone }))}
      ferramentasIniciais={ferramentas.map(f => ({ ...f, updatedAt: f.updatedAt.toISOString(), usos: usoPor.get(f.id) ?? 0 }))}
    />
  );
}
