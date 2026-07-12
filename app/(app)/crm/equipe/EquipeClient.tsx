"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Copy, Check, Crown, User, Trash2, MessageCircle, Building2, Plus, X, Shield, Pencil, ChevronDown } from "lucide-react";
import { CRM_CATEGORIES } from "@/lib/crm-nav-config";

type Membro = {
  memberId: string;
  profileId: string;
  name: string;
  email: string;
  joinedAt: string;
  departamentoId: string | null;
  accessProfileId: string | null;
};

type Departamento = { id: string; nome: string; descricao: string };
type Perfil = { id: string; nome: string; allowedPages: string[] };

export function EquipeClient({ teamName, isManager, inviteLink, manager, members, departamentos, perfis, currentUserId }: {
  teamName: string;
  isManager: boolean;
  inviteLink: string | null;
  manager: { id: string; name: string; email: string };
  members: Membro[];
  departamentos: Departamento[];
  perfis: Perfil[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // Departamentos
  const [showNovoDep, setShowNovoDep] = useState(false);
  const [depNome, setDepNome] = useState("");
  const [depDescricao, setDepDescricao] = useState("");
  const [salvandoDep, setSalvandoDep] = useState(false);

  // Perfis de acesso
  const [showNovoPerfil, setShowNovoPerfil] = useState(false);
  const [perfilNome, setPerfilNome] = useState("");
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const [expandedPerfilId, setExpandedPerfilId] = useState<string | null>(null);

  async function handleCriarDepartamento() {
    if (!depNome.trim()) return;
    setSalvandoDep(true);
    try {
      const res = await fetch(`/api/equipe/departamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: depNome.trim(), descricao: depDescricao.trim() }),
      });
      if (res.ok) { setDepNome(""); setDepDescricao(""); setShowNovoDep(false); router.refresh(); }
    } finally {
      setSalvandoDep(false);
    }
  }

  async function handleExcluirDepartamento(d: Departamento) {
    if (!confirm(`Excluir o departamento "${d.nome}"? Membros e conversas dele ficam sem departamento.`)) return;
    await fetch(`/api/equipe/departamentos/${d.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleSetDepartamento(memberId: string, departamentoId: string) {
    await fetch(`/api/equipe/membros/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ departamentoId: departamentoId || null }),
    });
    router.refresh();
  }

  async function handleCriarPerfil() {
    if (!perfilNome.trim()) return;
    setSalvandoPerfil(true);
    try {
      const res = await fetch(`/api/equipe/perfis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: perfilNome.trim(), allowedPages: [] }),
      });
      if (res.ok) { setPerfilNome(""); setShowNovoPerfil(false); router.refresh(); }
    } finally {
      setSalvandoPerfil(false);
    }
  }

  async function handleRenomearPerfil(p: Perfil) {
    const novoNome = window.prompt("Novo nome do perfil", p.nome);
    if (!novoNome || !novoNome.trim() || novoNome.trim() === p.nome) return;
    await fetch(`/api/equipe/perfis/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novoNome.trim() }),
    });
    router.refresh();
  }

  async function handleExcluirPerfil(p: Perfil) {
    if (!confirm(`Excluir o perfil "${p.nome}"? Membros com esse perfil passam a ter acesso total ao CRM.`)) return;
    await fetch(`/api/equipe/perfis/${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handleTogglePagina(p: Perfil, pageKey: string) {
    const allowedPages = p.allowedPages.includes(pageKey)
      ? p.allowedPages.filter(k => k !== pageKey)
      : [...p.allowedPages, pageKey];
    await fetch(`/api/equipe/perfis/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allowedPages }),
    });
    router.refresh();
  }

  async function handleSetPerfil(memberId: string, accessProfileId: string) {
    await fetch(`/api/equipe/membros/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessProfileId: accessProfileId || null }),
    });
    router.refresh();
  }

  function copyLink() {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  function shareWhatsApp() {
    if (!inviteLink) return;
    const msg = `Olá! Você foi convidado(a) para a equipe ${teamName}. Crie seu acesso por este link: ${inviteLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  async function handleRemove(m: Membro) {
    if (!confirm(`Remover ${m.name} da equipe? As conversas atribuídas a essa pessoa voltam para "sem atendente".`)) return;
    setRemoving(m.memberId);
    try {
      const res = await fetch(`/api/equipe/membros/${m.memberId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <p className="text-gray-400 text-sm">Atendimento</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
            <UserPlus size={26} className="text-blue-400" /> Equipe
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quem pode atender no CRM. Novos usuários entram pelo link de convite e já ganham acesso às conversas.
          </p>
        </div>

        {/* Convite (só gestor) */}
        {isManager && inviteLink && (
          <div className="bg-gray-900 border border-blue-800/40 rounded-2xl p-5 space-y-3">
            <div>
              <p className="font-semibold text-sm text-blue-300">Adicionar usuário</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Envie o link — a pessoa cria a conta e entra automaticamente na equipe como atendente.
              </p>
            </div>
            <div className="flex items-center gap-2 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5">
              <code className="flex-1 text-xs text-gray-300 truncate">{inviteLink}</code>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copiado!" : "Copiar link"}
              </button>
              <button
                onClick={shareWhatsApp}
                className="flex items-center gap-1.5 text-sm font-medium text-green-400 hover:text-green-300 border border-green-800/50 hover:border-green-600/50 rounded-xl px-4 py-2 transition-colors"
              >
                <MessageCircle size={14} />
                Enviar pelo WhatsApp
              </button>
            </div>
          </div>
        )}

        {/* Departamentos */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-sm flex items-center gap-1.5"><Building2 size={15} className="text-blue-400" /> Departamentos</p>
              <p className="text-xs text-gray-500 mt-0.5">
                A IA transfere a conversa para o departamento certo com base na descrição do que cada um atende.
              </p>
            </div>
            {isManager && (
              <button
                onClick={() => setShowNovoDep(s => !s)}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={12} /> Novo departamento
              </button>
            )}
          </div>

          {showNovoDep && isManager && (
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2">
              <input
                value={depNome}
                onChange={e => setDepNome(e.target.value)}
                placeholder="Nome (ex: Financeiro, Suporte, Vendas...)"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                maxLength={40}
              />
              <input
                value={depDescricao}
                onChange={e => setDepDescricao(e.target.value)}
                placeholder="O que esse setor atende (a IA usa isso pra decidir a transferência)"
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                maxLength={300}
              />
              <div className="flex gap-2">
                <button onClick={handleCriarDepartamento} disabled={salvandoDep || !depNome.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium">
                  {salvandoDep ? "Criando..." : "Criar"}
                </button>
                <button onClick={() => setShowNovoDep(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
              </div>
            </div>
          )}

          {departamentos.length === 0 ? (
            <p className="text-xs text-gray-600">Nenhum departamento ainda. Sem departamentos, a IA não oferece transferência por setor.</p>
          ) : (
            <div className="space-y-1.5">
              {departamentos.map(d => (
                <div key={d.id} className="flex items-center gap-3 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5">
                  <Building2 size={14} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{d.nome}</p>
                    {d.descricao && <p className="text-xs text-gray-500 truncate">{d.descricao}</p>}
                  </div>
                  <span className="text-[10px] text-gray-500 flex-shrink-0">
                    {members.filter(m => m.departamentoId === d.id).length} membro{members.filter(m => m.departamentoId === d.id).length === 1 ? "" : "s"}
                  </span>
                  {isManager && (
                    <button onClick={() => handleExcluirDepartamento(d)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Perfis de acesso */}
        {isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-semibold text-sm flex items-center gap-1.5"><Shield size={15} className="text-blue-400" /> Perfis de acesso</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Escolha quais páginas do CRM cada perfil enxerga. Membro sem perfil atribuído mantém acesso total.
                </p>
              </div>
              <button
                onClick={() => setShowNovoPerfil(s => !s)}
                className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <Plus size={12} /> Novo perfil
              </button>
            </div>

            {showNovoPerfil && (
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2">
                <input
                  value={perfilNome}
                  onChange={e => setPerfilNome(e.target.value)}
                  placeholder="Nome (ex: Atendente, Financeiro...)"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm"
                  maxLength={40}
                />
                <div className="flex gap-2">
                  <button onClick={handleCriarPerfil} disabled={salvandoPerfil || !perfilNome.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium">
                    {salvandoPerfil ? "Criando..." : "Criar"}
                  </button>
                  <button onClick={() => setShowNovoPerfil(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
                </div>
              </div>
            )}

            {perfis.length === 0 ? (
              <p className="text-xs text-gray-600">Nenhum perfil ainda. Sem perfis, todos os membros têm acesso total ao CRM.</p>
            ) : (
              <div className="space-y-1.5">
                {perfis.map(p => {
                  const membrosCount = members.filter(m => m.accessProfileId === p.id).length;
                  const expanded = expandedPerfilId === p.id;
                  return (
                    <div key={p.id} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setExpandedPerfilId(expanded ? null : p.id)}
                          className="flex-1 min-w-0 flex items-center gap-2 text-left"
                        >
                          <ChevronDown size={13} className={`text-gray-500 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                          <span className="text-sm font-medium truncate">{p.nome}</span>
                          <span className="text-[10px] text-gray-500 flex-shrink-0">{p.allowedPages.length} página{p.allowedPages.length === 1 ? "" : "s"}</span>
                        </button>
                        <span className="text-[10px] text-gray-500 flex-shrink-0">
                          {membrosCount} membro{membrosCount === 1 ? "" : "s"}
                        </span>
                        <button onClick={() => handleRenomearPerfil(p)} className="text-gray-600 hover:text-gray-300 flex-shrink-0">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => handleExcluirPerfil(p)} className="text-gray-600 hover:text-red-400 flex-shrink-0">
                          <X size={13} />
                        </button>
                      </div>

                      {expanded && (
                        <div className="mt-3 pt-3 border-t border-gray-800 grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                          {CRM_CATEGORIES.map(cat => {
                            const pages = cat.pages.filter(pg => !pg.managerOnly);
                            if (pages.length === 0) return null;
                            return (
                              <div key={cat.key} className="space-y-1">
                                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{cat.label}</p>
                                {pages.map(pg => (
                                  <label key={pg.key} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={p.allowedPages.includes(pg.key)}
                                      onChange={() => handleTogglePagina(p, pg.key)}
                                      className="rounded border-gray-700 bg-gray-900"
                                    />
                                    {pg.label}
                                  </label>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Lista de membros */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">
            Membros <span className="text-gray-500 font-normal text-sm">({members.length + 1})</span>
          </p>
          <div className="divide-y divide-gray-800">
            {/* Gestor */}
            <div className="flex items-center gap-3 px-5 py-3">
              <div className="w-9 h-9 rounded-full bg-amber-900/40 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Crown size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {manager.name} {manager.id === currentUserId && <span className="text-gray-500 font-normal">(você)</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">{manager.email}</p>
              </div>
              <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-900/40 text-amber-300 border border-amber-800/50 flex-shrink-0">
                Gestor
              </span>
            </div>

            {/* Atendentes */}
            {members.map(m => (
              <div key={m.memberId} className="flex items-center gap-3 px-5 py-3 flex-wrap">
                <div className="w-9 h-9 rounded-full bg-blue-900/40 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <User size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.name} {m.profileId === currentUserId && <span className="text-gray-500 font-normal">(você)</span>}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {m.email} · entrou em {new Date(m.joinedAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                {isManager && departamentos.length > 0 ? (
                  <select
                    value={m.departamentoId ?? ""}
                    onChange={e => handleSetDepartamento(m.memberId, e.target.value)}
                    className="text-xs bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 flex-shrink-0 max-w-[130px]"
                    title="Departamento do atendente"
                  >
                    <option value="">Sem departamento</option>
                    {departamentos.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-blue-900/40 text-blue-300 border border-blue-800/50 flex-shrink-0">
                    {departamentos.find(d => d.id === m.departamentoId)?.nome ?? "Atendente"}
                  </span>
                )}
                {isManager && perfis.length > 0 && (
                  <select
                    value={m.accessProfileId ?? ""}
                    onChange={e => handleSetPerfil(m.memberId, e.target.value)}
                    className="text-xs bg-gray-950 border border-gray-800 rounded-lg px-2 py-1.5 flex-shrink-0 max-w-[130px]"
                    title="Perfil de acesso no CRM"
                  >
                    <option value="">Acesso total</option>
                    {perfis.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                )}
                {isManager && (
                  <button
                    onClick={() => handleRemove(m)}
                    disabled={removing === m.memberId}
                    title="Remover da equipe"
                    className="text-gray-600 hover:text-red-400 disabled:opacity-50 flex-shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <p className="text-sm text-gray-500 px-5 py-6 text-center">
                Nenhum atendente ainda — envie o link de convite acima para adicionar o primeiro.
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Atendentes veem e respondem as conversas do CRM (as atribuídas a eles e as sem dono), mas não alteram as
          configurações dos agentes. Remover alguém não apaga a conta da pessoa — só o acesso à equipe.
        </p>
      </div>
    </div>
  );
}
