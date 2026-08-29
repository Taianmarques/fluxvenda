import { prisma } from "@/lib/prisma";
import { MensagensAdminClient } from "./MensagensAdminClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminMensagensPage() {
  const templates = await prisma.messageTemplate.findMany({ orderBy: { id: "asc" } });

  return (
    <MensagensAdminClient
      initialTemplates={templates.map(t => ({
        id: t.id,
        label: t.label,
        description: t.description,
        body: t.body,
        placeholders: Array.isArray(t.placeholders) ? (t.placeholders as string[]) : [],
      }))}
    />
  );
}
