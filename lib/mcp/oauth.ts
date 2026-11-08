import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

// OAuth 2.1 do conector do Claude: o Claude se registra sozinho (DCR), o usuário aprova em
// /conectar-claude com o login normal do FluxVenda, e cada token vale só pra aquela pessoa.
// Tokens são aleatórios e só o hash vai pro banco.

export const ESCOPO_MCP = "crm:leitura";
const ACESSO_MS = 60 * 60 * 1000;
const REFRESH_MS = 60 * 24 * 60 * 60 * 1000;
const CODIGO_MS = 5 * 60 * 1000;

// Só o Claude pode se registrar: sem isso, qualquer site conseguiria mostrar a tela de aprovação
// e receber o código no próprio domínio. Loopback é o Claude Code (porta muda a cada login).
const REDIRECTS_CLAUDE = ["https://claude.ai/api/mcp/auth_callback", "https://claude.com/api/mcp/auth_callback"];

export function urlBase() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3002").replace(/\/+$/, "");
}
export const urlMcp = () => `${urlBase()}/api/mcp`;
export const urlMetadadosRecurso = () => `${urlBase()}/.well-known/oauth-protected-resource/api/mcp`;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const novoToken = (prefixo: string) => `${prefixo}_${randomBytes(32).toString("base64url")}`;

function ehLoopback(u: URL) {
  return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1") && u.pathname === "/callback" && !u.search && !u.hash;
}

function lerUrl(uri: string) {
  try { return new URL(uri); } catch { return null; }
}

export function redirectPermitido(uri: string) {
  if (REDIRECTS_CLAUDE.includes(uri)) return true;
  const u = lerUrl(uri);
  return u !== null && ehLoopback(u);
}

// Comparação exata; só o loopback ignora a porta (RFC 8252)
export function redirectRegistrado(registradas: string[], uri: string) {
  if (!redirectPermitido(uri)) return false;
  if (registradas.includes(uri)) return true;
  const u = lerUrl(uri);
  if (!u || !ehLoopback(u)) return false;
  return registradas.some(r => {
    const a = lerUrl(r);
    return a !== null && ehLoopback(a) && a.hostname === u.hostname;
  });
}

export const nomeDoCliente = (redirects: string[]) => (redirects.every(r => REDIRECTS_CLAUDE.includes(r)) ? "Claude" : "Claude Code");

export function resourceValido(resource: string | undefined) {
  return !resource || resource.replace(/\/+$/, "") === urlMcp();
}

