import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { ProductGate } from "../../ProductGate";
import { carregarPerfil } from "@/lib/central";
import { PerfilEmpresaClient } from "./PerfilEmpresaClient";

export default async function PerfilEmpresaPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <ProductGate product="PLATAFORMA">
      <PerfilConteudo userId={user.id} />
    </ProductGate>
  );
}

async function PerfilConteudo({ userId }: { userId: string }) {
  return <PerfilEmpresaClient inicial={await carregarPerfil(userId)} />;
}
