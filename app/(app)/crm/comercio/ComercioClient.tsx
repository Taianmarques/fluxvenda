"use client";

import { useRef, useState } from "react";
import { ShoppingCart, Settings, Copy, Image as ImageIcon, ExternalLink, Check } from "lucide-react";

const MAX_PHOTO_MB = 2;

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

type Product = { id: string; name: string; description: string; category?: string; price: number; precoPromocional?: number | null; stock: number | null; active: boolean; imagemBase64?: string | null; imagemMimeType?: string | null };
type Banner = { id?: string; dataUri: string; base64?: string; mimeType?: string; active: boolean };
type OrderItem = { id: string; name: string; unitPrice: number; quantity: number };
type Order = { id: string; contactName: string; contactNumber: string; status: string; total: number; asaasInvoiceUrl: string | null; createdAt: string; items: OrderItem[] };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  ABERTO: { label: "Aberto", color: "bg-gray-800 text-gray-400 border-gray-700" },
  AGUARDANDO_PAGAMENTO: { label: "Aguardando pagamento", color: "bg-yellow-900/40 text-yellow-300 border-yellow-800/50" },
  PAGO: { label: "Pago", color: "bg-green-900/40 text-green-300 border-green-800/50" },
  EM_PREPARO: { label: "Em preparo", color: "bg-blue-900/40 text-blue-300 border-blue-800/50" },
  ENVIADO: { label: "Enviado", color: "bg-purple-900/40 text-purple-300 border-purple-800/50" },
  ENTREGUE: { label: "Entregue", color: "bg-green-900/40 text-green-300 border-green-800/50" },
  CANCELADO: { label: "Cancelado", color: "bg-red-900/40 text-red-300 border-red-800/50" },
};

function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Importação CSV ───────────────────────────────────────────────────────────

const CSV_TEMPLATE = "nome;descricao;categoria;preco;preco_promocional;estoque\nCamiseta Basica;100% algodao, varias cores;Vestuario;49,90;39,90;25\nBone Trucker;Ajustavel;Acessorios;35,00;;\n";

function normalizeHeader(h: string): string {
  return h.normalize("NFD").replace(/[^a-zA-Z_ ]/g, "").toLowerCase().trim().replace(/\s+/g, "_");
}

