"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import type { PerfilEmpresaDados, PerfilKey } from "@/lib/central-shared";

// Uma pergunta por tela. As 4 primeiras são as essenciais do perfil (sem elas não avança); as
// outras podem ser puladas. Cada resposta é salva ao avançar — se a pessoa sair no meio, o que
// respondeu já fica no perfil (e pode completar depois em "Minha Empresa").

type Pergunta = {
  key: PerfilKey;
  titulo: string;
  ajuda: string;
  placeholder: string;
  longa?: boolean;
  obrigatoria?: boolean;
  sugestoes?: string[];
  multipla?: boolean; // sugestões acumulam, separadas por vírgula
};

const PERGUNTAS: Pergunta[] = [
  { key: "nomeEmpresa", titulo: "Qual é o nome da sua empresa?", ajuda: "Do jeito que o cliente conhece.", placeholder: "Ex: Lava Rápido Brilho", obrigatoria: true },
  {
    key: "segmento", titulo: "Em qual segmento você atua?", ajuda: "Escolha uma opção ou escreva com as suas palavras.", placeholder: "Ex: estética automotiva", obrigatoria: true,
    sugestoes: ["Beleza e estética", "Saúde e bem-estar", "Alimentação", "Loja e varejo", "Moda", "Serviços", "Construção e reforma", "Móveis e decoração", "Automotivo", "Educação", "Indústria e distribuição"],
  },
  { key: "produtos", titulo: "O que você vende?", ajuda: "Seus principais produtos ou serviços e o preço aproximado de cada um.", placeholder: "Ex: lavagem completa (R$ 90), higienização interna (R$ 180), polimento (R$ 350)", longa: true, obrigatoria: true },
  { key: "publico", titulo: "Quem é o seu cliente ideal?", ajuda: "Quem mais compra de você: idade, perfil, região, o que procura.", placeholder: "Ex: donos de carro de 30 a 55 anos que usam o carro para trabalhar", longa: true, obrigatoria: true },
  { key: "ticketMedio", titulo: "Quanto um cliente costuma gastar com você?", ajuda: "Um valor médio por compra já ajuda.", placeholder: "Ex: R$ 180" },
  { key: "diferenciais", titulo: "Por que os clientes escolhem você?", ajuda: "O que você faz melhor que o concorrente.", placeholder: "Ex: busca e entrega do carro, produtos importados, garantia de 30 dias", longa: true },
  {
    key: "canais", titulo: "Por onde você vende hoje?", ajuda: "Marque todos que você usa.", placeholder: "Ex: WhatsApp, Instagram, loja física", multipla: true,
    sugestoes: ["WhatsApp", "Instagram", "Loja física", "Indicação", "Site", "Facebook", "Google", "Marketplace", "Vendedor externo"],
  },
  { key: "objetivos", titulo: "Qual é o seu principal objetivo de vendas para os próximos meses?", ajuda: "As ferramentas vão puxar as respostas nessa direção.", placeholder: "Ex: conseguir 20 clientes novos por mês e vender mais higienizações", longa: true },
];

const TOTAL = PERGUNTAS.length;
const DESTINO = "/inicio";

