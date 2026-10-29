import Link from "next/link";
import { ArrowLeft, Lock, Layers, Wrench } from "lucide-react";
import { CentralIcone } from "@/lib/central-icons";
import { formatarPreco } from "@/lib/infoprodutos";

// Página de um produto que o usuário ainda não tem: mostra o que é e o que contém (nunca as
// ferramentas em si) e, se houver oferta ativa, o preço vigente e o caminho de compra.
export function ProdutoBloqueado({ produto, modulos, totalFerramentas, preco }: {
  produto: { nome: string; descricao: string; beneficio: string; capaUrl: string | null; icone: string; categoria: string };
  modulos: { nome: string; total: number }[];
  totalFerramentas: number;
  preco: { precoCentavos: number; ofertaSlug: string } | null;
}) {
  return (
    <div className="min-h-full bg-[#f4f6fb] text-slate-900">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
        <Link href="/biblioteca" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} /> Minha Biblioteca
        </Link>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {produto.capaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={produto.capaUrl} alt="" className="h-44 w-full object-cover" />
          ) : (
            <div className="h-36 bg-gradient-to-br from-indigo-100 via-white to-violet-100 flex items-center justify-center">
              <span className="w-16 h-16 rounded-2xl bg-white/80 text-indigo-600 flex items-center justify-center shadow-sm"><CentralIcone nome={produto.icone} size={30} /></span>
            </div>
          )}
          <div className="p-6 space-y-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"><Lock size={12} /> Você ainda não tem este produto</span>
              <h1 className="mt-3 text-2xl font-bold">{produto.nome}</h1>
              {produto.beneficio && <p className="mt-1.5 text-slate-600">{produto.beneficio}</p>}
            </div>
            {produto.descricao && <p className="text-sm text-slate-600 leading-relaxed">{produto.descricao}</p>}
            <div className="flex flex-wrap gap-4 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><Wrench size={15} className="text-indigo-600" /> {totalFerramentas} ferramentas</span>
              <span className="inline-flex items-center gap-1.5"><Layers size={15} className="text-indigo-600" /> {modulos.length} {modulos.length === 1 ? "módulo" : "módulos"}</span>
            </div>
            {modulos.length > 0 && (
              <ul className="grid sm:grid-cols-2 gap-2">
                {modulos.map(m => (
                  <li key={m.nome} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{m.nome}</span>
                    <span className="text-xs text-slate-400 tabular-nums">{m.total}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {preco ? (
                <>
                  <p className="text-2xl font-bold tabular-nums">{formatarPreco(preco.precoCentavos)}</p>
                  <Link href={`/comprar/${preco.ofertaSlug}`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-indigo-600/20">
                    Quero este produto
                  </Link>
                </>
              ) : (
                <p className="text-sm text-slate-500">Este produto estará disponível para compra em breve.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
