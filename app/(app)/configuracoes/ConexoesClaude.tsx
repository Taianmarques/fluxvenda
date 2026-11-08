"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Plug } from "lucide-react";

export type ConexaoClaude = { id: string; nome: string; criadaEm: string; ultimoUso: string | null };

// Endereço do conector e lista das conexões ativas da pessoa, com opção de desconectar
export function ConexoesClaude({ url, conexoes, cartao }: { url: string; conexoes: ConexaoClaude[]; cartao: string }) {
  const router = useRouter();
  const [copiou, setCopiou] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  async function copiar() {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopiou(true);
    setTimeout(() => setCopiou(false), 2000);
  }

  async function desconectar(id: string) {
    setRemovendo(id);
    setErro("");
    const res = await fetch(`/api/mcp/conexoes/${id}`, { method: "DELETE" }).catch(() => null);
    setRemovendo(null);
    if (!res?.ok) { setErro("Não foi possível desconectar. Tente novamente."); return; }
    router.refresh();
  }

  return (
    <section className={`${cartao} space-y-4`}>
      <div>
        <h2 className="font-semibold flex items-center gap-2"><Plug size={18} className="text-blue-600" /> Conectar ao Claude</h2>
        <p className="text-sm text-slate-500 mt-1">No Claude, adicione um conector personalizado em Configurações › Conectores com o endereço abaixo e entre com sua conta do FluxVenda. O acesso ao CRM é somente leitura.</p>
      </div>

      <div className="flex gap-2">
        <input readOnly value={url} className="min-w-0 flex-1 bg-white border border-slate-200 text-slate-900 rounded-xl px-3.5 py-2.5 text-sm" />
        <button type="button" onClick={copiar} className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
          {copiou ? <Check size={15} /> : <Copy size={15} />} {copiou ? "Copiado" : "Copiar"}
        </button>
      </div>

      {conexoes.length > 0 && (
        <ul className="divide-y divide-slate-200">
          {conexoes.map(c => (
            <li key={c.id} className="py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{c.nome}</p>
                <p className="text-xs text-slate-500">Conectado em {c.criadaEm}{c.ultimoUso ? ` · último uso em ${c.ultimoUso}` : ""}</p>
              </div>
              <button type="button" disabled={removendo === c.id} onClick={() => desconectar(c.id)} className="shrink-0 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50">
                {removendo === c.id ? "Desconectando..." : "Desconectar"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {erro && <p className="text-sm text-red-600">{erro}</p>}
    </section>
  );
}
