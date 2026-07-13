"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BookUser, Search, Pencil, MessageCircle, Download, Upload, Instagram, X, Plus, Tags, UserCheck } from "lucide-react";

export type Etiqueta = { id: string; nome: string; cor: string };

export type Contato = {
  conversationId: string;
  contactName: string | null;
  contactNumber: string;
  leadStatusName: string | null;
  leadStatusColor: string | null;
  totalGanho: number;
  lastMessageAt: string | null;
  atendenteNome: string | null;
  etiquetas: Etiqueta[];
};

type Attendant = { id: string; name: string; isManager: boolean };

const CORES_ETIQUETA = ["#25D366", "#34B7F1", "#FFA838", "#FF5C93", "#8B5CF6", "#EF4444", "#6b7280"];

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isIgContact(n: string): boolean {
  return n.startsWith("ig_");
}

function EtiquetaChip({ e, onRemove }: { e: Etiqueta; onRemove?: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
      style={{ color: e.cor, borderColor: `${e.cor}55`, backgroundColor: `${e.cor}22` }}
    >
      {e.nome}
      {onRemove && (
        <button onClick={onRemove} className="hover:opacity-70"><X size={9} /></button>
      )}
    </span>
  );
}

export function ContatosClient({ agentId, contatos, etiquetas }: { agentId: string; contatos: Contato[]; etiquetas: Etiqueta[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Adicionar contato manual
  const [showNovo, setShowNovo] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoNumero, setNovoNumero] = useState("");
  const [criando, setCriando] = useState(false);

  // Seleção + ações em massa
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [acaoAtendente, setAcaoAtendente] = useState("");
  const [acaoEtiqueta, setAcaoEtiqueta] = useState("");
  const [executandoAcao, setExecutandoAcao] = useState(false);

  // Gerenciador de etiquetas
  const [showEtiquetas, setShowEtiquetas] = useState(false);
  const [novaEtiquetaNome, setNovaEtiquetaNome] = useState("");
  const [novaEtiquetaCor, setNovaEtiquetaCor] = useState(CORES_ETIQUETA[0]);
  const [salvandoEtiqueta, setSalvandoEtiqueta] = useState(false);

  useEffect(() => {
    fetch(`/api/agentes/${agentId}/atendentes`)
      .then(res => res.json())
      .then(data => { if (data.attendants) setAttendants(data.attendants); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return contatos;
    return contatos.filter(c =>
      (c.contactName ?? "").toLowerCase().includes(q) ||
      c.contactNumber.includes(q) ||
      c.etiquetas.some(e => e.nome.toLowerCase().includes(q))
    );
  }, [busca, contatos]);

  const todosSelecionados = filtrados.length > 0 && filtrados.every(c => selecionados.has(c.conversationId));

  function toggleTodos() {
    setSelecionados(todosSelecionados ? new Set() : new Set(filtrados.map(c => c.conversationId)));
  }

  function toggleUm(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function executarAcao(payload: Record<string, unknown>) {
    setExecutandoAcao(true);
    setImportResult(null);
    try {
      const res = await fetch(`/api/agentes/${agentId}/contatos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationIds: Array.from(selecionados), ...payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setSelecionados(new Set());
        router.refresh();
      } else {
        setImportResult(data.error ?? "Não foi possível aplicar a ação.");
      }
    } finally {
      setExecutandoAcao(false);
    }
  }

  async function handleCriarEtiqueta() {
    if (!novaEtiquetaNome.trim()) return;
    setSalvandoEtiqueta(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/etiquetas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: novaEtiquetaNome.trim(), cor: novaEtiquetaCor }),
      });
      if (res.ok) { setNovaEtiquetaNome(""); router.refresh(); }
    } finally {
      setSalvandoEtiqueta(false);
    }
  }

  async function handleExcluirEtiqueta(e: Etiqueta) {
    if (!confirm(`Excluir a etiqueta "${e.nome}"? Ela some de todos os contatos.`)) return;
    await fetch(`/api/agentes/${agentId}/etiquetas/${e.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleRemoverEtiquetaDoContato(c: Contato, e: Etiqueta) {
    await fetch(`/api/agentes/${agentId}/contatos`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationIds: [c.conversationId], acao: "remover_etiqueta", etiquetaId: e.id }),
    });
    router.refresh();
  }

  async function handleRenomear(c: Contato) {
    const nome = window.prompt("Nome do contato", c.contactName ?? "");
    if (!nome || !nome.trim() || nome.trim() === c.contactName) return;
    setSalvando(c.conversationId);
    try {
      await fetch(`/api/ferramentas/whatsapp/conversas/${c.conversationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName: nome.trim() }),
      });
      router.refresh();
    } finally {
      setSalvando(null);
    }
  }

  // Aceita CSV com "nome;numero", "numero;nome" ou só "numero" por linha (separador ; ou ,).
  // Detecta qual coluna é o número pela quantidade de dígitos.
  function parseCsv(text: string): { nome?: string; numero: string }[] {
    const contatos: { nome?: string; numero: string }[] = [];
    for (const linha of text.split(/\r?\n/)) {
      if (!linha.trim()) continue;
      const cols = linha.split(linha.includes(";") ? ";" : ",").map(c => c.trim().replace(/^"|"$/g, ""));
      const numeroCol = cols.find(c => c.replace(/\D/g, "").length >= 10);
      if (!numeroCol) continue; // cabeçalho ou linha sem número
      const nome = cols.find(c => c !== numeroCol && c.replace(/\D/g, "").length < 8 && c.length > 1);
      contatos.push({ nome: nome || undefined, numero: numeroCol.replace(/\D/g, "") });
    }
    return contatos;
  }

  async function handleImportFile(file: File) {
    setImportando(true);
    setImportResult(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text).slice(0, 1000);
      if (parsed.length === 0) {
        setImportResult("Nenhum contato encontrado no arquivo. Use uma coluna com o número (DDD + número) e, opcionalmente, uma com o nome.");
        return;
      }
      const res = await fetch(`/api/agentes/${agentId}/contatos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contatos: parsed }),
      });
      const data = await res.json();
      if (res.ok) {
        setImportResult(`Importação concluída: ${data.criados} novo${data.criados === 1 ? "" : "s"}, ${data.atualizados} atualizado${data.atualizados === 1 ? "" : "s"}${data.ignorados > 0 ? `, ${data.ignorados} ignorado${data.ignorados === 1 ? "" : "s"} (número inválido ou repetido)` : ""}.`);
        router.refresh();
      } else {
        setImportResult(data.error ?? "Não foi possível importar. Tente novamente.");
      }
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleCriarContato() {
    const numero = novoNumero.replace(/\D/g, "");
    if (numero.length < 10) return;
    setCriando(true);
    setImportResult(null);
    try {
      const res = await fetch(`/api/agentes/${agentId}/contatos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contatos: [{ nome: novoNome.trim() || undefined, numero }] }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.criados > 0) {
          setNovoNome("");
          setNovoNumero("");
          setShowNovo(false);
          router.refresh();
        } else if (data.atualizados > 0) {
          setImportResult("Esse número já existia — o nome foi preenchido.");
          setNovoNome("");
          setNovoNumero("");
          setShowNovo(false);
          router.refresh();
        } else {
          setImportResult("Esse número já está nos contatos.");
        }
      } else {
        setImportResult(data.error ?? "Não foi possível adicionar. Tente novamente.");
      }
    } finally {
      setCriando(false);
    }
  }

  function exportarCsv() {
    const linhas = [
      "nome;numero;status;etiquetas;atendente;total_ganho;ultima_interacao",
      ...filtrados.map(c => [
        (c.contactName ?? "").replace(/;/g, ","),
        c.contactNumber,
        (c.leadStatusName ?? "").replace(/;/g, ","),
        c.etiquetas.map(e => e.nome).join(", ").replace(/;/g, ","),
        (c.atendenteNome ?? "").replace(/;/g, ","),
        (c.totalGanho / 1).toFixed(2).replace(".", ","),
        c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleString("pt-BR") : "",
      ].join(";")),
    ];
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">Gestão</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <BookUser size={26} className="text-blue-400" /> Contatos
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Todos os contatos que já conversaram com esse agente. {contatos.length} no total.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
            />
            <button
              onClick={() => setShowNovo(s => !s)}
              className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 transition-colors"
            >
              <Plus size={14} /> Adicionar contato
            </button>
            <button
              onClick={() => setShowEtiquetas(s => !s)}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 rounded-xl px-4 py-2 transition-colors"
            >
              <Tags size={14} /> Etiquetas
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importando}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 disabled:opacity-50 rounded-xl px-4 py-2 transition-colors"
            >
              <Upload size={14} /> {importando ? "Importando..." : "Importar CSV"}
            </button>
            <button
              onClick={exportarCsv}
              disabled={filtrados.length === 0}
              className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 disabled:opacity-50 rounded-xl px-4 py-2 transition-colors"
            >
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        </div>

        {importResult && (
          <div className="bg-gray-900 border border-blue-800/40 text-sm text-gray-300 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <span>{importResult}</span>
            <button onClick={() => setImportResult(null)} className="text-gray-500 hover:text-white flex-shrink-0"><X size={14} /></button>
          </div>
        )}

        {/* Gerenciador de etiquetas */}
        {showEtiquetas && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-sm flex items-center gap-1.5"><Tags size={15} className="text-blue-400" /> Etiquetas</p>
            {etiquetas.length === 0 ? (
              <p className="text-xs text-gray-600">Nenhuma etiqueta ainda. Crie abaixo e aplique nos contatos selecionados.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {etiquetas.map(e => (
                  <span key={e.id} className="inline-flex items-center gap-1.5">
                    <EtiquetaChip e={e} />
                    <button onClick={() => handleExcluirEtiqueta(e)} className="text-gray-600 hover:text-red-400" title="Excluir etiqueta">
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2 flex-wrap items-center">
              <input
                value={novaEtiquetaNome}
                onChange={e => setNovaEtiquetaNome(e.target.value)}
                placeholder="Nome da etiqueta (ex: Novo cliente, VIP...)"
                maxLength={40}
                className="flex-1 min-w-[180px] bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              />
              <div className="flex gap-1">
                {CORES_ETIQUETA.map(cor => (
                  <button
                    key={cor}
                    onClick={() => setNovaEtiquetaCor(cor)}
                    className={`w-6 h-6 rounded-full border-2 ${novaEtiquetaCor === cor ? "border-white" : "border-transparent"}`}
                    style={{ backgroundColor: cor }}
                    aria-label={`Cor ${cor}`}
                  />
                ))}
              </div>
              <button
                onClick={handleCriarEtiqueta}
                disabled={salvandoEtiqueta || !novaEtiquetaNome.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium"
              >
                {salvandoEtiqueta ? "Criando..." : "Criar"}
              </button>
            </div>
          </div>
        )}

        {showNovo && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-sm">Novo contato</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Nome (opcional)"
                maxLength={80}
                className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              />
              <input
                value={novoNumero}
                onChange={e => setNovoNumero(e.target.value.replace(/[^\d\s()-]/g, ""))}
                placeholder="WhatsApp com DDD, ex: (84) 99999-0000"
                inputMode="tel"
                maxLength={20}
                className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCriarContato}
                disabled={criando || novoNumero.replace(/\D/g, "").length < 10}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
              >
                {criando ? "Adicionando..." : "Adicionar"}
              </button>
              <button onClick={() => setShowNovo(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, número ou etiqueta..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Barra de ações em massa */}
        {selecionados.size > 0 && (
          <div className="bg-blue-950/60 border border-blue-800/50 rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap">
            <p className="text-sm font-medium flex-shrink-0">
              {selecionados.size} selecionado{selecionados.size === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <UserCheck size={14} className="text-blue-400" />
              <select
                value={acaoAtendente}
                onChange={e => setAcaoAtendente(e.target.value)}
                className="text-xs bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 max-w-[150px]"
              >
                <option value="">Atendente...</option>
                <option value="__remover__">Remover vínculo</option>
                {attendants.map(a => <option key={a.id} value={a.id}>{a.name}{a.isManager ? " (gestor)" : ""}</option>)}
              </select>
              <button
                onClick={() => executarAcao({ acao: "vincular_atendente", atendenteId: acaoAtendente === "__remover__" ? null : acaoAtendente })}
                disabled={executandoAcao || !acaoAtendente}
                className="text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5"
              >
                Vincular
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <Tags size={14} className="text-blue-400" />
              <select
                value={acaoEtiqueta}
                onChange={e => setAcaoEtiqueta(e.target.value)}
                className="text-xs bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 max-w-[150px]"
              >
                <option value="">Etiqueta...</option>
                {etiquetas.map(e => <option key={e.id} value={e.id}>{e.nome}</option>)}
              </select>
              <button
                onClick={() => executarAcao({ acao: "aplicar_etiqueta", etiquetaId: acaoEtiqueta })}
                disabled={executandoAcao || !acaoEtiqueta}
                className="text-xs font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5"
              >
                Aplicar
              </button>
              <button
                onClick={() => executarAcao({ acao: "remover_etiqueta", etiquetaId: acaoEtiqueta })}
                disabled={executandoAcao || !acaoEtiqueta}
                className="text-xs font-medium text-gray-300 hover:text-white border border-gray-700 rounded-lg px-3 py-1.5"
              >
                Remover
              </button>
            </div>
            <button onClick={() => setSelecionados(new Set())} className="text-xs text-gray-400 hover:text-white ml-auto">
              Limpar seleção
            </button>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {filtrados.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 py-10 text-center">
              {contatos.length === 0 ? "Nenhum contato ainda — eles aparecem aqui quando alguém conversa com o agente." : "Nenhum contato encontrado com essa busca."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 md:px-5 py-2.5 border-b border-gray-800">
                <input type="checkbox" checked={todosSelecionados} onChange={toggleTodos} className="w-4 h-4" />
                <p className="text-xs text-gray-500">Selecionar todos ({filtrados.length})</p>
              </div>
              <div className="divide-y divide-gray-800">
                {filtrados.map(c => (
                  <div key={c.conversationId} className={`flex items-center gap-3 px-4 md:px-5 py-3 ${selecionados.has(c.conversationId) ? "bg-blue-950/30" : ""}`}>
                    <input
                      type="checkbox"
                      checked={selecionados.has(c.conversationId)}
                      onChange={() => toggleUm(c.conversationId)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${isIgContact(c.contactNumber) ? "bg-pink-900/40 text-pink-400" : "bg-blue-900/40 text-blue-400"}`}>
                      {isIgContact(c.contactNumber) ? <Instagram size={15} /> : <BookUser size={15} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5 flex-wrap">
                        {c.contactName || <span className="text-gray-400">Sem nome</span>}
                        {c.etiquetas.map(e => (
                          <EtiquetaChip key={e.id} e={e} onRemove={() => handleRemoverEtiquetaDoContato(c, e)} />
                        ))}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {isIgContact(c.contactNumber) ? `Instagram · ${c.contactNumber.replace("ig_", "")}` : c.contactNumber}
                        {c.atendenteNome && ` · atendente: ${c.atendenteNome}`}
                        {c.lastMessageAt && ` · última interação ${new Date(c.lastMessageAt).toLocaleDateString("pt-BR")}`}
                      </p>
                    </div>
                    {c.leadStatusName && (
                      <span
                        className="hidden md:inline-block text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0"
                        style={{ color: c.leadStatusColor ?? "#9ca3af", borderColor: `${c.leadStatusColor ?? "#9ca3af"}55`, backgroundColor: `${c.leadStatusColor ?? "#9ca3af"}22` }}
                      >
                        {c.leadStatusName}
                      </span>
                    )}
                    {c.totalGanho > 0 && (
                      <span className="hidden md:inline text-xs font-semibold text-green-400 flex-shrink-0">{formatBRL(c.totalGanho)}</span>
                    )}
                    <button
                      onClick={() => handleRenomear(c)}
                      disabled={salvando === c.conversationId}
                      title={c.contactName ? "Renomear contato" : "Salvar nome do contato"}
                      className="text-gray-500 hover:text-white disabled:opacity-50 flex-shrink-0 p-1.5"
                    >
                      <Pencil size={14} />
                    </button>
                    <Link
                      href={`/crm/${agentId}?c=${c.conversationId}`}
                      title="Abrir conversa"
                      className="text-gray-500 hover:text-green-400 flex-shrink-0 p-1.5"
                    >
                      <MessageCircle size={15} />
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
