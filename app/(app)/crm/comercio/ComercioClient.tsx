"use client";

import { useState } from "react";
import { ShoppingCart, Settings, Copy } from "lucide-react";

type Product = { id: string; name: string; description: string; price: number; stock: number | null; active: boolean };
type OrderItem = { id: string; name: string; unitPrice: number; quantity: number };
type Order = { id: string; contactName: string; contactNumber: string; status: string; total: number; createdAt: string; items: OrderItem[] };

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

export function ComercioClient({
  agentId, initialCommerceEnabled, initialAsaasSandbox, initialHasAsaasApiKey, initialAsaasWebhookToken, initialProducts, initialOrders,
}: {
  agentId: string;
  initialCommerceEnabled: boolean;
  initialAsaasSandbox: boolean;
  initialHasAsaasApiKey: boolean;
  initialAsaasWebhookToken: string | null;
  initialProducts: Product[];
  initialOrders: Order[];
}) {
  const [showSettings, setShowSettings] = useState(false);
  const [commerceEnabled, setCommerceEnabled] = useState(initialCommerceEnabled);
  const [asaasSandbox, setAsaasSandbox] = useState(initialAsaasSandbox);
  const [hasAsaasApiKey, setHasAsaasApiKey] = useState(initialHasAsaasApiKey);
  const [asaasWebhookToken, setAsaasWebhookToken] = useState(initialAsaasWebhookToken);
  const [asaasApiKeyInput, setAsaasApiKeyInput] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders] = useState<Order[]>(initialOrders);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");

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
          commerceEnabled, asaasSandbox,
          ...(asaasApiKeyInput.trim() ? { asaasApiKey: asaasApiKeyInput.trim() } : {}),
        }),
      });
      const data = await res.json();
      setHasAsaasApiKey(data.hasAsaasApiKey);
      setAsaasWebhookToken(data.asaasWebhookToken);
      setAsaasApiKeyInput("");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleAddProduct() {
    const price = Number(newPrice.replace(",", "."));
    if (!newName.trim() || !Number.isFinite(price) || price < 0) return;
    await fetch(`/api/agentes/${agentId}/produtos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(), description: newDescription.trim(), price,
        stock: newStock.trim() ? Math.max(0, Number(newStock)) : null,
      }),
    });
    setNewName(""); setNewDescription(""); setNewPrice(""); setNewStock(""); setShowNewProduct(false);
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

  return (
    <div className="h-full overflow-y-auto bg-gray-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-gray-400 text-sm">Atendimento</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><ShoppingCart size={28} className="text-blue-400" /> Comércio</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowNewProduct(s => !s)} className="bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2.5 text-sm font-medium">
              + Novo produto
            </button>
            <button onClick={() => setShowSettings(s => !s)} className="bg-gray-800 hover:bg-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-1.5">
              <Settings size={15} /> Configurar pagamento
            </button>
          </div>
        </div>

        {showNewProduct && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <p className="font-semibold">Novo produto</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input placeholder="Nome do produto" value={newName} onChange={e => setNewName(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm md:col-span-2" />
              <input placeholder="Preço (R$)" value={newPrice} onChange={e => setNewPrice(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Estoque (opcional)" value={newStock} onChange={e => setNewStock(e.target.value)} className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            </div>
            <input placeholder="Descrição (opcional)" value={newDescription} onChange={e => setNewDescription(e.target.value)} className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-sm" />
            <button onClick={handleAddProduct} className="bg-green-700 hover:bg-green-600 rounded-xl px-4 py-2 text-sm font-medium">Salvar</button>
          </div>
        )}

        {showSettings && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={commerceEnabled} onChange={e => setCommerceEnabled(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm font-medium">Ativar pedidos e pagamento via Pix pelo agente de IA</span>
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
          <p className="font-semibold p-5 pb-3">Produtos</p>
          {products.length === 0 ? (
            <p className="text-sm text-gray-500 px-5 pb-5">Nenhum produto cadastrado ainda.</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {products.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${!p.active ? "text-gray-500 line-through" : ""}`}>{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {formatBRL(p.price)}{p.stock !== null && ` · estoque: ${p.stock}`}{p.description && ` · ${p.description}`}
                    </p>
                  </div>
                  <div className="flex gap-2 text-xs flex-shrink-0">
                    <button onClick={() => handleToggleProduct(p)} className="text-gray-400 hover:text-white">{p.active ? "Desativar" : "Ativar"}</button>
                    <button onClick={() => handleDeleteProduct(p)} className="text-red-400 hover:text-red-300">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