export function BoasVindasClient({ inicial, nome }: { inicial: PerfilEmpresaDados; nome: string }) {
  const [dados, setDados] = useState(inicial);
  const [passo, setPasso] = useState(-1); // -1 = tela de boas-vindas; TOTAL = concluído
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const campoRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  const p = passo >= 0 && passo < TOTAL ? PERGUNTAS[passo] : null;
  const valor = p ? dados[p.key] : "";

  useEffect(() => { campoRef.current?.focus(); }, [passo]);

  async function salvar(d: PerfilEmpresaDados) {
    const res = await fetch("/api/central/perfil", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).catch(() => null);
    if (!res?.ok) {
      const d = await res?.json().catch(() => ({}));
      throw new Error(d?.error ?? "Não foi possível salvar. Tente de novo.");
    }
  }

  async function avancar(pular = false) {
    if (!p || salvando) return;
    if (!pular && p.obrigatoria && !valor.trim()) { setErro("Responda para continuar — isso deixa as ferramentas com a cara do seu negócio."); return; }
    setErro(null);
    // Pular descarta o que foi digitado nesta pergunta e mantém o valor que já estava salvo
    const proximos = pular ? { ...dados, [p.key]: inicial[p.key] } : dados;
    setDados(proximos);
    setSalvando(true);
    try {
      await salvar(proximos);
      setPasso(n => n + 1);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function escolher(s: string) {
    if (!p) return;
    setErro(null);
    if (!p.multipla) { setDados(d => ({ ...d, [p.key]: s })); return; }
    const atuais = valor.split(",").map(v => v.trim()).filter(Boolean);
    const novos = atuais.includes(s) ? atuais.filter(v => v !== s) : [...atuais, s];
    setDados(d => ({ ...d, [p.key]: novos.join(", ") }));
  }
  const marcado = (s: string) => (p?.multipla ? valor.split(",").map(v => v.trim()).includes(s) : valor.trim() === s);

  const campoCls = "w-full rounded-2xl border border-white/15 bg-white/[.06] px-4 py-3.5 text-base text-white placeholder:text-white/35 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/25";
  const botaoPrimario = "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(79,70,229,.8)] disabled:opacity-60";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-[#0d1735] via-[#0b132c] to-[#0a1024] text-white">
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-8 md:py-12 min-h-dvh flex flex-col">
        {/* Cabeçalho: marca, contador e barra de progresso por pergunta */}
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold tracking-tight text-lg">Vendas <span className="text-blue-400">IA</span></span>
          {p && <span className="font-mono text-xs tracking-[0.18em] text-white/50">{String(passo + 1).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}</span>}
        </div>
        <div className="mt-6 flex gap-1.5" aria-hidden>
          {PERGUNTAS.map((_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < passo || passo >= TOTAL ? "bg-blue-400" : i === passo ? "bg-blue-400/70" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center py-10">
          {passo === -1 && (
            <div key="inicio" className="animate-[bv-in_.4s_ease-out]">
              <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-blue-300">Vendas IA · Primeiro acesso</p>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                Bem-vindo(a){nome ? `, ${nome}` : ""}! <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Vamos começar pelo seu negócio.</span>
              </h1>
              <p className="mt-5 text-lg text-white/70 leading-relaxed">
                São {TOTAL} perguntas rápidas sobre a sua empresa. Com elas, todas as ferramentas já chegam preenchidas e os prompts saem com a cara do seu negócio.
              </p>
              <button onClick={() => setPasso(0)} className={`${botaoPrimario} mt-8`}>Começar <ArrowRight size={16} /></button>
              <p className="mt-5 font-mono text-[11px] tracking-[0.14em] uppercase text-white/40">{TOTAL} perguntas · menos de 3 minutos · você só faz isso uma vez</p>
            </div>
          )}

          {p && (
            <form key={p.key} onSubmit={e => { e.preventDefault(); avancar(); }} className="animate-[bv-in_.4s_ease-out]">
              <label htmlFor="bv-campo" className="block text-3xl md:text-4xl font-bold tracking-tight leading-tight">{p.titulo}</label>
              <p className="mt-3 text-white/60">{p.ajuda}</p>

              {p.sugestoes && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {p.sugestoes.map(s => (
                    <button
                      key={s} type="button" onClick={() => escolher(s)} aria-pressed={marcado(s)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${marcado(s) ? "border-blue-400 bg-blue-500/20 text-white" : "border-white/15 text-white/75 hover:border-white/35 hover:text-white"}`}
                    >
                      {marcado(s) && <Check size={14} />} {s}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-6">
                {p.longa ? (
                  <textarea
                    id="bv-campo" ref={campoRef} rows={4} maxLength={2000} value={valor} placeholder={p.placeholder}
                    onChange={e => { setErro(null); setDados(d => ({ ...d, [p.key]: e.target.value })); }}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); avancar(); } }}
                    className={`${campoCls} resize-none`}
                  />
                ) : (
                  <input
                    id="bv-campo" ref={campoRef} maxLength={200} value={valor} placeholder={p.placeholder} autoComplete="off"
                    onChange={e => { setErro(null); setDados(d => ({ ...d, [p.key]: e.target.value })); }}
                    className={campoCls}
                  />
                )}
              </div>
              {erro && <p className="mt-3 text-sm text-red-300">{erro}</p>}

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button type="submit" disabled={salvando} className={botaoPrimario}>
                  {salvando ? <Loader2 size={16} className="animate-spin" /> : null}
                  {passo === TOTAL - 1 ? "Concluir" : "Continuar"} {!salvando && <ArrowRight size={16} />}
                </button>
                {!p.obrigatoria && (
                  <button type="button" onClick={() => avancar(true)} disabled={salvando} className="px-3 py-3 text-sm text-white/55 hover:text-white">Pular</button>
                )}
                {passo > 0 && (
                  <button type="button" onClick={() => { setErro(null); setPasso(n => n - 1); }} disabled={salvando} className="ml-auto inline-flex items-center gap-1.5 px-3 py-3 text-sm text-white/55 hover:text-white">
                    <ArrowLeft size={15} /> Voltar
                  </button>
                )}
              </div>
              {!p.longa && <p className="mt-4 hidden md:block font-mono text-[11px] tracking-[0.14em] uppercase text-white/30">Enter para continuar</p>}
            </form>
          )}

          {passo >= TOTAL && (
            <div key="fim" className="animate-[bv-in_.4s_ease-out]">
              <span className="w-14 h-14 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center"><Check size={28} /></span>
              <h1 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight leading-[1.08]">
                Perfil pronto{nome ? `, ${nome}` : ""}! <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Agora é com as ferramentas.</span>
              </h1>
              <p className="mt-5 text-lg text-white/70 leading-relaxed">
                Os formulários já vão chegar preenchidos com os dados da {dados.nomeEmpresa.trim() || "sua empresa"}. Você pode ajustar tudo quando quiser em “Minha Empresa”.
              </p>
              <a href={DESTINO} className={`${botaoPrimario} mt-8`}>Ir para a plataforma <ArrowRight size={16} /></a>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes bv-in { from { opacity: 0; transform: translateY(8px) } } @media (prefers-reduced-motion: reduce) { [class*="bv-in"] { animation: none !important } }`}</style>
    </main>
  );
}
