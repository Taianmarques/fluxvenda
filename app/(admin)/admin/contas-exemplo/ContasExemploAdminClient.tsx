"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { FlaskConical, Plus, Trash2, Loader2, ExternalLink, ImagePlus, X } from "lucide-react";
import { SEGMENTS, SUBSEGMENTS } from "@/lib/segments";

type Conta = {
  teamId: string;
  name: string;
  segmento: string;
  subsegmento: string;
  createdAt: string;
  agentId: string | null;
};

type FotoProduto = { base64: string; mimeType: string; previewUrl: string };

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1] ?? "", mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function ContasExemploAdminClient({ initialContas }: { initialContas: Conta[] }) {
  const [contas, setContas] = useState<Conta[]>(initialContas);
  const [segmento, setSegmento] = useState<string>(SEGMENTS[0]);
  const [subsegmento, setSubsegmento] = useState<string>(SUBSEGMENTS[SEGMENTS[0]][0]);
  const [conversasPorEtapa, setConversasPorEtapa] = useState(1);
  const [valorMin, setValorMin] = useState(500);
  const [valorMax, setValorMax] = useState(4500);

  // O que a conversa vitrine deve demonstrar de verdade — ver lib/demo-accounts.ts
  const [showcaseProduto, setShowcaseProduto] = useState(true);
  const [showcaseFoto, setShowcaseFoto] = useState(true);
  const [showcaseAgendamento, setShowcaseAgendamento] = useState(true);
  const [showcasePagamento, setShowcasePagamento] = useState(true);
  const [fotoProduto, setFotoProduto] = useState<FotoProduto | null>(null);
  const [fotoError, setFotoError] = useState("");
  const fotoInputRef = useRef<HTMLInputElement>(null);

  // Situações livres que o gestor quer ver representadas em conversas próprias (ex: "cliente
  // que manda mensagem às 3 da manhã") — cada linha não-vazia vira uma conversa (máx. 5)
  const [cenarios, setCenarios] = useState<string[]>([""]);

  const [criando, setCriando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function handleSegmentoChange(novo: string) {
    setSegmento(novo);
    setSubsegmento(SUBSEGMENTS[novo][0]);
  }

  async function handleFotoUpload(file: File) {
    setFotoError("");
    if (file.size > 4 * 1024 * 1024) { setFotoError("Imagem muito grande (máx. 4MB)."); return; }
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      setFotoProduto({ base64, mimeType, previewUrl: URL.createObjectURL(file) });
    } catch {
      setFotoError("Não foi possível ler essa imagem.");
    }
  }

  function updateCenario(i: number, value: string) {
    setCenarios(prev => prev.map((c, idx) => (idx === i ? value : c)));
  }
  function addCenario() {
    setCenarios(prev => (prev.length >= 5 ? prev : [...prev, ""]));
  }
  function removeCenario(i: number) {
    setCenarios(prev => prev.filter((_, idx) => idx !== i));
  }

  async function handleCriar() {
    setCriando(true);
    setError("");
    try {
      const res = await fetch("/api/admin/contas-exemplo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          segmento, subsegmento,
          conversasPorEtapa: Math.min(5, Math.max(1, conversasPorEtapa || 1)),
          valorMin: Math.max(0, valorMin || 0),
          valorMax: Math.max(0, valorMax || 0),
          showcase: {
            produto: showcaseProduto,
            foto: showcaseProduto && showcaseFoto,
            agendamento: showcaseAgendamento,
            pagamento: showcasePagamento,
          },
          fotoProduto: showcaseProduto && showcaseFoto && fotoProduto
            ? { base64: fotoProduto.base64, mimeType: fotoProduto.mimeType }
            : null,
          cenariosExtras: cenarios.map(c => c.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erro ao criar conta de exemplo."); return; }
      setContas(prev => [
        { teamId: data.teamId, name: `Exemplo — ${segmento} (${subsegmento})`, segmento, subsegmento, createdAt: new Date().toISOString(), agentId: data.agentId },
        ...prev,
      ]);
    } catch {
      setError("Falha na conexão.");
    } finally {
      setCriando(false);
    }
  }

  async function handleExcluir(conta: Conta) {
    if (!confirm(`Excluir a conta de exemplo "${conta.name}"? Isso apaga o pipeline e as conversas simuladas dela.`)) return;
    setExcluindoId(conta.teamId);
    try {
      const res = await fetch(`/api/admin/contas-exemplo/${conta.teamId}`, { method: "DELETE" });
      if (res.ok) setContas(prev => prev.filter(c => c.teamId !== conta.teamId));
    } finally {
      setExcluindoId(null);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FlaskConical size={24} className="text-blue-400" /> Contas de exemplo</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gera uma equipe fictícia com pipeline padrão e uma conversa simulada por etapa do funil (escritas por IA, pro segmento escolhido) — útil pra demonstração comercial sem depender de dados de cliente real.
          Também cria uma conversa de vitrine mostrando, entre o que você escolher abaixo, a IA enviando foto de produto, confirmando um horário e/ou gerando um Pix.
          Leva alguns segundos pra gerar; nenhuma mensagem sai de verdade (a conta não tem WhatsApp conectado).
        </p>
      </div>

      <div className="bg-gray-900 border border-blue-800/50 rounded-2xl p-5 space-y-5">
        <p className="font-semibold">Nova conta de exemplo</p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Segmento</label>
            <select value={segmento} onChange={e => handleSegmentoChange(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
              {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Subsegmento</label>
            <select value={subsegmento} onChange={e => setSubsegmento(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
              {SUBSEGMENTS[segmento].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Conversas por etapa</label>
            <input
              type="number" min={1} max={5} value={conversasPorEtapa}
              onChange={e => setConversasPorEtapa(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Valor mínimo (R$)</label>
            <input
              type="number" min={0} step={50} value={valorMin}
              onChange={e => setValorMin(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Valor máximo (R$)</label>
            <input
              type="number" min={0} step={50} value={valorMax}
              onChange={e => setValorMax(Number(e.target.value))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 -mt-2">O pipeline padrão tem 5 etapas — com N conversas por etapa, o total gerado é 5×N (cada uma leva alguns segundos pra gerar).</p>

        <hr className="border-gray-800" />

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">O que demonstrar na conversa vitrine</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showcaseProduto} onChange={e => setShowcaseProduto(e.target.checked)} className="w-3.5 h-3.5" />
              Produto/catálogo (a IA descreve e vende um item do catálogo)
            </label>

            {showcaseProduto && (
              <div className="ml-5 space-y-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={showcaseFoto} onChange={e => setShowcaseFoto(e.target.checked)} className="w-3.5 h-3.5" />
                  Foto do produto (a IA envia uma foto na conversa)
                </label>
                {showcaseFoto && (
                  <div className="flex items-center gap-3">
                    {fotoProduto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fotoProduto.previewUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-800" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-950 border border-dashed border-gray-700 flex items-center justify-center text-gray-600">
                        <ImagePlus size={16} />
                      </div>
                    )}
                    <input ref={fotoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoUpload(f); e.target.value = ""; }} />
                    <button type="button" onClick={() => fotoInputRef.current?.click()} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400">
                      {fotoProduto ? "Trocar foto" : "Enviar foto real"}
                    </button>
                    {fotoProduto && (
                      <button type="button" onClick={() => setFotoProduto(null)} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400" title="Remover">
                        <X size={14} />
                      </button>
                    )}
                    <p className="text-xs text-gray-500">{fotoProduto ? "Foto enviada" : "Opcional — sem foto, gera uma ilustrativa automaticamente"}</p>
                  </div>
                )}
                {fotoError && <p className="text-xs text-red-400">{fotoError}</p>}
              </div>
            )}

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showcaseAgendamento} onChange={e => setShowcaseAgendamento(e.target.checked)} className="w-3.5 h-3.5" />
              Agendamento (a IA confirma um horário — aparece na Agenda)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={showcasePagamento} onChange={e => setShowcasePagamento(e.target.checked)} className="w-3.5 h-3.5" />
              Pagamento (a IA gera e envia um Pix)
            </label>
          </div>
        </div>

        <hr className="border-gray-800" />

        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Cenários extras (opcional)</p>
          <p className="text-xs text-gray-500 mb-2">Descreva situações específicas que você quer ver representadas — cada uma vira uma conversa própria. Ex: &quot;cliente manda mensagem às 3 da manhã&quot;.</p>
          <div className="space-y-2">
            {cenarios.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={c}
                  onChange={e => updateCenario(i, e.target.value)}
                  placeholder="Ex: cliente manda mensagem às 3 da manhã"
                  maxLength={200}
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                />
                <button type="button" onClick={() => removeCenario(i)} className="p-2 rounded-lg hover:bg-gray-800 text-red-400 flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {cenarios.length < 5 && (
              <button type="button" onClick={addCenario} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300">
                <Plus size={14} /> Adicionar cenário
              </button>
            )}
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={handleCriar} disabled={criando} className="bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-1.5">
          {criando ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {criando ? "Gerando conversas simuladas..." : "Gerar conta de exemplo"}
        </button>
      </div>

      <div className="space-y-2">
        {contas.map(c => (
          <div key={c.teamId} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold truncate">{c.name}</p>
              <p className="text-xs text-gray-500">{c.segmento} · {c.subsegmento} · criada em {new Date(c.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {c.agentId && (
                <Link href={`/crm/${c.agentId}`} target="_blank" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <ExternalLink size={12} /> Abrir no CRM
                </Link>
              )}
              <button onClick={() => handleExcluir(c)} disabled={excluindoId === c.teamId} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50">
                <Trash2 size={12} /> Excluir
              </button>
            </div>
          </div>
        ))}
        {contas.length === 0 && (
          <p className="text-sm text-gray-500">Nenhuma conta de exemplo criada ainda.</p>
        )}
      </div>
    </div>
  );
}
