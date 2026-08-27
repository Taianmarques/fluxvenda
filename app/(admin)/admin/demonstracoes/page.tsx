import { prisma } from "@/lib/prisma";

export default async function AdminDemonstracoesPage() {
  const bookings = await prisma.demoBooking.findMany({
    orderBy: { scheduledAt: "desc" },
    include: {
      team: { select: { name: true } },
      requestedBy: { select: { name: true, email: true } },
    },
    take: 100,
  });

  const now = new Date();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Aba Recursos → Agendar uma demonstração</p>
          <h1 className="text-3xl font-bold mt-1">Demonstrações agendadas</h1>
        </div>

        {bookings.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-12 text-center">
            <p className="text-gray-500">Nenhuma demonstração agendada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map(b => {
              const passada = b.scheduledAt < now || b.status === "CANCELADO";
              return (
                <div
                  key={b.id}
                  className={`flex items-center justify-between gap-4 bg-gray-900 border rounded-2xl p-4 ${passada ? "border-gray-800 opacity-50" : "border-gray-800"}`}
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{b.team.name}</p>
                    <p className="text-xs text-gray-500 truncate">{b.requestedBy.name} • {b.requestedBy.email}</p>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    <div>
                      <p className="text-sm font-medium">
                        {b.scheduledAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às {b.scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-gray-500">{b.durationMinutes} min • {b.status}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
