import { prisma } from "@/lib/prisma";

// Manifest dinâmico da agenda do profissional — permite "adicionar à tela inicial"
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const professional = await prisma.professional.findUnique({
    where: { accessToken: token },
    select: { name: true },
  });
  let ownerName = professional?.name;
  if (!ownerName) {
    const clinic = await prisma.agentConfig.findUnique({
      where: { agendaAccessToken: token },
      select: { team: { select: { name: true } } },
    });
    ownerName = clinic?.team?.name;
  }

  const name = ownerName ? `Agenda — ${ownerName}` : "Agenda";

  return Response.json(
    {
      name,
      short_name: "Agenda",
      start_url: `/agenda/${token}`,
      scope: `/agenda/${token}`,
      display: "standalone",
      background_color: "#f9fafb",
      theme_color: "#ffffff",
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } }
  );
}
