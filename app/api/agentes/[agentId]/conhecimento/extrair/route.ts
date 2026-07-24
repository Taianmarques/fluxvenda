import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getAgentConfigAsManager } from "@/lib/team";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
// Devolve mais que o limite de um item (4.000) de propósito: o cliente corta e avisa,
// e o gestor pode dividir o excedente em outros itens
const MAX_TEXTO_CHARS = 50_000;

// Extrai texto de PDF/DOCX pro conteúdo da base de conhecimento (txt/md são lidos no
// navegador, sem passar por aqui). O arquivo não é salvo — só vira texto.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { agentId } = await params;
  const config = await getAgentConfigAsManager(userId, agentId);
  if (!config) return NextResponse.json({ error: "Só o gestor edita o conhecimento da IA" }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
  if (file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Arquivo grande demais (máx. 10MB)" }, { status: 413 });

  const nome = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    let texto = "";

    if (nome.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(buffer) });
      try {
        const result = await parser.getText();
        texto = result.text ?? "";
      } finally {
        await parser.destroy().catch(() => {});
      }
    } else if (nome.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      texto = result.value ?? "";
    } else {
      return NextResponse.json({ error: "Formato não suportado — use PDF ou DOCX (txt/md são lidos direto no navegador)" }, { status: 400 });
    }

    texto = texto
      .replace(/^-- \d+ of \d+ --$/gm, "") // separador de página do pdf-parse v2
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!texto) {
      return NextResponse.json({ error: "Não encontrei texto nesse arquivo. PDF escaneado (imagem) não é suportado." }, { status: 422 });
    }

    return NextResponse.json({ texto: texto.slice(0, MAX_TEXTO_CHARS) });
  } catch (err) {
    console.error("[conhecimento/extrair]", err);
    return NextResponse.json({ error: "Não foi possível extrair o texto do arquivo." }, { status: 422 });
  }
}
