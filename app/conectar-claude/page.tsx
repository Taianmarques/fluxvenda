import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { AuthLogo } from "@/app/AuthLogo";
import { validarPedido } from "@/lib/mcp/oauth";
import { ConectarClient } from "./ConectarClient";

// Tela de aprovação do conector do Claude (authorization_endpoint do OAuth). Quem não está logado
// passa antes pelo /sign-in (proxy.ts) e volta pra cá com o mesmo pedido.
export default async function ConectarClaudePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const brutos = await searchParams;
  const pedido = Object.fromEntries(Object.entries(brutos).filter((e): e is [string, string] => typeof e[1] === "string"));
  const validado = await validarPedido(pedido);
  const perfil = await prisma.profile.findUnique({ where: { id: user.id }, select: { name: true, email: true, role: true } });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-gray-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <AuthLogo />
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
          {"erro" in validado
            ? <p className="text-sm text-red-600">{validado.erro}</p>
            : <ConectarClient pedido={pedido} cliente={validado.clienteNome} nome={perfil?.name ?? ""} email={perfil?.email ?? ""} superadmin={perfil?.role === "ADMIN"} />}
        </div>
      </div>
    </div>
  );
}
