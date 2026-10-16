"use client";

import { useState } from "react";
import { Check, Copy, ImagePlus, X, Palette, Gift, MessageCircle, ShieldCheck, Tags, BarChart3, Link2, Target } from "lucide-react";
import type { FormStats } from "@/lib/lead-form-stats";
import { DEFAULT_ACCENT, CONVERSION_EVENTS, buildPixelSnippet } from "@/lib/lead-form-shared";

// Seções extras do editor de formulário (aparência, entrega da isca, plano B no WhatsApp,
// consentimento, organização no CRM, links de rastreio e desempenho) — separadas de
// FormularioEditorClient pra ele não crescer demais. Estado fica no editor (controlado).

export type FormExtras = {
  accentColor: string;
  coverUrl: string | null;
  ctaLabel: string;
  ctaUrl: string;
  waNumber: string;
  waButtonText: string;
  conversionUrl: string;
  conversionEvent: string;
  consentText: string;
  etiquetaId: string | null;
  pipelineStageId: string | null;
};

export type CrmFormOptions = {
  etiquetas: { id: string; nome: string }[];
  stages: { id: string; nome: string; pipeline: string }[];
};

const inputCls = "w-full mt-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-600";
const labelCls = "text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1.5";

const ACCENT_PRESETS = ["#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#16a34a", "#0d9488", "#111827"];

