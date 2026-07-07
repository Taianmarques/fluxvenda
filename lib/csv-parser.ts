// Parser de CSV para importações client-side (produtos, contatos de campanha, etc).
// Aceita ; ou , como separador (Excel brasileiro usa ;) e campos entre aspas.

export function normalizeCsvHeader(h: string): string {
  return h.normalize("NFD").replace(/[^a-zA-Z_ ]/g, "").toLowerCase().trim().replace(/\s+/g, "_");
}

export function parseCsv(text: string): Record<string, string>[] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(cur); cur = "";
    } else if (ch === "\n") {
      row.push(cur.replace(/\r$/, "")); rows.push(row); row = []; cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur !== "" || row.length > 0) { row.push(cur.replace(/\r$/, "")); rows.push(row); }

  const headerRow = rows.shift();
  if (!headerRow) return [];
  const headers = headerRow.map(normalizeCsvHeader);

  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// "R$ 1.234,56" → 1234.56 | "49.90" → 49.9
export function parseCsvPrice(v: string): number | null {
  const clean = v.replace(/[R$\s]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function downloadCsvTemplate(content: string, filename: string) {
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
