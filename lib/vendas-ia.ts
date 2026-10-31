// Rotas da área do Vendas IA (infoprodutos) — usam a identidade das landings (tema .vi).
// Login, "esqueci minha senha" e "redefinir senha" também mudam pro visual do Vendas IA quando a
// pessoa chega vindo de uma dessas rotas (ou com ?tema=vi nos links da compra).
export const ROTAS_VENDAS_IA = ["/inicio", "/scanner", "/biblioteca", "/favoritos", "/configuracoes", "/boas-vindas", "/comprar"];

export function ehRotaVendasIA(caminho: string) {
  return ROTAS_VENDAS_IA.some(r => caminho === r || caminho.startsWith(`${r}/`));
}

// redirect_url pode vir como caminho ("/inicio") ou URL completa (o proxy manda a URL inteira).
// Só o caminho é aproveitado — nunca redireciona para outro domínio.
export function caminhoInterno(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, "http://local");
    return u.pathname.startsWith("/") && !u.pathname.startsWith("//") ? `${u.pathname}${u.search}` : null;
  } catch {
    return null;
  }
}
