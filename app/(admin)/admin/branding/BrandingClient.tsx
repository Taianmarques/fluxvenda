"use client";

import { useRef, useState } from "react";
import { Palette, Upload, RotateCcw, Image as ImageIcon } from "lucide-react";

const MAX_LOGO_MB = 2;
const MAX_ICON_MB = 4;

function readFileAsBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      resolve({ base64: dataUrl.split(",")[1] ?? "", mimeType: file.type });
    };
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

export function BrandingClient({ initialMenuLogo, initialPwaIconPreview, updatedAt, updatedByEmail }: {
  initialMenuLogo: string | null;
  initialPwaIconPreview: string | null;
  updatedAt: string | null;
  updatedByEmail: string | null;
}) {
  const [menuLogo, setMenuLogo] = useState(initialMenuLogo);
  const [pwaIconPreview, setPwaIconPreview] = useState(initialPwaIconPreview);
  const [logoUploading, setLogoUploading] = useState(false);
  const [iconUploading, setIconUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [iconError, setIconError] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);
  const iconInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(file: File) {
    setLogoError("");
    if (file.size > MAX_LOGO_MB * 1024 * 1024) {
      setLogoError(`Imagem muito grande (máx. ${MAX_LOGO_MB}MB).`);
      return;
    }
    setLogoUploading(true);
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      const res = await fetch("/api/admin/branding/menu-logo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar a logo.");
      setMenuLogo(data.menuLogo);
    } catch (e) {
      setLogoError(e instanceof Error ? e.message : "Erro ao enviar a logo.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoReset() {
    setLogoUploading(true);
    setLogoError("");
    try {
      await fetch("/api/admin/branding/menu-logo", { method: "DELETE" });
      setMenuLogo(null);
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleIconUpload(file: File) {
    setIconError("");
    if (file.size > MAX_ICON_MB * 1024 * 1024) {
      setIconError(`Imagem muito grande (máx. ${MAX_ICON_MB}MB).`);
      return;
    }
    setIconUploading(true);
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      const res = await fetch("/api/admin/branding/pwa-icon", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao enviar o ícone.");
      setPwaIconPreview(data.pwaIconPreview);
    } catch (e) {
      setIconError(e instanceof Error ? e.message : "Erro ao enviar o ícone.");
    } finally {
      setIconUploading(false);
    }
  }

  async function handleIconReset() {
    setIconUploading(true);
    setIconError("");
    try {
      await fetch("/api/admin/branding/pwa-icon", { method: "DELETE" });
      setPwaIconPreview(null);
    } finally {
      setIconUploading(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <p className="text-gray-400 text-sm">Super Admin</p>
          <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><Palette size={28} className="text-red-400" /> Marca</h1>
          <p className="text-gray-400 mt-1">Logo do menu do CRM e ícone do app (PWA) usados em toda a plataforma.</p>
          {updatedAt && (
            <p className="text-xs text-gray-600 mt-1">Última atualização em {updatedAt}{updatedByEmail && ` por ${updatedByEmail}`}</p>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <p className="font-semibold">Logo do menu (CRM)</p>
            <p className="text-xs text-gray-500 mt-1">Aparece no topo da barra lateral do CRM, ao lado do nome &quot;FluxVenda&quot;. Sem redimensionamento — envie já no tamanho certo.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {menuLogo ? (
                <img src={menuLogo} alt="Logo do menu" className="w-full h-full object-contain" />
              ) : (
                <img src="/iconefluxvenda.png" alt="Logo padrão" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{menuLogo ? "Logo customizada" : "Usando o ícone padrão do FluxVenda"}</p>
              {logoError && <p className="text-xs text-red-400">{logoError}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
            <button
              onClick={() => logoInputRef.current?.click()}
              disabled={logoUploading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <Upload size={15} /> {logoUploading ? "Enviando..." : "Enviar nova logo"}
            </button>
            {menuLogo && (
              <button
                onClick={handleLogoReset}
                disabled={logoUploading}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
              >
                <RotateCcw size={14} /> Usar padrão
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div>
            <p className="font-semibold">Ícone do app (PWA)</p>
            <p className="text-xs text-gray-500 mt-1">Usado quando atendentes adicionam o CRM à tela inicial do celular. Envie uma imagem quadrada — os tamanhos 192px, 512px e a versão &quot;maskable&quot; (Android) são gerados automaticamente.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {pwaIconPreview ? (
                <img src={pwaIconPreview} alt="Ícone do app" className="w-full h-full object-contain" />
              ) : (
                <img src="/icon-512.png" alt="Ícone padrão" className="w-full h-full object-contain" />
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-gray-500">{pwaIconPreview ? "Ícone customizado" : "Usando o ícone padrão do FluxVenda"}</p>
              {iconError && <p className="text-xs text-red-400">{iconError}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input ref={iconInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = ""; }} />
            <button
              onClick={() => iconInputRef.current?.click()}
              disabled={iconUploading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium"
            >
              <ImageIcon size={15} /> {iconUploading ? "Processando..." : "Enviar novo ícone"}
            </button>
            {pwaIconPreview && (
              <button
                onClick={handleIconReset}
                disabled={iconUploading}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white disabled:opacity-50"
              >
                <RotateCcw size={14} /> Usar padrão
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
