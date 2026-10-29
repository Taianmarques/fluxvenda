import { Fragment, type ReactNode } from "react";

// Renderizador mínimo do markdown que a IA devolve (##, listas, **negrito**, *itálico*) — monta
// elementos React, nunca HTML cru, então não há risco de injeção vindo do texto gerado.

function inline(texto: string): ReactNode[] {
  const partes = texto.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**") && p.length > 4) return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

export function Markdown({ texto }: { texto: string }) {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  const blocos: ReactNode[] = [];
  let lista: { tipo: "ul" | "ol"; itens: string[] } | null = null;
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length) {
      blocos.push(<p key={blocos.length} className="leading-relaxed">{paragrafo.flatMap((l, i) => (i ? [<br key={`b${i}`} />, ...inline(l)] : inline(l)))}</p>);
      paragrafo = [];
    }
  };
  const fecharLista = () => {
    if (lista) {
      const Tag = lista.tipo;
      blocos.push(
        <Tag key={blocos.length} className={`${Tag === "ul" ? "list-disc" : "list-decimal"} pl-5 space-y-1.5 marker:text-slate-400`}>
          {lista.itens.map((it, i) => <li key={i} className="leading-relaxed pl-1">{inline(it)}</li>)}
        </Tag>,
      );
      lista = null;
    }
  };

  let tabela: string[][] | null = null;
  const fecharTabela = () => {
    if (tabela && tabela.length) {
      const [cab, ...corpo] = tabela;
      blocos.push(
        <div key={blocos.length} className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-slate-50 text-slate-700">
              <tr>{cab.map((c, i) => <th key={i} className="px-3 py-2 font-semibold border-b border-slate-200 align-top">{inline(c)}</th>)}</tr>
            </thead>
            <tbody>
              {corpo.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  {cab.map((_c, j) => <td key={j} className="px-3 py-2 align-top">{inline(r[j] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    }
    tabela = null;
  };

  for (const bruta of linhas) {
    const l = bruta.trimEnd();
    // Tabela markdown: linhas "| a | b |"; a linha "|---|---|" é só separador
    if (/^\s*\|.*\|\s*$/.test(l)) {
      fecharParagrafo(); fecharLista();
      if (/^\s*\|[\s:|-]+\|\s*$/.test(l)) continue;
      const celulas = l.trim().slice(1, -1).split("|").map(c => c.trim());
      (tabela ??= []).push(celulas);
      continue;
    }
    fecharTabela();
    const titulo = l.match(/^(#{1,4})\s+(.*)$/);
    const ul = l.match(/^\s*[-*•]\s+(.*)$/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (!l.trim()) { fecharParagrafo(); fecharLista(); continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) { fecharParagrafo(); fecharLista(); blocos.push(<hr key={blocos.length} className="border-slate-200" />); continue; }
    if (titulo) {
      fecharParagrafo(); fecharLista();
      const nivel = titulo[1].length;
      blocos.push(
        nivel <= 2
          ? <h3 key={blocos.length} className="text-[15px] font-semibold text-slate-900 pt-2">{inline(titulo[2])}</h3>
          : <h4 key={blocos.length} className="text-sm font-semibold text-slate-800 pt-1">{inline(titulo[2])}</h4>,
      );
      continue;
    }
    if (ul || ol) {
      fecharParagrafo();
      const tipo = ul ? "ul" : "ol";
      if (lista && lista.tipo !== tipo) fecharLista();
      if (!lista) lista = { tipo, itens: [] };
      lista.itens.push((ul ?? ol)![1]);
      continue;
    }
    fecharLista();
    paragrafo.push(l);
  }
  fecharParagrafo(); fecharLista(); fecharTabela();

  return <div className="space-y-3 text-sm text-slate-600">{blocos}</div>;
}

// Texto puro pra "Copiar" — tira as marcações que não fazem sentido colado no WhatsApp/e-mail,
// mantendo o negrito no formato do WhatsApp (*texto*)
export function paraTextoPuro(texto: string) {
  return texto
    .replace(/^#{1,4}\s+(.*)$/gm, (_m, t: string) => `*${t.replace(/\*\*/g, "")}*`)
    .replace(/\*\*([^*]+)\*\*/g, "*$1*")
    .trim();
}
