import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { carregarPerfil, podeUsarCentral } from "@/lib/central";
import { PerfilEmpresaClient } from "./PerfilEmpresaClient";

// Perfil da empresa — compartilhado por todos os produtos da biblioteca (preenche os formulários)
export default async function PerfilEmpresaPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!(await podeUsarCentral(user.id))) redirect("/biblioteca");
  return <PerfilEmpresaClient inicial={await carregarPerfil(user.id)} />;
}
