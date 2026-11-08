import { prisma } from "@/lib/prisma";

// Imagens, vídeos e arquivos que o Claude criou e guardou pelo conector (lib/mcp/biblioteca.ts)
export default async function BibliotecaAdminPage() {
  const midias = await prisma.bibliotecaMidia.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div className="p-6 md:p-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Biblioteca</h1>
        <p className="text-sm text-gray-400 mt-1">O que o Claude criou e guardou pela sua conexão de superadmin.</p>
      </header>

      {midias.length === 0 && <p className="text-sm text-gray-500">Nada guardado ainda.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {midias.map(m => {
          const src = `/api/midia/${m.arquivo}`;
          return (
            <div key={m.id} className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center">
                {m.mime.startsWith("image/") && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={src} alt={m.nome} className="w-full h-full object-contain" loading="lazy" />
                )}
                {m.mime.startsWith("video/") && <video src={src} controls preload="metadata" className="w-full h-full" />}
                {m.mime.startsWith("audio/") && <audio src={src} controls preload="none" className="w-full px-3" />}
                {m.mime === "application/pdf" && <span className="text-sm text-gray-500">PDF</span>}
              </div>
              <div className="p-3 space-y-1">
                <p className="text-sm font-medium truncate">{m.nome}</p>
                {m.descricao && <p className="text-xs text-gray-400 line-clamp-2">{m.descricao}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{m.createdAt.toLocaleDateString("pt-BR")} · {(m.tamanho / 1024 / 1024).toFixed(1)} MB</span>
                  <a href={src} download={m.nome} className="text-blue-400 hover:text-blue-300">Baixar</a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
