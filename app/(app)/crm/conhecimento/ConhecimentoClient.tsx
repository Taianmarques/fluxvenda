"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Pencil, Trash2, Upload, Loader2 } from "lucide-react";

type Item = { id: string; titulo: string; conteudo: string; active: boolean };

const MAX_ITENS = 20;
const MAX_CONTEUDO = 4000;

export function ConhecimentoClient({ agentId, isManager, itens }: { agentId: string; isManager: boolean; itens: Item[] }) {
  const router = useRouter();

  const [showNovo, setShowNovo] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novoConteudo, setNovoConteudo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editConteudo, setEditConteudo] = useState("");

  // Importar de arquivo: txt/md lidos no navegador; pdf/docx extraídos no servidor.
  // O texto cai no campo do form que estiver aberto (novo ou edição) pra revisão.
  const fileRef = useRef<HTMLInputElement>(null);
  const [importando, setImportando] = useState(false);

  function aplicarTextoImportado(texto: string, fileName: string) {
    const cortado = texto.length > MAX_CONTEUDO;
    const conteudo = texto.slice(0, MAX_CONTEUDO);
    const tituloDoArquivo = fileName.replace(/\.[^.]+$/, "").slice(0, 80);
    if (editandoId) {
      setEditConteudo(conteudo);
      if (!editTitulo.trim()) setEditTitulo(tituloDoArquivo);
    } else {
      setNovoConteudo(conteudo);
      if (!novoTitulo.trim()) setNovoTitulo(tituloDoArquivo);
      setShowNovo(true);
    }
    setErro(cortado ? `O texto do arquivo passou de ${MAX_CONTEUDO.toLocaleString("pt-BR")} caracteres e foi cortado — revise e, se precisar, divida o restante em outros conteúdos.` : "");
  }

  async function handleImportarArquivo(file: File) {
    setImportando(true);
    setErro("");
    try {
      const nome = file.name.toLowerCase();
      if (nome.endsWith(".txt") || nome.endsWith(".md")) {
        const texto = (await file.text()).trim();
        if (!texto) { setErro("O arquivo está vazio."); return; }
        aplicarTextoImportado(texto, file.name);
        return;
      }
      if (nome.endsWith(".pdf") || nome.endsWith(".docx")) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/agentes/${agentId}/conhecimento/extrair`, { method: "POST", body: form });
        const data = await res.json().catch(() => ({} as { texto?: string; error?: string }));
        if (!res.ok || !data.texto) { setErro(data.error ?? "Não foi possível extrair o texto do arquivo."); return; }
        aplicarTextoImportado(data.texto, file.name);
        return;
      }
      setErro("Formato não suportado — use .txt, .md, .pdf ou .docx.");
    } finally {
      setImportando(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleCriar() {
    if (!novoTitulo.trim() || !novoConteudo.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/conhecimento`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: novoTitulo.trim(), conteudo: novoConteudo.trim() }),
      });
      const data = await res.json().catch(() => ({} as { error?: string }));
      if (!res.ok) { setErro(data.error ?? "Não foi possível salvar."); return; }
      setNovoTitulo("");
      setNovoConteudo("");
      setShowNovo(false);
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  function iniciarEdicao(item: Item) {
    setEditandoId(item.id);
    setEditTitulo(item.titulo);
    setEditConteudo(item.conteudo);
    setErro("");
  }

  async function handleSalvarEdicao() {
    if (!editandoId || !editTitulo.trim() || !editConteudo.trim()) return;
    setSalvando(true);
    setErro("");
    try {
      const res = await fetch(`/api/agentes/${agentId}/conhecimento/${editandoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: editTitulo.trim(), conteudo: editConteudo.trim() }),
      });
      if (res.ok) { setEditandoId(null); router.refresh(); }
      else { const data = await res.json().catch(() => ({} as { error?: string })); setErro(data.error ?? "Não foi possível salvar."); }
    } finally {
      setSalvando(false);
    }
  }

  async function handleToggle(item: Item) {
    await fetch(`/api/agentes/${agentId}/conhecimento/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !item.active }),
    });
    router.refresh();
  }

  async function handleExcluir(item: Item) {
    if (!confirm(`Excluir o conteúdo "${item.titulo}"? A IA deixa de usá-lo imediatamente.`)) return;
    await fetch(`/api/agentes/${agentId}/conhecimento/${item.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="text-gray-400 text-sm">Configurações</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-1 flex items-center gap-2">
              <BookOpen size={26} className="text-blue-400" /> Conhecimento da IA
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Cadastre FAQs, regras de negócio e informações da empresa. A IA usa esses conteúdos
              para responder os clientes no WhatsApp com mais precisão.
            </p>
          </div>
          {isManager && itens.length < MAX_ITENS && (
            <div className="flex gap-2 flex-wrap">
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.md,.pdf,.docx"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImportarArquivo(f); }}
              />
              <button
                onClick={() => setShowNovo(s => !s)}
                className="flex items-center gap-1.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 transition-colors"
              >
                <Plus size={14} /> Novo conteúdo
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={importando}
                title="Importa o texto de um arquivo .txt, .md, .pdf ou .docx pro conteúdo (você revisa antes de salvar)"
                className="flex items-center gap-1.5 text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-600/50 disabled:opacity-50 rounded-xl px-4 py-2 transition-colors"
              >
                {importando ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {importando ? "Extraindo..." : "Importar de arquivo"}
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-600">
          {itens.length} de {MAX_ITENS} conteúdos · até {MAX_CONTEUDO.toLocaleString("pt-BR")} caracteres cada ·
          conteúdos inativos não são usados pela IA · importa .txt, .md, .pdf e .docx (PDF escaneado não é suportado).
        </p>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        {showNovo && isManager && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-2">
            <input
              value={novoTitulo}
              onChange={e => setNovoTitulo(e.target.value)}
              placeholder="Título (ex: Horários de funcionamento, Política de troca...)"
              maxLength={80}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
            />
            <textarea
              value={novoConteudo}
              onChange={e => setNovoConteudo(e.target.value)}
              rows={6}
              maxLength={MAX_CONTEUDO}
              placeholder="Escreva o conteúdo que a IA deve saber..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={handleCriar}
                  disabled={salvando || !novoTitulo.trim() || !novoConteudo.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  {salvando ? "Salvando..." : "Salvar"}
                </button>
                <button onClick={() => setShowNovo(false)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
              </div>
              <span className="text-[10px] text-gray-600">{novoConteudo.length}/{MAX_CONTEUDO}</span>
            </div>
          </div>
        )}

        {itens.length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-2xl p-10 text-center space-y-2">
            <BookOpen size={36} className="mx-auto text-gray-600" />
            <p className="text-sm text-gray-500">
              Nenhum conteúdo ainda. {isManager ? "Adicione o primeiro — horários, políticas, diferenciais, respostas pra perguntas frequentes." : "O gestor ainda não cadastrou conteúdos."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {itens.map(item => (
              <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                {editandoId === item.id ? (
                  <div className="space-y-2">
                    <input
                      value={editTitulo}
                      onChange={e => setEditTitulo(e.target.value)}
                      maxLength={80}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                    <textarea
                      value={editConteudo}
                      onChange={e => setEditConteudo(e.target.value)}
                      rows={6}
                      maxLength={MAX_CONTEUDO}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={handleSalvarEdicao}
                          disabled={salvando || !editTitulo.trim() || !editConteudo.trim()}
                          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg px-3 py-1.5 text-xs font-medium"
                        >
                          {salvando ? "Salvando..." : "Salvar"}
                        </button>
                        <button onClick={() => setEditandoId(null)} className="text-xs text-gray-400 hover:text-gray-200 px-2">Cancelar</button>
                      </div>
                      <span className="text-[10px] text-gray-600">{editConteudo.length}/{MAX_CONTEUDO}</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <p className={`flex-1 text-sm font-semibold truncate ${!item.active ? "text-gray-500" : ""}`}>{item.titulo}</p>
                      {!item.active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 flex-shrink-0">Inativo</span>
                      )}
                      {isManager && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => handleToggle(item)} className="text-xs text-gray-400 hover:text-white px-1.5">
                            {item.active ? "Desativar" : "Ativar"}
                          </button>
                          <button onClick={() => iniciarEdicao(item)} title="Editar" className="text-gray-500 hover:text-white p-1">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleExcluir(item)} title="Excluir" className="text-gray-500 hover:text-red-400 p-1">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 whitespace-pre-wrap ${item.active ? "text-gray-400" : "text-gray-600"}`}>{item.conteudo}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