// Aceita ; ou , como separador (Excel brasileiro usa ;) e campos entre aspas
function parseCsv(text: string): Record<string, string>[] {
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
  const headers = headerRow.map(normalizeHeader);

  return rows
    .filter((r) => r.some((c) => c.trim() !== ""))
    .map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

// "R$ 1.234,56" → 1234.56 | "49.90" → 49.9
function parsePrice(v: string): number | null {
  const clean = v.replace(/[R$\s]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function ComercioClient({
  agentId, initialCommerceEnabled, initialCatalogOnly, initialAsaasSandbox, initialHasAsaasApiKey, initialAsaasWebhookToken,
  initialInstallmentsEnabled, initialMaxInstallments, initialInterestFreeInstallments, initialInstallmentInterestRate,
  initialProducts, initialOrders, initialStoreLogo, initialBanners, storeSlug,
  initialOrderWebhookUrl, initialHasOrderWebhookSecret, initialDelivery,
}: {
  agentId: string;
  initialCommerceEnabled: boolean;
  initialAsaasSandbox: boolean;
  initialHasAsaasApiKey: boolean;
  initialAsaasWebhookToken: string | null;
  initialCatalogOnly: boolean;
  initialInstallmentsEnabled: boolean;
  initialMaxInstallments: number;
  initialInterestFreeInstallments: number;
  initialInstallmentInterestRate: number;
  initialProducts: Product[];
  initialOrders: Order[];
  initialStoreLogo?: string | null; // data URI
  initialBanners?: { id: string; dataUri: string; active: boolean }[];
  storeSlug?: string | null; // URL amigável do catálogo
  initialOrderWebhookUrl?: string | null;
  initialHasOrderWebhookSecret?: boolean;
  initialDelivery?: {
    deliveryEnabled: boolean;
    pickupEnabled: boolean;
    deliveryFee: number;
    deliveryFreeAbove: number | null;
    deliveryArea: string;
  };
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [commerceEnabled, setCommerceEnabled] = useState(initialCommerceEnabled);
  const [catalogOnly, setCatalogOnly] = useState(initialCatalogOnly);
  const [asaasSandbox, setAsaasSandbox] = useState(initialAsaasSandbox);
  const [hasAsaasApiKey, setHasAsaasApiKey] = useState(initialHasAsaasApiKey);
  const [asaasWebhookToken, setAsaasWebhookToken] = useState(initialAsaasWebhookToken);
  const [asaasApiKeyInput, setAsaasApiKeyInput] = useState("");
  const [installmentsEnabled, setInstallmentsEnabled] = useState(initialInstallmentsEnabled);
  const [maxInstallments, setMaxInstallments] = useState(initialMaxInstallments);
  const [interestFreeInstallments, setInterestFreeInstallments] = useState(initialInterestFreeInstallments);
  const [installmentInterestRate, setInstallmentInterestRate] = useState(initialInstallmentInterestRate);
  const [savingSettings, setSavingSettings] = useState(false);

  // Integração com o sistema da loja do cliente (webhook de pedidos + importação de produtos)
  const [orderWebhookUrl, setOrderWebhookUrl] = useState(initialOrderWebhookUrl ?? "");
  const [orderWebhookSecretInput, setOrderWebhookSecretInput] = useState("");
  const [hasOrderWebhookSecret, setHasOrderWebhookSecret] = useState(initialHasOrderWebhookSecret ?? false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  // Entrega
  const [deliveryEnabled, setDeliveryEnabled] = useState(initialDelivery?.deliveryEnabled ?? false);
  const [pickupEnabled, setPickupEnabled] = useState(initialDelivery?.pickupEnabled ?? true);
  const [deliveryFee, setDeliveryFee] = useState(initialDelivery?.deliveryFee ?? 0);
  const [deliveryFreeAbove, setDeliveryFreeAbove] = useState<string>(
    initialDelivery?.deliveryFreeAbove != null ? String(initialDelivery.deliveryFreeAbove) : ""
  );
  const [deliveryArea, setDeliveryArea] = useState(initialDelivery?.deliveryArea ?? "");

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders] = useState<Order[]>(initialOrders);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newPrecoPromo, setNewPrecoPromo] = useState("");
  const [newImage, setNewImage] = useState<{ base64: string; mimeType: string } | null>(null);
  const [photoError, setPhotoError] = useState("");
  const editPhotoInputRef = useRef<HTMLInputElement>(null);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<{ name: string; description: string; category: string; price: string; precoPromo: string; stock: string }>({ name: "", description: "", category: "", price: "", precoPromo: "", stock: "" });

  // Personalização da loja (logo + banners do catálogo público)
  const [showAppearance, setShowAppearance] = useState(false);
  const [storeLogo, setStoreLogo] = useState<string | null>(initialStoreLogo ?? null);
  const [banners, setBanners] = useState<Banner[]>(
    (initialBanners ?? []).map((b) => ({ id: b.id, dataUri: b.dataUri, active: b.active }))
  );
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [appearanceError, setAppearanceError] = useState("");

  const categorias = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[];

  async function loadProducts() {
    const res = await fetch(`/api/agentes/${agentId}/produtos`);
    const data = await res.json();
    setProducts(data.products ?? []);
  }

  async function handleSaveSettings() {
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/agentes/${agentId}/comercio`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commerceEnabled, catalogOnly, asaasSandbox,
          installmentsEnabled, maxInstallments, interestFreeInstallments, installmentInterestRate,
          ...(asaasApiKeyInput.trim() ? { asaasApiKey: asaasApiKeyInput.trim() } : {}),
          deliveryEnabled, pickupEnabled, deliveryFee,
          deliveryFreeAbove: deliveryFreeAbove.trim() ? Number(deliveryFreeAbove.replace(",", ".")) : null,
          deliveryArea: deliveryArea.trim(),
          // URL vazia desativa a integração (e limpa o secret junto)
          orderWebhookUrl: orderWebhookUrl.trim() || null,
          ...(orderWebhookSecretInput.trim()
            ? { orderWebhookSecret: orderWebhookSecretInput.trim() }
            : (!orderWebhookUrl.trim() ? { orderWebhookSecret: null } : {})),
        }),
      });
      const data = await res.json();
      setHasAsaasApiKey(data.hasAsaasApiKey);
      setAsaasWebhookToken(data.asaasWebhookToken);
      setAsaasApiKeyInput("");
      if (orderWebhookSecretInput.trim()) setHasOrderWebhookSecret(true);
      if (!orderWebhookUrl.trim()) setHasOrderWebhookSecret(false);
      setOrderWebhookSecretInput("");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleSelectNewImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoError("");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Imagem muito grande (máx. ${MAX_PHOTO_MB}MB).`);
      return;
    }
    try {
      setNewImage(await readFileAsBase64(file));
    } catch {
      setPhotoError("Não foi possível ler a imagem.");
    }
  }

  async function handleUploadExistingPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const productId = editingPhotoId;
    e.target.value = "";
    setEditingPhotoId(null);
    if (!file || !productId) return;
    setPhotoError("");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setPhotoError(`Imagem muito grande (máx. ${MAX_PHOTO_MB}MB).`);
      return;
    }
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      await fetch(`/api/ferramentas/whatsapp/produtos/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imagemBase64: base64, imagemMimeType: mimeType }),
      });
      loadProducts();
    } catch {
      setPhotoError("Não foi possível enviar a imagem.");
    }
  }

  async function handleAddProduct() {
    const price = Number(newPrice.replace(",", "."));
    if (!newName.trim() || !Number.isFinite(price) || price < 0) return;
    const promo = newPrecoPromo.trim() ? Number(newPrecoPromo.replace(",", ".")) : null;
    await fetch(`/api/agentes/${agentId}/produtos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(), description: newDescription.trim(), category: newCategory.trim(), price,
        precoPromocional: promo != null && promo >= 0 ? promo : null,
        stock: newStock.trim() ? Math.max(0, Number(newStock)) : null,
        imagemBase64: newImage?.base64 ?? null, imagemMimeType: newImage?.mimeType ?? null,
      }),
    });
    setNewName(""); setNewDescription(""); setNewCategory(""); setNewPrice(""); setNewStock(""); setNewPrecoPromo(""); setNewImage(null); setShowNewProduct(false);
    loadProducts();
  }

  async function handleImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    setImportMessage("");
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const parsed = rows.map((r) => {
        const name = r.nome || r.name || r.produto || "";
        const price = parsePrice(r.preco || r.price || r.valor || "");
        if (!name || price === null) return null;
        const promo = parsePrice(r.preco_promocional || r.promocao || "");
        const stockRaw = (r.estoque || r.stock || "").replace(/\D/g, "");
        return {
          name,
          description: r.descricao || r.description || "",
          category: r.categoria || r.category || "",
          price,
          precoPromocional: promo,
          stock: stockRaw ? Number(stockRaw) : null,
        };
      }).filter(Boolean);

      if (parsed.length === 0) {
        setImportMessage("Nenhuma linha válida encontrada. Confira se a planilha tem as colunas nome e preco (baixe o modelo).");
        return;
      }
      if (parsed.length > 500) {
        setImportMessage("Máximo de 500 produtos por importação — divida a planilha.");
        return;
      }

      const res = await fetch(`/api/agentes/${agentId}/produtos/importar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: parsed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erro na importação.");
      }
      const { created, updated } = await res.json();
      setImportMessage(`Importação concluída: ${created} produto(s) criado(s), ${updated} atualizado(s).`);
      loadProducts();
    } catch (err: any) {
      setImportMessage(err?.message ?? "Erro ao ler a planilha.");
    } finally {
      setImporting(false);
    }
  }

  function downloadCsvTemplate() {
    const blob = new Blob(["﻿" + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-produtos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleSelectLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAppearanceError("");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setAppearanceError(`Imagem muito grande (máx. ${MAX_PHOTO_MB}MB).`);
      return;
    }
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      setStoreLogo(`data:${mimeType};base64,${base64}`);
    } catch {
      setAppearanceError("Não foi possível ler a imagem.");
    }
  }

  async function handleAddBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAppearanceError("");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
      setAppearanceError(`Imagem muito grande (máx. ${MAX_PHOTO_MB}MB).`);
      return;
    }
    if (banners.length >= 10) {
      setAppearanceError("Máximo de 10 banners.");
      return;
    }
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      setBanners((prev) => [...prev, { dataUri: `data:${mimeType};base64,${base64}`, base64, mimeType, active: true }]);
    } catch {
      setAppearanceError("Não foi possível ler a imagem.");
    }
  }

  function moveBanner(index: number, dir: -1 | 1) {
    setBanners((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSaveAppearance() {
    setSavingAppearance(true);
    setAppearanceError("");
    try {
      // Logo: extrai base64/mime do data URI (null remove)
      let logoPayload: { storeLogoBase64: string | null; storeLogoMimeType: string | null };
      if (storeLogo) {
        const [meta, base64] = storeLogo.split(",");
        const mimeType = meta.match(/data:(.*?);/)?.[1] ?? "image/png";
        logoPayload = { storeLogoBase64: base64, storeLogoMimeType: mimeType };
      } else {
        logoPayload = { storeLogoBase64: null, storeLogoMimeType: null };
      }

      const [logoRes, bannersRes] = await Promise.all([
        fetch(`/api/agentes/${agentId}/comercio`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(logoPayload),
        }),
        fetch(`/api/agentes/${agentId}/banners`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            banners: banners.map((b) => b.id
              ? { id: b.id, active: b.active }
              : { imagemBase64: b.base64, imagemMimeType: b.mimeType, active: b.active }
            ),
          }),
        }),
      ]);
      if (!logoRes.ok || !bannersRes.ok) throw new Error();
      const data = await bannersRes.json();
      setBanners((data.banners ?? []).map((b: any) => ({
        id: b.id,
        dataUri: `data:${b.imagemMimeType};base64,${b.imagemBase64}`,
        active: b.active,
      })));
    } catch {
      setAppearanceError("Erro ao salvar a personalização. Tente novamente.");
    } finally {
      setSavingAppearance(false);
    }
  }

  function startEdit(p: Product) {
    setEditingProductId(p.id);
    setEditFields({
      name: p.name,
      description: p.description,
      category: p.category ?? "",
      price: String(p.price),
      precoPromo: p.precoPromocional != null ? String(p.precoPromocional) : "",
      stock: p.stock != null ? String(p.stock) : "",
    });
  }

  async function handleSaveEdit() {
    if (!editingProductId) return;
    const price = Number(editFields.price.replace(",", "."));
    if (!editFields.name.trim() || !Number.isFinite(price) || price < 0) return;
    const promo = editFields.precoPromo.trim() ? Number(editFields.precoPromo.replace(",", ".")) : null;
    await fetch(`/api/ferramentas/whatsapp/produtos/${editingProductId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editFields.name.trim(),
        description: editFields.description.trim(),
        category: editFields.category.trim(),
        price,
        precoPromocional: promo != null && promo >= 0 ? promo : null,
        stock: editFields.stock.trim() ? Math.max(0, Number(editFields.stock)) : null,
      }),
    });
    setEditingProductId(null);
    loadProducts();
  }

  async function handleToggleProduct(product: Product) {
    await fetch(`/api/ferramentas/whatsapp/produtos/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    loadProducts();
  }

  async function handleDeleteProduct(product: Product) {
    if (!confirm(`Remover ${product.name}?`)) return;
    await fetch(`/api/ferramentas/whatsapp/produtos/${product.id}`, { method: "DELETE" });
    loadProducts();
  }

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/asaas/${agentId}` : `/api/webhooks/asaas/${agentId}`;
  const catalogPath = `/loja/${storeSlug ?? agentId}`;
  const catalogUrl = typeof window !== "undefined" ? `${window.location.origin}${catalogPath}` : catalogPath;
  const [catalogCopied, setCatalogCopied] = useState(false);

  function copyCatalogLink() {
    navigator.clipboard.writeText(catalogUrl).then(() => {
      setCatalogCopied(true);
      setTimeout(() => setCatalogCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><ShoppingCart size={28} className="text-blue-400" /> Comércio</h1>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowNewProduct(s => !s)} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium">
              + Novo produto
            </button>
            <button onClick={() => setShowAppearance(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
              <ImageIcon size={15} /> Personalizar loja
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
              <Settings size={15} /> Configurar pagamento
            </button>
          </div>
        </div>

        <datalist id="categorias-loja">
          {categorias.map(c => <option key={c} value={c} />)}
        </datalist>

        {showAppearance && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
            <div>
              <p className="font-semibold">Personalizar loja</p>
              <p className="text-xs text-gray-500 mt-0.5">Logo e banners aparecem no catálogo online que os clientes acessam.</p>
            </div>

            {/* Logo */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400 font-medium">Logo da loja</p>
              <div className="flex items-center gap-3">
                {storeLogo ? (
                  <img src={storeLogo} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-gray-800" />
                ) : (
                  <span className="w-14 h-14 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600"><ImageIcon size={20} /></span>
                )}
                <label className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                  {storeLogo ? "Trocar logo" : "Enviar logo"}
                  <input type="file" accept="image/*" onChange={handleSelectLogo} className="hidden" />
                </label>
                {storeLogo && (
                  <button onClick={() => setStoreLogo(null)} className="text-sm text-red-400 hover:text-red-300">Remover</button>
                )}
              </div>
              <p className="text-xs text-gray-600">Ideal: imagem quadrada (ex: 512×512). Também vira o ícone quando o cliente adiciona a loja à tela inicial.</p>
            </div>

            {/* Banners */}
            <div className="space-y-2 border-t border-gray-800 pt-4">
              <p className="text-sm text-gray-400 font-medium">Banners de destaque (carrossel no topo do catálogo)</p>
              <div className="space-y-2">
                {banners.map((b, i) => (
                  <div key={b.id ?? `new_${i}`} className={`flex items-center gap-3 ${!b.active ? "opacity-50" : ""}`}>
                    <img src={b.dataUri} alt={`Banner ${i + 1}`} className="w-28 h-12 rounded-lg object-cover border border-gray-800 flex-shrink-0" />
                    <div className="flex gap-2 text-xs flex-wrap">
                      <button onClick={() => moveBanner(i, -1)} disabled={i === 0} className="text-gray-400 hover:text-white disabled:opacity-30">↑</button>
                      <button onClick={() => moveBanner(i, 1)} disabled={i === banners.length - 1} className="text-gray-400 hover:text-white disabled:opacity-30">↓</button>
                      <button
                        onClick={() => setBanners(prev => prev.map((x, xi) => xi === i ? { ...x, active: !x.active } : x))}
                        className="text-gray-400 hover:text-white"
                      >
                        {b.active ? "Ocultar" : "Mostrar"}
                      </button>
                      <button
                        onClick={() => setBanners(prev => prev.filter((_, xi) => xi !== i))}
                        className="text-red-400 hover:text-red-300"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {banners.length < 10 && (
                <label className="inline-block text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                  + Adicionar banner
                  <input type="file" accept="image/*" onChange={handleAddBanner} className="hidden" />
                </label>
              )}
              <p className="text-xs text-gray-600">Ideal: imagem larga (ex: 1200×515). A ordem aqui é a ordem do carrossel.</p>
            </div>

            {appearanceError && <p className="text-sm text-red-400">{appearanceError}</p>}

            <button
              onClick={handleSaveAppearance}
              disabled={savingAppearance}
              className="bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-xl px-4 py-2 text-sm font-medium"
            >
              {savingAppearance ? "Salvando..." : "Salvar personalização"}
            </button>
          </div>
        )}

        {/* Link do catálogo público */}
        {commerceEnabled && (
          <div className="bg-gray-900 border border-green-800/40 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-green-300">Catálogo online da loja</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Compartilhe este link — o cliente monta o carrinho e finaliza o pedido no WhatsApp.
              </p>
              <p className="text-xs text-gray-400 font-mono mt-1 truncate">{catalogUrl}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={copyCatalogLink}
                className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-3 py-1.5 transition-colors"
              >
                {catalogCopied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                {catalogCopied ? "Copiado!" : "Copiar link"}
              </button>
              <a
                href={catalogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 border border-green-800/50 hover:border-green-600/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                <ExternalLink size={12} />
                Abrir
              </a>
            </div>
          </div>
        )}

        {showNewProduct && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold">Novo produto</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="Nome do produto" value={newName} onChange={e => setNewName(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm md:col-span-2" />
              <input placeholder="Preço (R$)" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Estoque (opcional)" value={newStock} onChange={e => setNewStock(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Preço promo (opcional)" value={newPrecoPromo} onChange={e => setNewPrecoPromo(e.target.value)} className="bg-gray-950 border border-amber-800/50 rounded-xl px-3 py-2 text-sm" title="Deixe vazio para sem promoção" />
              <input placeholder="Categoria (opcional)" value={newCategory} onChange={e => setNewCategory(e.target.value)} list="categorias-loja" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            <input placeholder="Descrição (opcional)" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            <div className="flex items-center gap-3">
              {newImage && <img src={`data:${newImage.mimeType};base64,${newImage.base64}`} alt="" className="w-12 h-12 rounded-lg object-cover border border-gray-800" />}
              <label className="text-sm text-blue-400 hover:text-blue-300 cursor-pointer flex items-center gap-1.5">
                <ImageIcon size={14} /> {newImage ? "Trocar foto" : "Adicionar foto (opcional)"}
                <input type="file" accept="image/*" onChange={handleSelectNewImage} className="hidden" />
              </label>
            </div>
            {photoError && <p className="text-xs text-red-400">{photoError}</p>}
            <button onClick={handleAddProduct} className="bg-green-700 hover:bg-green-600 rounded-xl px-4 py-2 text-sm font-medium">Salvar</button>
          </div>
        )}

        {showSettings && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={commerceEnabled} onChange={e => setCommerceEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar catálogo de produtos pelo agente de IA</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={catalogOnly} onChange={e => setCatalogOnly(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Somente catálogo — sem pagamento online</span>
              {catalogOnly && <span className="text-xs text-gray-500">(a IA anota o pedido e avisa que um atendente combinará o pagamento)</span>}
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={asaasSandbox} onChange={e => setAsaasSandbox(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm">Usar ambiente de testes (sandbox) do Asaas</span>
            </label>

            <div>
              <label className="text-sm text-gray-400 block mb-1">
                API key do Asaas {hasAsaasApiKey && <span className="text-green-400">(configurada)</span>}
              </label>
              <input
                type="password"
                value={asaasApiKeyInput}
                onChange={e => setAsaasApiKeyInput(e.target.value)}
                placeholder={hasAsaasApiKey ? "Colar uma nova key pra substituir" : "Cole sua API key do Asaas"}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Gerada no painel do Asaas em Configurações → Integrações → API. Nunca é exibida de volta aqui.</p>
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={installmentsEnabled} onChange={e => setInstallmentsEnabled(e.target.checked)} className="w-4 h-4" />
                <span className="text-sm font-medium">Permitir parcelamento no cartão</span>
              </label>

              {installmentsEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Máximo de parcelas</label>
                    <input
                      type="number" min={1} max={21} value={maxInstallments}
                      onChange={e => setMaxInstallments(Math.min(21, Math.max(1, Number(e.target.value))))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Parcelas sem juros</label>
                    <input
                      type="number" min={0} max={maxInstallments} value={interestFreeInstallments}
                      onChange={e => setInterestFreeInstallments(Math.min(maxInstallments, Math.max(0, Number(e.target.value))))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Juros por parcela adicional, a partir da parcela {interestFreeInstallments + 1} (%)</label>
                    <input
                      type="number" min={0} max={100} step={0.1} value={installmentInterestRate}
                      onChange={e => setInstallmentInterestRate(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">O acréscimo é calculado por nós e embutido no valor cobrado — não depende de configuração da sua conta Asaas.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <p className="text-sm font-medium">Entrega</p>
              <div className="flex gap-5 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={deliveryEnabled} onChange={e => setDeliveryEnabled(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Fazemos entrega</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={pickupEnabled} onChange={e => setPickupEnabled(e.target.checked)} className="w-4 h-4" />
                  <span className="text-sm">Retirada no local</span>
                </label>
              </div>
              {deliveryEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Taxa de entrega (R$)</label>
                    <input
                      type="number" min={0} step={0.5} value={deliveryFee}
                      onChange={e => setDeliveryFee(Math.max(0, Number(e.target.value)))}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Frete grátis a partir de (R$)</label>
                    <input
                      value={deliveryFreeAbove}
                      onChange={e => setDeliveryFreeAbove(e.target.value)}
                      placeholder="Vazio = nunca"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs text-gray-400 block mb-1">Área e prazo de entrega</label>
                    <textarea
                      value={deliveryArea}
                      onChange={e => setDeliveryArea(e.target.value)}
                      rows={2}
                      placeholder="Ex: Entregamos no centro e bairros vizinhos, em até 90 minutos. Fora dessa área, combinar com atendente."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">O agente usa essa descrição pra responder onde e quando a loja entrega.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 pt-4 space-y-3">
              <div>
                <p className="text-sm font-medium">Integração com o sistema da loja</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enviamos cada pedido (criado, atualizado e pago) por POST em JSON para a URL abaixo — para cair no seu ERP, PDV ou e-commerce.
                </p>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">URL do webhook de pedidos</label>
                <input
                  type="url"
                  value={orderWebhookUrl}
                  onChange={e => setOrderWebhookUrl(e.target.value)}
                  placeholder="https://sistema-da-loja.com.br/webhooks/fluxvenda (vazio = desativado)"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Chave secreta (opcional) {hasOrderWebhookSecret && <span className="text-green-400">(configurada)</span>}
                </label>
                <input
                  type="password"
                  value={orderWebhookSecretInput}
                  onChange={e => setOrderWebhookSecretInput(e.target.value)}
                  placeholder={hasOrderWebhookSecret ? "Digitar uma nova pra substituir" : "Usada pra assinar os envios (HMAC-SHA256)"}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Com a chave definida, cada envio leva o header <code className="text-gray-400">X-FluxVenda-Signature: sha256=...</code> pro seu sistema validar a origem.
                </p>
              </div>
            </div>

            {asaasWebhookToken && (
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 space-y-2 text-xs">
                <p className="text-gray-400">Cadastre no painel do Asaas (Webhooks) pra confirmar pagamentos automaticamente:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-gray-300">{webhookUrl}</code>
                  <button onClick={() => navigator.clipboard.writeText(webhookUrl)} className="text-blue-400 hover:text-blue-300 flex-shrink-0"><Copy size={13} /></button>
                </div>
                <p className="text-gray-400">Header customizado <code className="text-gray-300">asaas-access-token</code> com o valor:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-gray-300">{asaasWebhookToken}</code>
                  <button onClick={() => navigator.clipboard.writeText(asaasWebhookToken)} className="text-blue-400 hover:text-blue-300 flex-shrink-0"><Copy size={13} /></button>
                </div>
              </div>
            )}

            <button onClick={handleSaveSettings} disabled={savingSettings} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl px-5 py-2 text-sm font-medium">
              {savingSettings ? "Salvando..." : "Salvar configurações"}
            </button>
          </div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-3 flex-wrap p-5 pb-3">
            <p className="font-semibold">Produtos</p>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                className="text-blue-400 hover:text-blue-300 disabled:opacity-50"
              >
                {importing ? "Importando..." : "Importar planilha (CSV)"}
              </button>
              <button onClick={downloadCsvTemplate} className="text-gray-500 hover:text-gray-300">
                Baixar modelo
              </button>
            </div>
          </div>
          <input ref={importInputRef} type="file" accept=".csv,text/csv" onChange={handleImportCsv} className="hidden" />
          {importMessage && (
            <p className="text-xs text-gray-400 px-5 pb-3 -mt-1">{importMessage}</p>
          )}
          {products.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhum produto cadastrado ainda.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {products.map(p => (
                <div key={p.id} className="border-b border-gray-800 last:border-0">
                  {editingProductId === p.id ? (
                    <div className="px-5 py-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input value={editFields.name} onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))} placeholder="Nome" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm col-span-2" />
                        <input value={editFields.price} onChange={e => setEditFields(f => ({ ...f, price: e.target.value }))} placeholder="Preço (R$)" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                        <input value={editFields.stock} onChange={e => setEditFields(f => ({ ...f, stock: e.target.value }))} placeholder="Estoque (opcional)" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                        <input value={editFields.precoPromo} onChange={e => setEditFields(f => ({ ...f, precoPromo: e.target.value }))} placeholder="Preço promo (vazio = sem promo)" className="bg-gray-950 border border-amber-800/50 rounded-xl px-3 py-2 text-sm" />
                        <input value={editFields.category} onChange={e => setEditFields(f => ({ ...f, category: e.target.value }))} placeholder="Categoria (opcional)" list="categorias-loja" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
                        <input value={editFields.description} onChange={e => setEditFields(f => ({ ...f, description: e.target.value }))} placeholder="Descrição (opcional)" className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm col-span-2" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-500 rounded-lg px-3 py-1.5 text-xs font-medium">Salvar</button>
                        <button onClick={() => setEditingProductId(null)} className="text-xs text-gray-400 hover:text-white">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {p.imagemBase64 ? (
                          <img src={`data:${p.imagemMimeType};base64,${p.imagemBase64}`} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-800 flex-shrink-0" />
                        ) : (
                          <span className="w-10 h-10 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center text-gray-600 flex-shrink-0"><ImageIcon size={16} /></span>
                        )}
                        <div className="min-w-0">
                          <p className={`text-sm font-medium ${!p.active ? "text-gray-500 line-through" : ""}`}>{p.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {p.precoPromocional != null ? (
                              <><span className="text-amber-400 font-medium">{formatBRL(p.precoPromocional)}</span> <span className="line-through">{formatBRL(p.price)}</span></>
                            ) : formatBRL(p.price)}
                            {p.category && ` · ${p.category}`}{p.stock !== null && ` · estoque: ${p.stock}`}{p.description && ` · ${p.description}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 text-xs flex-shrink-0">
                        <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-white">Editar</button>
                        <button onClick={() => { setEditingPhotoId(p.id); editPhotoInputRef.current?.click(); }} className="text-blue-400 hover:text-blue-300">Foto</button>
                        <button onClick={() => handleToggleProduct(p)} className="text-gray-400 hover:text-white">{p.active ? "Desativar" : "Ativar"}</button>
                        <button onClick={() => handleDeleteProduct(p)} className="text-red-400 hover:text-red-300">Remover</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          <input ref={editPhotoInputRef} type="file" accept="image/*" onChange={handleUploadExistingPhoto} className="hidden" />
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <p className="font-semibold p-5 pb-3">Pedidos recentes</p>
          {orders.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhum pedido ainda.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {orders.map(o => {
                const st = STATUS_LABEL[o.status] ?? STATUS_LABEL.ABERTO;
                return (
                  <div key={o.id} className="px-5 py-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{o.contactName || o.contactNumber}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{o.items.map(i => `${i.quantity}x ${i.name}`).join(", ")}</p>
                    <p className="text-xs text-gray-400">{formatBRL(o.total)} · {new Date(o.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                    {o.asaasInvoiceUrl && (
                      <a href={o.asaasInvoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 underline">
                        Ver cobrança no Asaas
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