// Redimensiona no navegador antes de mandar — a capa vira base64 salvo no banco
function resizeCover(file: File, maxWidth = 1200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas indisponível")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Box({ icon, title, hint, children }: { icon: React.ReactNode; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-800 rounded-xl p-4 space-y-3">
      <div>
        <p className={labelCls}>{icon} {title}</p>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function ExtrasPanel({
  value, onChange, isCrm, crmOptions, onError, pixelId,
}: {
  value: FormExtras;
  onChange: (patch: Partial<FormExtras>) => void;
  isCrm: boolean;
  crmOptions?: CrmFormOptions;
  onError: (msg: string) => void;
  pixelId: string;
}) {
  const [snippetCopied, setSnippetCopied] = useState(false);
  const snippet = buildPixelSnippet(pixelId.trim() || "SEU_PIXEL_ID", value.conversionEvent);
  function copySnippet() {
    navigator.clipboard.writeText(snippet).then(() => {
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 1500);
    });
  }

  async function handleCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      onChange({ coverUrl: await resizeCover(file) });
    } catch {
      onError("Não deu pra processar essa imagem.");
    }
  }

  return (
    <>
      <Box icon={<Palette size={12} />} title="Aparência" hint="Cor dos botões e balões e imagem de capa no topo — deixa o formulário com a cara da sua marca.">
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_PRESETS.map(c => (
            <button
              key={c} type="button" onClick={() => onChange({ accentColor: c })} title={c}
              className={`w-7 h-7 rounded-full border-2 ${value.accentColor.toLowerCase() === c ? "border-white ring-2 ring-blue-500" : "border-gray-700"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <input
            type="color" value={/^#[0-9a-fA-F]{6}$/.test(value.accentColor) ? value.accentColor : DEFAULT_ACCENT}
            onChange={e => onChange({ accentColor: e.target.value })}
            className="w-9 h-7 bg-transparent border border-gray-700 rounded cursor-pointer" title="Outra cor"
          />
          <span className="text-xs font-mono text-gray-500">{value.accentColor}</span>
        </div>
        <div className="flex items-center gap-3">
          {value.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.coverUrl} alt="" className="h-14 w-28 rounded-lg object-cover border border-gray-800" />
          ) : (
            <div className="h-14 w-28 rounded-lg bg-gray-950 border border-dashed border-gray-700 flex items-center justify-center text-gray-600">
              <ImagePlus size={18} />
            </div>
          )}
          <label className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400 cursor-pointer">
            {value.coverUrl ? "Trocar capa" : "Enviar capa"}
            <input type="file" accept="image/*" onChange={handleCover} className="hidden" />
          </label>
          {value.coverUrl && (
            <button type="button" onClick={() => onChange({ coverUrl: null })} className="p-1.5 rounded-lg hover:bg-gray-800 text-red-400" title="Remover">
              <X size={14} />
            </button>
          )}
        </div>
      </Box>

      <Box
        icon={<Gift size={12} />} title="Entrega da isca"
        hint="Botão na tela final pra entregar o que prometeu (e-book, aula, grupo, planilha...). O mesmo link pode ir na mensagem do WhatsApp com {{link}}."
      >
        <div className="grid sm:grid-cols-[1fr_2fr] gap-2">
          <div>
            <label className="text-xs text-gray-500">Texto do botão</label>
            <input value={value.ctaLabel} onChange={e => onChange({ ctaLabel: e.target.value })} maxLength={40} placeholder="Baixar o e-book" className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Link (https://...)</label>
            <input value={value.ctaUrl} onChange={e => onChange({ ctaUrl: e.target.value })} maxLength={500} placeholder="https://..." className={`${inputCls} font-mono`} />
          </div>
        </div>
      </Box>

      <Box
        icon={<Target size={12} />} title="Página de conversão (site externo)"
        hint="O pixel só enxerga páginas onde está instalado. Informe a página do seu site onde a conversão acontece: o lead é levado pra lá ao concluir (com fbclid e utm) e, com o código abaixo colado nela, o Meta registra a conversão."
      >
        <div className="grid sm:grid-cols-[2fr_1fr] gap-2">
          <div>
            <label className="text-xs text-gray-500">Página (https://...)</label>
            <input value={value.conversionUrl} onChange={e => onChange({ conversionUrl: e.target.value })} maxLength={500} placeholder="https://meusite.com.br/obrigado" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Evento do pixel</label>
            <select value={value.conversionEvent} onChange={e => onChange({ conversionEvent: e.target.value })} className={inputCls}>
              {CONVERSION_EVENTS.map(ev => <option key={ev.value} value={ev.value}>{ev.label}</option>)}
            </select>
          </div>
        </div>
        {value.conversionUrl.trim() && (
          <div className="space-y-2">
            {!pixelId.trim() && (
              <p className="text-xs text-yellow-400">Preencha o ID do Pixel do formulário (campo acima) — o código abaixo usa ele.</p>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">Cole no &lt;head&gt; da página acima:</p>
              <button type="button" onClick={copySnippet} className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400">
                {snippetCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} Copiar código
              </button>
            </div>
            <pre className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-[11px] font-mono text-gray-400 overflow-x-auto max-h-48">{snippet}</pre>
          </div>
        )}
      </Box>

      <Box
        icon={<MessageCircle size={12} />} title="Plano B no WhatsApp"
        hint="Botão &quot;falar no WhatsApp&quot; na tela final. Se a mensagem automática não conseguir sair (número errado, WhatsApp desconectado), é por ele que o lead chega até você."
      >
        <div className="grid sm:grid-cols-[2fr_1fr] gap-2">
          <div>
            <label className="text-xs text-gray-500">Seu WhatsApp (DDD + número)</label>
            <input value={value.waNumber} onChange={e => onChange({ waNumber: e.target.value })} maxLength={20} placeholder="11999999999" inputMode="tel" className={`${inputCls} font-mono`} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Texto do botão</label>
            <input value={value.waButtonText} onChange={e => onChange({ waButtonText: e.target.value })} maxLength={40} placeholder="Falar no WhatsApp" className={inputCls} />
          </div>
        </div>
      </Box>

      <Box
        icon={<ShieldCheck size={12} />} title="Consentimento (LGPD)"
        hint="Se preencher, o lead precisa marcar essa caixinha antes de informar o WhatsApp — e a data do aceite fica registrada. Deixe vazio pra não pedir."
      >
        <textarea
          value={value.consentText} onChange={e => onChange({ consentText: e.target.value })} rows={2} maxLength={500}
          placeholder="Concordo em receber mensagens no WhatsApp sobre este conteúdo."
          className={inputCls}
        />
      </Box>

      {isCrm && crmOptions && (
        <Box
          icon={<Tags size={12} />} title="Organização no CRM"
          hint="Quando a primeira mensagem sai, o lead já entra com a etiqueta e na etapa do pipeline escolhidas (e uma nota com a origem na conversa)."
        >
          <div className="grid sm:grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500">Etiqueta</label>
              <select value={value.etiquetaId ?? ""} onChange={e => onChange({ etiquetaId: e.target.value || null })} className={inputCls}>
                <option value="">Nenhuma</option>
                {crmOptions.etiquetas.map(et => <option key={et.id} value={et.id}>{et.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Etapa do pipeline</label>
              <select value={value.pipelineStageId ?? ""} onChange={e => onChange({ pipelineStageId: e.target.value || null })} className={inputCls}>
                <option value="">Não criar oportunidade</option>
                {crmOptions.stages.map(s => <option key={s.id} value={s.id}>{s.pipeline} › {s.nome}</option>)}
              </select>
            </div>
          </div>
          {crmOptions.etiquetas.length === 0 && (
            <p className="text-xs text-gray-500">Você ainda não tem etiquetas — crie nas Mensagens pra poder escolher uma aqui.</p>
          )}
        </Box>
      )}
    </>
  );
}

// Links com origem já embutida: cada um conta como uma fonte diferente no desempenho
const ORIGENS = [
  { label: "Bio do Instagram", source: "instagram_bio" },
  { label: "Stories", source: "instagram_stories" },
  { label: "Comentário → DM", source: "instagram_comentario" },
  { label: "Anúncio", source: "anuncio" },
  { label: "YouTube", source: "youtube" },
  { label: "TikTok", source: "tiktok" },
  { label: "E-mail", source: "email" },
];

export function TrackingLinks({ slug }: { slug: string }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(source: string) {
    navigator.clipboard.writeText(`${window.location.origin}/formulario/${slug}?utm_source=${source}`).then(() => {
      setCopied(source);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <Box
      icon={<Link2 size={12} />} title="Links por origem"
      hint="Use um link diferente em cada lugar onde divulgar — o desempenho abaixo mostra quantas pessoas vieram de cada um. Salve o formulário antes se mudou o link."
    >
      <div className="flex flex-wrap gap-2">
        {ORIGENS.map(o => (
          <button
            key={o.source} type="button" onClick={() => copy(o.source)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400"
          >
            {copied === o.source ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} {o.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500">Também funciona com seus próprios <span className="font-mono">?utm_source=...&amp;utm_campaign=...</span>.</p>
    </Box>
  );
}

// Cores das duas séries do gráfico diário — validadas pro fundo escuro do editor (lightness,
// separação pra daltonismo e contraste); legenda + tooltip garantem que não dependem só da cor
const COR_VISITAS = "#3b82f6";
const COR_INSCRICOES = "#059669";

function diaCurto(dia: string): string {
  const [, m, d] = dia.split("-");
  return `${d}/${m}`;
}

function AcessosPorDia({ porDia }: { porDia: FormStats["porDia"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [tabela, setTabela] = useState(false);
  const max = Math.max(1, ...porDia.map(d => Math.max(d.visitas, d.inscricoes)));
  const totalVisitas = porDia.reduce((a, d) => a + d.visitas, 0);
  const totalInscricoes = porDia.reduce((a, d) => a + d.inscricoes, 0);
  const h = hover != null ? porDia[hover] : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide">Acessos por dia — últimos {porDia.length} dias</p>
          <p className="text-sm text-gray-300 mt-0.5">{totalVisitas} visitas · {totalInscricoes} inscrições</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_VISITAS }} /> Visitas</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COR_INSCRICOES }} /> Inscrições</span>
          <button type="button" onClick={() => setTabela(t => !t)} className="text-blue-400 hover:text-blue-300">
            {tabela ? "Ver gráfico" : "Ver tabela"}
          </button>
        </div>
      </div>

      {tabela ? (
        <div className="max-h-64 overflow-y-auto text-sm">
          <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
            <span>Dia</span><span className="text-right">Visitas</span><span className="text-right">Inscrições</span>
          </div>
          {[...porDia].reverse().map(d => (
            <div key={d.dia} className="grid grid-cols-3 gap-2 px-2 py-1 border-b border-gray-800/60 last:border-0">
              <span className="text-gray-300">{diaCurto(d.dia)}</span>
              <span className="text-right text-gray-400 tabular-nums">{d.visitas}</span>
              <span className="text-right text-gray-400 tabular-nums">{d.inscricoes}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Tooltip do dia sob o cursor */}
          {h && hover != null && (
            <div
              className="absolute -top-1 z-10 -translate-x-1/2 -translate-y-full pointer-events-none bg-gray-950 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs shadow-lg whitespace-nowrap"
              style={{ left: `${((hover + 0.5) / porDia.length) * 100}%` }}
            >
              <p className="font-semibold text-gray-200">{diaCurto(h.dia)}</p>
              <p className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: COR_VISITAS }} /> {h.visitas} visitas</p>
              <p className="text-gray-400 flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ backgroundColor: COR_INSCRICOES }} /> {h.inscricoes} inscrições</p>
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex flex-col justify-between text-[10px] text-gray-500 tabular-nums h-32 py-0.5 text-right w-6 flex-shrink-0">
              <span>{max}</span><span>0</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-32 flex items-end border-b border-gray-700" onMouseLeave={() => setHover(null)}>
                {porDia.map((d, i) => (
                  // Coluna inteira é a área de hover (maior que as barras finas)
                  <div
                    key={d.dia}
                    onMouseEnter={() => setHover(i)}
                    className={`flex-1 h-full flex items-end justify-center gap-[2px] px-[1px] ${hover === i ? "bg-gray-800/60" : ""}`}
                  >
                    <div className="w-full max-w-[8px] rounded-t-[3px]" style={{ height: `${(d.visitas / max) * 100}%`, backgroundColor: COR_VISITAS, minHeight: d.visitas ? 2 : 0 }} />
                    <div className="w-full max-w-[8px] rounded-t-[3px]" style={{ height: `${(d.inscricoes / max) * 100}%`, backgroundColor: COR_INSCRICOES, minHeight: d.inscricoes ? 2 : 0 }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                <span>{diaCurto(porDia[0].dia)}</span>
                <span>{diaCurto(porDia[Math.floor(porDia.length / 2)].dia)}</span>
                <span>Hoje</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pct(a: number, b: number): string {
  return b > 0 ? `${Math.round((a / b) * 100)}%` : "—";
}

export function StatsPanel({ stats, exportHref }: { stats: FormStats; exportHref: string }) {
  const maxResp = Math.max(1, ...stats.porPergunta.map(p => p.respostas));
  const cards = [
    { label: "Visitas", value: stats.visitas, sub: "abriram o link" },
    { label: "Iniciaram", value: stats.iniciaram, sub: pct(stats.iniciaram, stats.visitas) + " das visitas" },
    { label: "Concluíram", value: stats.concluiram, sub: pct(stats.concluiram, stats.iniciaram) + " dos que iniciaram" },
    { label: "Mensagem enviada", value: stats.convitesEnviados, sub: stats.falhasEnvio > 0 ? `${stats.falhasEnvio} falharam` : "no WhatsApp" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold flex items-center gap-2"><BarChart3 size={18} /> Desempenho</h2>
        <a href={exportHref} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-700 text-gray-300 hover:border-blue-600 hover:text-blue-400">
          Exportar respostas (CSV)
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {cards.map(c => (
          <div key={c.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-gray-400">{c.label}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {stats.porDia.length > 0 && <AcessosPorDia porDia={stats.porDia} />}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">Onde as pessoas desistem</p>
        {stats.porPergunta.map((p, i) => (
          <div key={p.key}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-gray-300">{i + 1}. {p.label}</span>
              <span className="text-gray-500 flex-shrink-0">{p.respostas} ({pct(p.respostas, stats.iniciaram)})</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(p.respostas / maxResp) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {stats.porResultado.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Resultados do quiz</p>
          {stats.porResultado.map(r => {
            const total = stats.porResultado.reduce((a, b) => a + b.leads, 0);
            return (
              <div key={r.titulo}>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-gray-300">{r.titulo}</span>
                  <span className="text-gray-500 flex-shrink-0">{r.leads} ({pct(r.leads, total)})</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${total ? (r.leads / total) * 100 : 0}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {stats.porOrigem.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500 border-b border-gray-800">
            <span>Origem</span><span className="text-right">Visitas</span><span className="text-right">Respostas</span><span className="text-right">Concluíram</span>
          </div>
          {stats.porOrigem.map(o => (
            <div key={o.origem} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-2 px-4 py-2 text-sm border-b border-gray-800/60 last:border-0">
              <span className="truncate">{o.origem}</span>
              <span className="text-right text-gray-400">{o.visitas}</span>
              <span className="text-right text-gray-400">{o.respostas}</span>
              <span className="text-right text-gray-400">{o.concluiram}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
