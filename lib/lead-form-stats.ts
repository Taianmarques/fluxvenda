import { prisma } from "@/lib/prisma";
import type { LeadFormQuestion, LeadFormUtm } from "@/lib/lead-form-shared";

export type FormStats = {
  visitas: number;
  iniciaram: number;   // responderam ao menos a 1ª pergunta
  concluiram: number;  // responderam a última pergunta
  convitesEnviados: number;
  falhasEnvio: number;
  porPergunta: { key: string; label: string; respostas: number }[];
  porOrigem: { origem: string; visitas: number; respostas: number; concluiram: number }[];
};

const SEM_ORIGEM = "direto / sem origem";

function origemDe(utm: LeadFormUtm | null | undefined): string {
  return utm?.source?.trim().toLowerCase() || SEM_ORIGEM;
}

// Funil de conversão do formulário: visitas (1 por sessão) → quem respondeu cada pergunta →
// quem terminou, e o mesmo quebrado por origem (utm_source). Uma query por tabela, agregada em
// memória — formulário tem no máximo alguns milhares de respostas.
export async function getFormStats(formId: string, questions: LeadFormQuestion[]): Promise<FormStats> {
  const [views, submissions] = await Promise.all([
    prisma.leadFormView.groupBy({ by: ["source"], where: { formId }, _count: { _all: true } }),
    prisma.leadFormSubmission.findMany({
      where: { formId }, take: 20000,
      select: { answers: true, utm: true, inviteSentAt: true, inviteError: true },
    }),
  ]);

  const ultima = questions[questions.length - 1]?.key;
  const respondida = (answers: unknown, key: string) =>
    Boolean((answers as Record<string, string> | null)?.[key]?.toString().trim());

  const origens = new Map<string, { visitas: number; respostas: number; concluiram: number }>();
  const bucket = (o: string) => {
    let b = origens.get(o);
    if (!b) { b = { visitas: 0, respostas: 0, concluiram: 0 }; origens.set(o, b); }
    return b;
  };

  let visitas = 0;
  for (const v of views) {
    visitas += v._count._all;
    bucket(v.source?.trim().toLowerCase() || SEM_ORIGEM).visitas += v._count._all;
  }

  let concluiram = 0, convitesEnviados = 0, falhasEnvio = 0;
  const porPergunta = questions.map(q => ({ key: q.key, label: q.label, respostas: 0 }));
  for (const s of submissions) {
    const b = bucket(origemDe(s.utm as LeadFormUtm | null));
    b.respostas++;
    porPergunta.forEach(p => { if (respondida(s.answers, p.key)) p.respostas++; });
    if (ultima && respondida(s.answers, ultima)) { concluiram++; b.concluiram++; }
    if (s.inviteSentAt) convitesEnviados++;
    else if (s.inviteError) falhasEnvio++;
  }

  return {
    visitas,
    iniciaram: submissions.length,
    concluiram,
    convitesEnviados,
    falhasEnvio,
    porPergunta,
    porOrigem: [...origens.entries()]
      .map(([origem, v]) => ({ origem, ...v }))
      .sort((a, b) => b.respostas - a.respostas || b.visitas - a.visitas),
  };
}

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Evita injeção de fórmula ao abrir no Excel/Sheets (=, +, -, @ no começo) e escapa aspas
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
}

// CSV (UTF-8 com BOM, separado por ";" — abre direto no Excel em português) com uma coluna por
// pergunta + origem, campanha, consentimento e situação do convite.
export async function buildSubmissionsCsv(formId: string, questions: LeadFormQuestion[]): Promise<string> {
  const subs = await prisma.leadFormSubmission.findMany({ where: { formId }, orderBy: { createdAt: "desc" }, take: 20000 });
  const header = ["Data", ...questions.map(q => q.label), "Origem", "Meio", "Campanha", "Conteúdo", "Consentimento", "Convite", "Motivo da falha"];
  const rows = subs.map(s => {
    const answers = (s.answers ?? {}) as Record<string, string>;
    const utm = (s.utm ?? {}) as LeadFormUtm;
    return [
      s.createdAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      ...questions.map(q => answers[q.key] ?? ""),
      utm.source ?? "", utm.medium ?? "", utm.campaign ?? "", utm.content ?? "",
      s.consentAt ? s.consentAt.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "",
      s.inviteSentAt ? "enviado" : s.inviteError ? "falhou" : "não chegou no WhatsApp",
      s.inviteError ?? "",
    ];
  });
  return "\uFEFF" + [header, ...rows].map(r => r.map(csvCell).join(";")).join("\r\n");
}
