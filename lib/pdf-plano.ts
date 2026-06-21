import jsPDF from "jspdf";

type PlanMeta = {
  companyName: string;
  segment?: string | null;
};

const MARGIN = 18;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function stripBold(text: string) {
  return text.replace(/\*\*(.+?)\*\*/g, "$1");
}

export function downloadPlano90PDF(content: string, meta: PlanMeta) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN;

  function ensureSpace(height: number) {
    if (y + height > PAGE_HEIGHT - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function addText(text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) {
    const { size = 10.5, bold = false, color = [40, 40, 40], gap = 4 } = opts;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, CONTENT_WIDTH);
    const lineHeight = size * 0.42;
    ensureSpace(lines.length * lineHeight + gap);
    doc.text(lines, MARGIN, y);
    y += lines.length * lineHeight + gap;
  }

  // Cabeçalho
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, PAGE_WIDTH, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("Plano de Ação — Próximos 90 Dias", MARGIN, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text(`${meta.companyName}${meta.segment ? " · " + meta.segment : ""}`, MARGIN, 24);

  y = 40;
  doc.setTextColor(130, 130, 130);
  doc.setFontSize(9);
  doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`, MARGIN, y);
  y += 9;

  const lines = content.split("\n");
  let bullets: string[] = [];

  function flushBullets() {
    bullets.forEach((b) => addText(`•  ${stripBold(b)}`, { size: 10, gap: 2.5 }));
    bullets = [];
  }

  lines.forEach((raw) => {
    const line = raw.trim();

    if (!line) {
      flushBullets();
      return;
    }

    const headerMatch = line.match(/^\*\*(.+?)\*?\*?:?$/);
    if (headerMatch && line.startsWith("**") && !line.includes(" **")) {
      flushBullets();
      const title = headerMatch[1].replace(/\*+$/, "").replace(/:$/, "");
      y += 2;
      ensureSpace(11);
      doc.setDrawColor(225, 225, 225);
      doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
      y += 5;
      addText(title.toUpperCase(), { size: 12, bold: true, color: [20, 20, 20], gap: 3 });
      return;
    }

    if (/^[-•]\s/.test(line)) {
      bullets.push(line.replace(/^[-•]\s*/, ""));
      return;
    }

    const labelMatch = line.match(/^([^:]{3,30}):\s+(.+)$/);
    if (labelMatch && !line.startsWith("**")) {
      flushBullets();
      addText(`${labelMatch[1]}: ${stripBold(labelMatch[2])}`, { size: 10, gap: 2.5 });
      return;
    }

    flushBullets();
    addText(stripBold(line), { size: 10, gap: 3 });
  });
  flushBullets();

  const filename = `plano-90-dias-${meta.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
  doc.save(filename);
}
