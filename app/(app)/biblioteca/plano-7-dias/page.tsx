import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Route } from "lucide-react";
import { currentUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";
import { temAcessoAoProduto } from "@/lib/infoprodutos";
import { carregarPlano7Dias, PRODUTO_PLANO_SLUG } from "@/lib/plano-7-dias";
import { CentralIcone } from "@/lib/central-icons";

export const dynamic = "force-dynamic";

const cartao = "rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

// Plano prático de 7 dias (100 prompts): cada dia aponta para ferramentas reais e fica concluído
// quando a pessoa prepara o prompt delas
export default async function Plano7DiasPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const produto = await prisma.infoProduto.findUnique({ where: { slug: PRODUTO_PLANO_SLUG }, select: { id: true } });
  if (!produto || !(await temAcessoAoProduto(user.id, produto.id))) redirect(`/biblioteca/${PRODUTO_PLANO_SLUG}`);

  const dias = await carregarPlano7Dias(user.id);
  const feitos = dias.filter(d => d.concluido).length;
  const atual = dias.find(d => !d.concluido)?.dia;
  const base = `/biblioteca/${PRODUTO_PLANO_SLUG}`;

  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <Link href="/biblioteca" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Minha Biblioteca
        </Link>

        <section className="rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50 to-violet-100 p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-2.5"><Route size={26} className="text-blue-600" /> Plano prático de 7 dias</h1>
          <p className="mt-2 text-slate-600">Um roteiro para começar a usar a IA em tarefas reais do seu comercial. Um dia por vez, no seu ritmo.</p>
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-white rounded-full overflow-hidden border border-blue-100">
              <div className="h-full bg-gradient-to-r from-blue-600 to-violet-600 rounded-full" style={{ width: `${Math.round((feitos / dias.length) * 100)}%` }} />
            </div>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">{feitos}/{dias.length} dias</span>
          </div>
          <p className="mt-3 text-xs text-slate-500">Um dia fica concluído quando você prepara o prompt de todas as ferramentas dele. O plano orienta a execução — não é garantia de vendas em 7 dias.</p>
        </section>

        <ol className="space-y-3">
          {dias.map(d => (
            <li key={d.dia} className={`${cartao} p-5 ${d.dia === atual ? "border-blue-300 ring-2 ring-blue-500/10" : ""}`}>
              <div className="flex items-start gap-4">
                <span className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${d.concluido ? "bg-emerald-50 text-emerald-700" : d.dia === atual ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <span className="text-[10px] font-semibold uppercase leading-none">Dia</span>
                  <span className="text-lg font-bold leading-tight">{d.dia}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold">{d.titulo}</h2>
                    {d.concluido && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={12} /> Concluído</span>}
                    {d.dia === atual && <span className="rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Próximo passo</span>}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{d.porQue}</p>
                  <div className="mt-3 space-y-2">
                    {d.ferramentas.map(f => (
                      <Link key={f.slug} href={`${base}/${f.slug}`} className="group flex items-center gap-3 rounded-xl border border-slate-200 hover:border-blue-300 bg-slate-50/60 hover:bg-white px-3 py-2.5">
                        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0"><CentralIcone nome={f.icone} size={16} /></span>
                        <span className="flex-1 min-w-0 text-sm font-medium truncate">{f.nome}</span>
                        {f.feita
                          ? <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 flex-shrink-0"><Circle size={14} className="text-slate-300" /> Fazer <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" /></span>}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
