import { UserCog } from "lucide-react";
import { currentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getManagedTeam } from "@/lib/team";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { PerfilClient } from "./PerfilClient";

export default function PerfilPage() {
  return (
    <CrmPageGate pageKey="perfil">
      <div className="h-full overflow-y-auto bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <p className="text-gray-400 text-sm">Configurações</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><UserCog size={28} className="text-blue-400" /> Perfil</h1>
            <p className="text-gray-400 mt-1">Seus dados de acesso e, se você administra a equipe, o nome da empresa.</p>
          </div>

          <PerfilPageContent />
        </div>
      </div>
    </CrmPageGate>
  );
}

async function PerfilPageContent() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });
  if (!profile) redirect("/sign-in");

  const team = await getManagedTeam(user.id);

  return (
    <PerfilClient
      nomeInicial={profile.name}
      emailInicial={profile.email}
      telefoneInicial={profile.phone ?? ""}
      temSenha={!!profile.passwordHash}
      empresaNomeInicial={team?.name ?? null}
    />
  );
}
