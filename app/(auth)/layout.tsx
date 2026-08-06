import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

// Quem já tem sessão válida não deve ver o formulário de login/cadastro de novo — evita a
// sensação de "desloguei" quando na real o cookie de 30 dias continua válido, só a navegação
// caiu de novo em /sign-in (ex: link direto, histórico do navegador, "/" redirecionando aqui).
export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");
  return <>{children}</>;
}
