import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductGate } from "../../ProductGate";
import { SalvosClient } from "./SalvosClient";

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
    where: { profileId: userId, salvo: true },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, resultado: true, createdAt: true, titulo: true, ferramenta: { select: { slug: true, nome: true, icone: true } } },
  });
  return (
    <SalvosClient
      inicial={salvos.map(s => ({
        id: s.id, resultado: s.resultado, createdAt: s.createdAt.toISOString(), titulo: s.titulo,
        ferramenta: s.ferramenta,
      }))}
    />
  );
}
