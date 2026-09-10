import { prisma } from "@/lib/prisma";
import { FormulariosAdminClient } from "./FormulariosAdminClient";

// Auth já garantida pelo AdminLayout (só ADMIN chega até aqui)
export default async function AdminFormulariosPage() {
  const forms = await prisma.leadForm.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });

  return (
    <FormulariosAdminClient
      initialForms={forms.map(f => ({
        id: f.id,
        slug: f.slug,
        title: f.title,
        active: f.active,
        submissionCount: f._count.submissions,
        createdAt: f.createdAt.toISOString(),
      }))}
    />
  );
}
