"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, X, ShoppingBag, Store, MessageCircle } from "lucide-react";

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  precoPromocional: number | null;
  stock: number | null;
  image: string | null;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function effectivePrice(p: StoreProduct) {
  return p.precoPromocional ?? p.price;
}

export function LojaClient({
  agentId,
  storeName,
  whatsappNumber,
  products,
}: {
  agentId: string;
  storeName: string;
  whatsappNumber: string | null;
  products: StoreProduct[];
}) {
  const cartKey = `loja_cart_${agentId}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  // Carrinho persistido por loja no localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, number>;
        // Descarta itens que saíram do catálogo
        const valid: Record<string, number> = {};
        for (const [id, qty] of Object.entries(parsed)) {
          if (products.some((p) => p.id === id) && qty > 0) valid[id] = qty;
        }
        setCart(valid);
      }
    } catch {}
    setCartLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cartLoaded) return;
    try { localStorage.setItem(cartKey, JSON.stringify(cart)); } catch {}
  }, [cart, cartKey, cartLoaded]);

  function setQty(productId: string, qty: number) {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const max = product.stock ?? Infinity;
    const clamped = Math.max(0, Math.min(qty, max));
    setCart((prev) => {
      const next = { ...prev };
      if (clamped === 0) delete next[productId];
      else next[productId] = clamped;
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [products, search]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const product = products.find((p) => p.id === id);
          return product ? { product, qty } : null;
        })
        .filter(Boolean) as { product: StoreProduct; qty: number }[],
    [cart, products]
  );

  const totalQty = cartItems.reduce((s, i) => s + i.qty, 0);
  const total = cartItems.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);

  function checkout() {
    if (!whatsappNumber || cartItems.length === 0) return;
    const lines = cartItems.map(
      (i) => `- ${i.qty}x ${i.product.name} — ${brl.format(effectivePrice(i.product) * i.qty)}`
    );
    const message = [
      `Olá! Montei um pedido pelo catálogo de ${storeName}:`,
      "",
      ...lines,
      "",
      `Total: ${brl.format(total)}`,
      "",
      "Pode confirmar meu pedido?",
    ].join("\n");
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
            <Store size={18} />
          </div>
          <p className="font-bold text-lg flex-1 truncate">{storeName}</p>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-2 text-gray-700 hover:text-blue-600 transition-colors"
            aria-label="Abrir carrinho"
          >
            <ShoppingCart size={22} />
            {totalQty > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center">
                {totalQty}
              </span>
            )}
          </button>
        </div>
        <div className="max-w-2xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full bg-gray-100 border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
            />
          </div>
        </div>
      </header>

      {/* Grid de produtos */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {filtered.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <ShoppingBag size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 text-sm">
              {products.length === 0 ? "Nenhum produto disponível no momento." : "Nenhum produto encontrado."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filtered.map((p) => {
            const qty = cart[p.id] ?? 0;
            const soldOut = p.stock !== null && p.stock <= 0;
            const hasPromo = p.precoPromocional !== null && p.precoPromocional < p.price;
            return (
              <div key={p.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
                <div className="aspect-square bg-gray-100 relative">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ShoppingBag size={36} />
                    </div>
                  )}
                  {hasPromo && !soldOut && (
                    <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5">
                      OFERTA
                    </span>
                  )}
                  {soldOut && (
                    <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                      <span className="bg-gray-800 text-white text-xs font-semibold rounded-full px-3 py-1">Esgotado</span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1 gap-1">
                  <p className="text-sm font-medium leading-snug line-clamp-2">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{p.description}</p>
                  )}
                  <div className="mt-auto pt-1.5">
                    {hasPromo && (
                      <p className="text-xs text-gray-400 line-through">{brl.format(p.price)}</p>
                    )}
                    <p className="text-lg font-bold text-blue-700">{brl.format(effectivePrice(p))}</p>
                  </div>

                  {soldOut ? (
                    <button disabled className="mt-2 w-full bg-gray-200 text-gray-400 text-sm font-medium rounded-xl py-2 cursor-not-allowed">
                      Indisponível
                    </button>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => setQty(p.id, 1)}
                      className="mt-2 w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-medium rounded-xl py-2 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingCart size={14} /> Adicionar
                    </button>
                  ) : (
                    <div className="mt-2 w-full flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl">
                      <button onClick={() => setQty(p.id, qty - 1)} className="p-2 text-blue-700 hover:bg-blue-100 rounded-l-xl transition-colors" aria-label="Diminuir">
                        <Minus size={15} />
                      </button>
                      <span className="text-sm font-bold text-blue-700">{qty}</span>
                      <button
                        onClick={() => setQty(p.id, qty + 1)}
                        disabled={p.stock !== null && qty >= p.stock}
                        className="p-2 text-blue-700 hover:bg-blue-100 rounded-r-xl transition-colors disabled:opacity-30"
                        aria-label="Aumentar"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Barra fixa de checkout */}
      {totalQty > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setCartOpen(true)}
              className="text-left flex-shrink-0"
            >
              <p className="text-xs text-gray-500">{totalQty} {totalQty === 1 ? "item" : "itens"}</p>
              <p className="font-bold">{brl.format(total)}</p>
            </button>
            <button
              onClick={checkout}
              disabled={!whatsappNumber}
              className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle size={18} />
              Confirmar pedido no WhatsApp
            </button>
          </div>
          {!whatsappNumber && (
            <p className="max-w-2xl mx-auto text-xs text-gray-400 mt-1.5 text-center">WhatsApp da loja indisponível no momento.</p>
          )}
        </div>
      )}

      {/* Drawer do carrinho */}
      {cartOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <p className="font-bold text-lg">Seu carrinho</p>
              <button onClick={() => setCartOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-700" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
              {cartItems.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-10">Seu carrinho está vazio.</p>
              )}
              {cartItems.map(({ product, qty }) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-300">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag size={20} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-sm font-bold text-blue-700">{brl.format(effectivePrice(product) * qty)}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-100 rounded-xl">
                    <button onClick={() => setQty(product.id, qty - 1)} className="p-1.5 text-gray-600 hover:text-blue-700" aria-label="Diminuir">
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{qty}</span>
                    <button
                      onClick={() => setQty(product.id, qty + 1)}
                      disabled={product.stock !== null && qty >= product.stock}
                      className="p-1.5 text-gray-600 hover:text-blue-700 disabled:opacity-30"
                      aria-label="Aumentar"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button onClick={() => setQty(product.id, 0)} className="p-1.5 text-gray-300 hover:text-red-500" aria-label="Remover">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            {cartItems.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-100 space-y-3 pb-[max(16px,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-xl font-bold">{brl.format(total)}</p>
                </div>
                <button
                  onClick={checkout}
                  disabled={!whatsappNumber}
                  className="w-full bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
                >
                  <MessageCircle size={18} />
                  Confirmar pedido no WhatsApp
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
