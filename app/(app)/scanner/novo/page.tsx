import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { NovoScannerForm } from "./NovoScannerForm";

export default async function NovoScannerPage() {
  const user = await currentUser();

  const profile = await prisma.profile.findUnique({
    where: { id: user!.id },
    select: {
      role: true,
      segment: true,
      managedTeam: {
        select: { name: true, businessModel: true, segment: true, subsegment: true, size: true },
      },
      teamMembership: {
        select: {
          team: {
            select: { name: true, businessModel: true, segment: true, subsegment: true, size: true },
          },
        },
      },
    },
  });

  const isVendedor = profile?.role === "VENDEDOR";
  // Gestor usa managedTeam; vendedor usa o time ao qual pertence via convite
  const team = profile?.managedTeam ?? profile?.teamMembership?.team;
  const hasTeam = isVendedor && !!profile?.teamMembership?.team;

  return (
    <NovoScannerForm
      isVendedor={isVendedor}
      hasTeam={hasTeam}
      defaultSegment={team?.segment ?? profile?.segment ?? ""}
      defaultCompanyName={team?.name ?? ""}
      defaultBusinessModel={(team?.businessModel as "B2B" | "B2C") ?? "B2B"}
      defaultSubsegment={team?.subsegment ?? ""}
      defaultTeamSize={team?.size ?? ""}
    />
  );
}
