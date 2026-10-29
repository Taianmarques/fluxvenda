import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductGate } from "../../ProductGate";
import { SalvosClient } from "./SalvosClient";

// Prompts favoritos do usuário (só os dele; respostas de IA da versão antiga não aparecem)
export default async function SalvosPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <ProductGate product="PLATAFORMA">
      <SalvosConteudo userId={user.id} />
    </ProductGate>
  );
}

async function SalvosConteudo({ userId }: { userId: string }) {
  const salvos = await prisma.centralGeracao.findMany({
    where: { profileId: userId, tipo: "prompt", salvo: true },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, resultado: true, createdAt: true, entradas: true, ferramenta: { select: { slug: true, nome: true, icone: true, moduloId: true, publicada: true } } },
  });
  return (
    <SalvosClient
      inicial={salvos.map(s => ({
        id: s.id, prompt: s.resultado, createdAt: s.createdAt.toISOString(),
        entradas: (s.entradas ?? {}) as Record<string, string>,
        ferramenta: s.ferramenta,
      }))}
    />
  );
}
