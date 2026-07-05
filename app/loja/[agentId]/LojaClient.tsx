"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ShoppingCart, Plus, Minus, Trash2, X, ShoppingBag, Store, MessageCircle } from "lucide-react";

type StoreProduct = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  precoPromocional: number | null;
  stock: number | null;
  image: string | null;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function effectivePrice(p: StoreProduct) {
  return p.precoPromocional ?? p.price;
}

type DeliveryConfig = {
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryFee: number;
  deliveryFreeAbove: number | null;
  deliveryArea: string;
  deliveryZones: { name: string; fee: number }[];
};

export function LojaClient({
  agentId,
  storeName,
  whatsappNumber,
  logo,
  banners,
  delivery,
  products,
}: {
  agentId: string;
  storeName: string;
  whatsappNumber: string | null;
  logo: string | null;
  banners: string[];
  delivery: DeliveryConfig;
  products: StoreProduct[];
}) {
  const cartKey = `loja_cart_${agentId}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartLoaded, setCartLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [products]);

  // Carrossel: avança sozinho a cada 4s (scroll-snap manual continua funcionando)
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setBannerIndex((i) => {
        const next = (i + 1) % banners.length;
        const el = bannerRef.current;
        if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
        return next;
      });
    }, 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  function onBannerScroll() {
    const el = bannerRef.current;
    if (!el || el.clientWidth === 0) return;
    setBannerIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

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
    let base = products;
    if (activeCategory !== null) base = base.filter((p) => p.category === activeCategory);
    if (q) {
      base = base.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    return base;
  }, [products, search, activeCategory]);

  // Sem filtro ativo, agrupa por categoria (produtos sem categoria vão para o final)
  const sections = useMemo((): { title: string | null; items: StoreProduct[] }[] => {
    if (activeCategory !== null || search.trim() || categories.length === 0) {
      return [{ title: null, items: filtered }];
    }
    const result: { title: string | null; items: StoreProduct[] }[] = categories.map((c) => ({
      title: c,
      items: filtered.filter((p) => p.category === c),
    }));
    const uncategorized = filtered.filter((p) => !p.category);
    if (uncategorized.length > 0) result.push({ title: "Outros", items: uncategorized });
    return result.filter((s) => s.items.length > 0);
  }, [filtered, categories, activeCategory, search]);

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
  const subtotal = cartItems.reduce((s, i) => s + effectivePrice(i.product) * i.qty, 0);

  // Entrega: escolha do cliente no carrinho
  const deliveryChoices = [
    ...(delivery.deliveryEnabled ? ["ENTREGA" as const] : []),
    ...(delivery.pickupEnabled ? ["RETIRADA" as const] : []),
  ];
  const [deliveryType, setDeliveryType] = useState<"ENTREGA" | "RETIRADA" | null>(
    deliveryChoices.length === 1 ? deliveryChoices[0] : null
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [zoneName, setZoneName] = useState("");

  const hasZones = delivery.deliveryZones.length > 0;
  const selectedZone = hasZones ? delivery.deliveryZones.find((z) => z.name === zoneName) ?? null : null;
  const baseFee = hasZones ? (selectedZone?.fee ?? 0) : delivery.deliveryFee;

  const fee =
    deliveryType === "ENTREGA"
      ? (delivery.deliveryFreeAbove != null && subtotal >= delivery.deliveryFreeAbove ? 0 : baseFee)
      : 0;
  const total = subtotal + fee;
  const needsDeliveryChoice = deliveryChoices.length > 1 && deliveryType === null;
  const needsZoneChoice = deliveryType === "ENTREGA" && hasZones && !selectedZone;

  function checkout() {
    if (!whatsappNumber || cartItems.length === 0 || needsDeliveryChoice || needsZoneChoice) return;
    const lines = cartItems.map(
      (i) => `- ${i.qty}x ${i.product.name} — ${brl.format(effectivePrice(i.product) * i.qty)}`
    );
    const deliveryLines =
      deliveryType === "ENTREGA"
        ? [
            `Entrega${selectedZone ? ` (${selectedZone.name})` : ""}: ${fee > 0 ? brl.format(fee) : "grátis"}`,
            ...(deliveryAddress.trim() ? [`Endereço: ${deliveryAddress.trim()}`] : []),
          ]
        : deliveryType === "RETIRADA"
          ? ["Retirada no local"]
          : [];
    const message = [
      `Olá! Montei um pedido pelo catálogo de ${storeName}:`,
      "",
      ...lines,
      "",
      ...deliveryLines,
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
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={storeName} className="w-9 h-9 rounded-xl object-cover flex-shrink-0 border border-gray-200" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Store size={18} />
            </div>
          )}
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

      <main className="max-w-2xl mx-auto pb-4">
        {/* Carrossel de banners */}
        {banners.length > 0 && (
          <div className="px-4 pt-4">
            <div
              ref={bannerRef}
              onScroll={onBannerScroll}
              className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl scrollbar-none"
              style={{ scrollbarWidth: "none" }}
            >
              {banners.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`Destaque ${i + 1}`}
                  className="w-full flex-shrink-0 snap-center object-cover aspect-[21/9] rounded-2xl"
                />
              ))}
            </div>
            {banners.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-2">
                {banners.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 rounded-full transition-all ${i === bannerIndex ? "w-5 bg-blue-600" : "w-1.5 bg-gray-300"}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chips de categoria */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-4 pt-4 pb-1" style={{ scrollbarWidth: "none" }}>
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 text-sm font-medium rounded-full px-4 py-1.5 border transition-colors ${
                activeCategory === null
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
              }`}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(activeCategory === c ? null : c)}
                className={`flex-shrink-0 text-sm font-medium rounded-full px-4 py-1.5 border transition-colors ${
                  activeCategory === c
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Produtos */}
        <div className="px-4 pt-3">
        {filtered.length === 0 && (
          <div className="text-center py-16 space-y-2">
            <ShoppingBag size={40} className="mx-auto text-gray-300" />
            <p className="text-gray-500 text-sm">
              {products.length === 0 ? "Nenhum produto disponível no momento." : "Nenhum produto encontrado."}
            </p>
          </div>
        )}

        {sections.map((section, si) => (
          <div key={section.title ?? "all"} className={si > 0 ? "mt-6" : ""}>
            {section.title && (
              <h2 className="text-base font-bold text-gray-800 mb-2">{section.title}</h2>
            )}
            <div className="grid grid-cols-2 gap-3">
          {section.items.map((p) => {
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
          </div>
        ))}
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
              onClick={() => (needsDeliveryChoice || deliveryType === "ENTREGA" ? setCartOpen(true) : checkout())}
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
                {/* Escolha de entrega */}
                {deliveryChoices.length > 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setDeliveryType("ENTREGA")}
                      className={`text-sm font-medium rounded-xl py-2 border transition-colors ${
                        deliveryType === "ENTREGA" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600"
                      }`}
                    >
                      Entrega
                    </button>
                    <button
                      onClick={() => setDeliveryType("RETIRADA")}
                      className={`text-sm font-medium rounded-xl py-2 border transition-colors ${
                        deliveryType === "RETIRADA" ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-600"
                      }`}
                    >
                      Retirar na loja
                    </button>
                  </div>
                )}

                {deliveryType === "ENTREGA" && (
                  <div className="space-y-1.5">
                    {hasZones && (
                      <select
                        value={zoneName}
                        onChange={(e) => setZoneName(e.target.value)}
                        className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white"
                      >
                        <option value="">Selecione sua região...</option>
                        {delivery.deliveryZones.map((z) => (
                          <option key={z.name} value={z.name}>
                            {z.name} — {z.fee > 0 ? brl.format(z.fee) : "grátis"}
                          </option>
                        ))}
                      </select>
                    )}
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      rows={2}
                      placeholder="Endereço de entrega (rua, número, bairro) — opcional, dá pra combinar no WhatsApp"
                      className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:bg-white resize-none"
                    />
                    {delivery.deliveryArea && (
                      <p className="text-xs text-gray-400">{delivery.deliveryArea}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <p>Subtotal</p>
                    <p>{brl.format(subtotal)}</p>
                  </div>
                  {deliveryType === "ENTREGA" && (
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <p>Entrega</p>
                      <p className={fee === 0 ? "text-green-600 font-medium" : ""}>
                        {fee === 0 ? "Grátis" : brl.format(fee)}
                      </p>
                    </div>
                  )}
                  {deliveryType === "ENTREGA" && fee > 0 && delivery.deliveryFreeAbove != null && subtotal < delivery.deliveryFreeAbove && (
                    <p className="text-xs text-green-600">
                      Frete grátis a partir de {brl.format(delivery.deliveryFreeAbove)} — faltam {brl.format(delivery.deliveryFreeAbove - subtotal)}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-xl font-bold">{brl.format(total)}</p>
                  </div>
                </div>

                {needsDeliveryChoice && (
                  <p className="text-xs text-center text-amber-600">Escolha entrega ou retirada para continuar.</p>
                )}
                {needsZoneChoice && (
                  <p className="text-xs text-center text-amber-600">Selecione sua região de entrega para continuar.</p>
                )}
                <button
                  onClick={checkout}
                  disabled={!whatsappNumber || needsDeliveryChoice || needsZoneChoice}
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