export function pkceConfere(verifier: string, challenge: string) {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

type Params = Record<string, string | undefined>;
export type PedidoAutorizacao = { clienteId: string; clienteNome: string; redirectUri: string; state?: string; codeChallenge: string };

// Valida o pedido antes de mostrar a tela e de novo ao aprovar. Com redirect inválido nunca se
// redireciona — o erro aparece na própria tela.
export async function validarPedido(p: Params): Promise<{ erro: string } | PedidoAutorizacao> {
  if (!p.client_id || !p.redirect_uri) return { erro: "Pedido de conexão incompleto." };
  const cliente = await prisma.mcpClient.findUnique({ where: { id: p.client_id } });
  if (!cliente || !redirectRegistrado(cliente.redirectUris, p.redirect_uri)) return { erro: "Este aplicativo não está autorizado a se conectar." };
  if (p.response_type !== "code") return { erro: "Tipo de autorização não suportado." };
  if (p.code_challenge_method !== "S256" || !/^[A-Za-z0-9\-_]{43}$/.test(p.code_challenge ?? "")) return { erro: "Pedido de conexão sem proteção PKCE." };
  if (!resourceValido(p.resource)) return { erro: "Este pedido é para outro servidor." };
  return { clienteId: cliente.id, clienteNome: cliente.nome, redirectUri: p.redirect_uri, state: p.state, codeChallenge: p.code_challenge! };
}

export function urlRetorno(redirectUri: string, params: Record<string, string | undefined>) {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  url.searchParams.set("iss", urlBase());
  return url.toString();
}

export async function criarCodigo(pedido: PedidoAutorizacao, profileId: string) {
  const codigo = novoToken("fvc");
  await prisma.mcpAuthCode.create({
    data: {
      codeHash: hashToken(codigo), expiresAt: new Date(Date.now() + CODIGO_MS), clientId: pedido.clienteId,
      profileId, redirectUri: pedido.redirectUri, codeChallenge: pedido.codeChallenge,
    },
  });
  return codigo;
}

// Atendente desativado pela equipe perde o conector junto com o login
async function membroAtivo(profileId: string) {
  const m = await prisma.teamMember.findUnique({ where: { profileId }, select: { active: true } });
  return !m || m.active;
}

function novoPar() {
  const access = novoToken("fva");
  const refresh = novoToken("fvr");
  const agora = Date.now();
  return {
    resposta: { access_token: access, token_type: "Bearer", expires_in: ACESSO_MS / 1000, refresh_token: refresh, scope: ESCOPO_MCP },
    dados: {
      accessHash: hashToken(access), accessExpiresAt: new Date(agora + ACESSO_MS),
      refreshHash: hashToken(refresh), refreshExpiresAt: new Date(agora + REFRESH_MS),
    },
  };
}

export async function trocarCodigo(p: { code: string; clientId: string; redirectUri: string; verifier: string }) {
  const codeHash = hashToken(p.code);
  const codigo = await prisma.mcpAuthCode.findUnique({ where: { codeHash } });
  if (!codigo) return null;
  // Apaga antes de conferir: código é de uso único, mesmo numa tentativa errada
  const apagou = await prisma.mcpAuthCode.deleteMany({ where: { codeHash } });
  if (apagou.count === 0 || codigo.expiresAt < new Date() || codigo.clientId !== p.clientId || codigo.redirectUri !== p.redirectUri) return null;
  if (!pkceConfere(p.verifier, codigo.codeChallenge) || !(await membroAtivo(codigo.profileId))) return null;
  const par = novoPar();
  await prisma.mcpToken.create({ data: { clientId: codigo.clientId, profileId: codigo.profileId, ...par.dados } });
  return par.resposta;
}

export async function renovarToken(refresh: string, clientId: string) {
  const refreshHash = hashToken(refresh);
  const token = await prisma.mcpToken.findUnique({ where: { refreshHash } });
  if (!token || token.clientId !== clientId || token.revokedAt || token.refreshExpiresAt < new Date()) return null;
  if (!(await membroAtivo(token.profileId))) return null;
  const par = novoPar();
  const trocou = await prisma.mcpToken.updateMany({ where: { id: token.id, refreshHash, revokedAt: null }, data: par.dados });
  return trocou.count === 1 ? par.resposta : null;
}

export async function autenticarBearer(header: string | null) {
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;
  const linha = await prisma.mcpToken.findUnique({
    where: { accessHash: hashToken(token) },
    select: { id: true, accessExpiresAt: true, revokedAt: true, lastUsedAt: true, profileId: true, profile: { select: { role: true } } },
  });
  if (!linha || linha.revokedAt || linha.accessExpiresAt < new Date()) return null;
  if (!(await membroAtivo(linha.profileId))) return null;
  if (!linha.lastUsedAt || Date.now() - linha.lastUsedAt.getTime() > 5 * 60 * 1000) {
    prisma.mcpToken.update({ where: { id: linha.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  }
  return { tokenId: linha.id, userId: linha.profileId, role: linha.profile.role };
}

// Limite em memória (o app roda em um único processo no pm2)
const janelas = new Map<string, { inicio: number; total: number }>();
export function dentroDoLimite(chave: string, maximo: number, janelaMs: number) {
  const agora = Date.now();
  if (janelas.size > 5000) for (const [k, j] of janelas) if (agora - j.inicio > janelaMs) janelas.delete(k);
  const atual = janelas.get(chave);
  if (!atual || agora - atual.inicio > janelaMs) {
    janelas.set(chave, { inicio: agora, total: 1 });
    return true;
  }
  atual.total += 1;
  return atual.total <= maximo;
}
