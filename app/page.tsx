import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Essa instância não tem landing de marketing — só CRM/Plataforma direto. Mas quem já tem
// sessão válida (ex: reabriu o navegador/app instalado em "/") precisa cair no dashboard,
// não de volta pro login — senão a sessão de 30 dias fica inútil na prática.
export default async function RootPage() {
  const { userId } = await auth();
  redirect(userId ? "/dashboard" : "/sign-in");
}
