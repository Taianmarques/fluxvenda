"use client";

import { useEffect, useState } from "react";
import { Users, Plus, X } from "lucide-react";

const MODES = [
  { value: "MANUAL", label: "Manual", description: "Ninguém é atribuído automaticamente — o gestor ou o próprio atendente escolhem quem fica com cada conversa." },
  { value: "PRIMEIRO_A_ASSUMIR", label: "Primeiro a assumir", description: "Quem mandar a primeira mensagem manual numa conversa fica responsável por ela." },
  { value: "RODIZIO", label: "Rodízio", description: "Toda conversa nova já nasce atribuída automaticamente, alternando entre os atendentes da equipe." },
  { value: "IA_QUALIFICACAO", label: "IA qualifica antes de atribuir", description: "A IA analisa a conversa e só atribui (em rodízio) quando o cliente demonstrar interesse real de compra." },
];

const NIVEL_CARTEIRA_OPTIONS = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "INATIVO", label: "Inativo" },
  { value: "PERDIDO", label: "Perdido" },
] as const;

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];
}

type Attendant = { id: string; name: string; isManager: boolean };

const MAX_CONDICOES = 10;

export function DistribuicaoClient({
  agentId, initialMode, initialIaIgnoraAtribuidos, initialTransferirAoPedirFoto,
  initialIaLeadAttendantId, initialIaNiveisCarteiraExcluidos, initialTransferenciaCondicoes,
}: {
  agentId: string;
  initialMode: string;
  initialIaIgnoraAtribuidos: boolean;
  initialTransferirAoPedirFoto: boolean;
  initialIaLeadAttendantId: string | null;
  initialIaNiveisCarteiraExcluidos: string[];
  initialTransferenciaCondicoes: string[];
}) {
  const [mode, setMode] = useState(initialMode);
  const [iaIgnoraAtribuidos, setIaIgnoraAtribuidos] = useState(initialIaIgnoraAtribuidos);
  const [transferirAoPedirFoto, setTransferirAoPedirFoto] = useState(initialTransferirAoPedirFoto);
  const [iaLeadAttendantId, setIaLeadAttendantId] = useState(initialIaLeadAttendantId ?? "");
  const [iaNiveisCarteiraExcluidos, setIaNiveisCarteiraExcluidos] = useState<string[]>(initialIaNiveisCarteiraExcluidos);
  const [transferenciaCondicoes, setTransferenciaCondicoes] = useState<string[]>(initialTransferenciaCondicoes);
  const [novaCondicao, setNovaCondicao] = useState("");
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function adicionarCondicao() {
    const texto = novaCondicao.trim();
    if (!texto || transferenciaCondicoes.length >= MAX_CONDICOES) return;
    const next = [...transferenciaCondicoes, texto];
    setTransferenciaCondicoes(next);
    setNovaCondicao("");
    save({ transferenciaCondicoes: next });
  }

  function removerCondicao(i: number) {
    const next = transferenciaCondicoes.filter((_, idx) => idx !== i);
    setTransferenciaCondicoes(next);
    save({ transferenciaCondicoes: next });
  }

  useEffect(() => {
    fetch(`/api/agentes/${agentId}/atendentes`)
      .then(res => res.json())
      .then(data => { if (data.attendants) setAttendants(data.attendants); })
      .catch(() => {});
  }, [agentId]);

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setSaved(false);
    try {
      await fetch(`/api/agentes/${agentId}/distribuicao`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold flex items-center gap-2"><Users size={16} /> Distribuição de leads entre atendentes</p>
        {saving ? <span className="text-xs text-gray-500">Salvando...</span> : saved ? <span className="text-xs text-green-400">Salvo</span> : null}
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => { setMode(m.value); save({ leadDistributionMode: m.value }); }}
            className={`text-left p-3 rounded-xl border text-sm transition-colors ${
              mode === m.value ? "border-blue-600 bg-blue-950/30" : "border-gray-800 hover:border-gray-700"
            }`}
          >
            <p className="font-medium">{m.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-800 pt-4 space-y-4">
        <div>
          <p className="text-sm font-medium">Quem a IA atende</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Enquanto a IA estiver ligada, esses critérios decidem quais conversas ela responde automaticamente. Quando algum critério exclui uma conversa, a mensagem continua sendo salva normalmente (a IA "escuta" tudo) e a equipe é avisada — só não sai resposta automática.
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={iaIgnoraAtribuidos}
            onChange={e => { setIaIgnoraAtribuidos(e.target.checked); save({ iaIgnoraAtribuidos: e.target.checked }); }}
            className="w-4 h-4"
          />
          <span className="text-sm">Não responder conversas que já têm um vendedor atribuído</span>
        </label>

        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={transferirAoPedirFoto}
              onChange={e => { setTransferirAoPedirFoto(e.target.checked); save({ transferirAoPedirFoto: e.target.checked }); }}
              className="w-4 h-4"
            />
            <span className="text-sm">Transferir direto pra um atendente quando o cliente pedir foto/imagem</span>
          </label>
          <p className="text-xs text-gray-500 mt-1 ml-6">A IA não consegue enviar mídia — em vez de tentar contornar, ela já passa a conversa pra um humano assim que perceber o pedido.</p>
        </div>

        <div>
          <p className="text-sm font-medium">Transferir automaticamente para atendente quando...</p>
          <p className="text-xs text-gray-500 mt-0.5 mb-2">
            Descreva situações em texto livre (ex: "cliente pedir desconto acima de 20%", "cliente reclamar do produto") — a IA avalia a conversa e transfere pra um humano assim que alguma delas acontecer.
          </p>
          {transferenciaCondicoes.length > 0 && (
            <ul className="space-y-1.5 mb-2">
              {transferenciaCondicoes.map((c, i) => (
                <li key={i} className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm">
                  <span className="flex-1">{c}</span>
                  <button onClick={() => removerCondicao(i)} title="Remover" className="text-gray-500 hover:text-red-400 flex-shrink-0">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {transferenciaCondicoes.length < MAX_CONDICOES && (
            <div className="flex gap-2">
              <input
                value={novaCondicao}
                onChange={e => setNovaCondicao(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); adicionarCondicao(); } }}
                placeholder="Ex: cliente pedir para falar com um humano"
                maxLength={200}
                className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={adicionarCondicao}
                disabled={!novaCondicao.trim()}
                className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-3 py-2 flex-shrink-0"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Vendedor que recebe os leads transferidos pela IA</label>
          <select
            value={iaLeadAttendantId}
            onChange={e => { setIaLeadAttendantId(e.target.value); save({ iaLeadAttendantId: e.target.value || null }); }}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
          >
            <option value="">Sem preferência (segue a distribuição padrão)</option>
            <option value="RODIZIO">Rodízio entre a equipe</option>
            {attendants.map(a => <option key={a.id} value={a.id}>{a.name}{a.isManager ? " (gestor)" : ""}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1">Vale só pra conversas ainda sem atendente — quando a IA transfere (ex: pedido de foto), esse vendedor é definido automaticamente. Não rouba conversas que já têm alguém.</p>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-1.5">Não responder estes níveis de carteira</label>
          <div className="flex flex-wrap gap-3">
            {NIVEL_CARTEIRA_OPTIONS.map(n => (
              <label key={n.value} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={iaNiveisCarteiraExcluidos.includes(n.value)}
                  onChange={() => {
                    const next = toggleInArray(iaNiveisCarteiraExcluidos, n.value);
                    setIaNiveisCarteiraExcluidos(next);
                    save({ iaNiveisCarteiraExcluidos: next });
                  }}
                  className="w-4 h-4"
                />
                {n.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Considera só o nível definido manualmente ou por importação — o calculado automaticamente (recorrência/ticket/recência) não entra aqui.</p>
        </div>
      </div>
    </div>
  );
}
