import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { saveFormImage } from "@/lib/media-store";

// Upload de imagem ilustrativa de pergunta do formulário (editor do super admin e do CRM). Só exige
// login — a imagem só passa a aparecer quando um gestor salva o formulário apontando pra ela.
// Chega já reduzida pelo navegador, como data URL.
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null) as { dataUrl?: unknown } | null;
  if (typeof body?.dataUrl !== "string") return NextResponse.json({ error: "Imagem inválida" }, { status: 400 });
  try {
    return NextResponse.json({ url: await saveFormImage(body.dataUrl) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Não foi possível salvar a imagem" }, { status: 400 });
  }
}
