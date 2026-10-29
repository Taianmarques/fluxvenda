import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductGate } from "../ProductGate";
import { carregarPerfil } from "@/lib/central";
import { perfilCompleto, perfilTemEssenciais } from "@/lib/central-shared";
import { CentralClient } from "./CentralClient";

export default async function CentralPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <ProductGate product="PLATAFORMA">
      <CentralConteudo userId={user.id} />
    </ProductGate>
  );
}

async function CentralConteudo({ userId }: { userId: string }) {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [modulos, favoritos, perfil, profile, geracoesMes, salvos] = await Promise.all([
    prisma.centralModulo.findMany({
      orderBy: { numero: "asc" },
      include: {
        ferramentas: {
          where: { publicada: true },
          orderBy: [{ ordem: "asc" }, { nome: "asc" }],
          select: { slug: true, nome: true, descricao: true, icone: true, ordem: true, createdAt: true },
        },
      },
    }),
    prisma.centralFavorito.findMany({ where: { profileId: userId }, select: { ferramenta: { select: { slug: true } } } }),
    carregarPerfil(userId),
    prisma.profile.findUnique({ where: { id: userId }, select: { name: true } }),
    prisma.centralGeracao.count({ where: { profileId: userId, createdAt: { gte: inicioMes } } }),
    prisma.centralGeracao.count({ where: { profileId: userId, salvo: true } }),
  ]);

  return (
    <CentralClient
      modulos={modulos.map(m => ({
        id: m.id, numero: m.numero, nome: m.nome, descricao: m.descricao, icone: m.icone,
        ferramentas: m.ferramentas.map(f => ({ slug: f.slug, nome: f.nome, descricao: f.descricao, icone: f.icone, ordem: f.ordem, criadaEm: f.createdAt.toISOString() })),
      }))}
      favoritosIniciais={favoritos.map(f => f.ferramenta.slug)}
      perfilPct={perfilCompleto(perfil)}
      perfilOk={perfilTemEssenciais(perfil)}
      primeiroNome={(profile?.name ?? "").trim().split(/\s+/)[0] ?? ""}
      geracoesMes={geracoesMes}
      salvos={salvos}
    />
  );
}
