import type { Metadata } from "next";
import Link from "next/link";
import { Check, CheckCircle2, Clock, KeyRound, XCircle } from "lucide-react";
import { auth } from "@/lib/auth/server";
import { assinarUpsell, carregarAcessoCompra } from "@/lib/compras";
import { UpsellOferta } from "../../UpsellOferta";
import { AguardandoPagamento, CriarSenhaForm } from "./AcessoClient";

export const metadata: Metadata = { title: "Seu acesso", robots: { index: false } };
export const dynamic = "force-dynamic";

const fundo = "min-h-dvh bg-[#f4f6fb] text-slate-900 flex flex-col items-center justify-center gap-4 p-4";
const cartaoCls = "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] max-w-md w-full p-8";
const botao = "block w-full text-center rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-sm font-semibold text-white";
const DESTINO = "/inicio";

// Página de acesso da compra (o checkout redireciona pra cá depois do pagamento; o mesmo link vai
// por e-mail e WhatsApp). Conta criada por esta compra cria a senha e já entra; quem já tinha conta
// só entra. O link é assinado (lib/compras.ts → carregarAcessoCompra).
export default async function AcessoCompraPage({ params, searchParams }: {
  params: Promise<{ compraId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { compraId } = await params;
  const { t } = await searchParams;
  const acesso = await carregarAcessoCompra(compraId, t);

  if (!acesso) {
    return (
      <main className={fundo}>
        <div className={`${cartaoCls} text-center space-y-4`}>
          <XCircle size={44} className="mx-auto text-slate-400" />
          <h1 className="text-xl font-bold">Link de acesso inválido ou vencido</h1>
          <p className="text-sm text-slate-600">Se você já comprou, entre com o e-mail usado na compra. Ainda não criou a senha? Use “Esqueci minha senha”.</p>
          <Link href={`/sign-in?redirect_url=${DESTINO}`} className={botao}>Entrar</Link>
          <Link href="/esqueci-senha" className="block text-sm text-indigo-600 font-medium">Esqueci minha senha</Link>
        </div>
      </main>
    );
  }

  const { compra, profile, podeCriarSenha } = acesso;
  if (compra.status === "PENDENTE") {
    return <main className={fundo}><div className={cartaoCls}><AguardandoPagamento compraId={compra.id} /></div></main>;
  }
  if (compra.status !== "PAGO" || !profile) {
    return (
      <main className={fundo}>
        <div className={`${cartaoCls} text-center space-y-3`}>
          <Clock size={44} className="mx-auto text-slate-400" />
          <h1 className="text-xl font-bold">Esta compra não está ativa</h1>
          <p className="text-sm text-slate-600">O pagamento não foi concluído ou a compra foi cancelada. Se acha que é um engano, fale com o nosso suporte.</p>
        </div>
      </main>
    );
  }

  const { userId } = await auth().catch(() => ({ userId: null as string | null }));
  const logadoNaConta = userId === profile.id;
  const produtos = compra.itens.map(i => i.produto.nome);

  return (
    <main className={fundo}>
      <div className={`${cartaoCls} space-y-5`}>
        <div className="text-center space-y-2">
          <CheckCircle2 size={52} className="mx-auto text-emerald-500" />
          <h1 className="text-2xl font-bold">Pagamento confirmado!</h1>
          <p className="text-slate-600">Você já tem acesso a:</p>
        </div>
        <ul className="space-y-1.5">
          {produtos.map(p => <li key={p} className="flex items-center gap-2 text-sm"><Check size={15} className="text-emerald-600 flex-shrink-0" /> {p}</li>)}
        </ul>

        {logadoNaConta && !podeCriarSenha ? (
          <Link href={DESTINO} className={botao}>Acessar minha área</Link>
        ) : podeCriarSenha ? (
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound size={18} className="text-indigo-600" />
              <h2 className="font-semibold">Crie sua senha para entrar</h2>
            </div>
            <p className="text-sm text-slate-600">Seu login é o e-mail <strong>{profile.email}</strong>.</p>
            {/* Conta nova: depois da senha, o perfil da empresa (uma pergunta por tela) */}
            <CriarSenhaForm compraId={compra.id} token={t!} destino="/boas-vindas" />
          </div>
        ) : (
          <div className="border-t border-slate-100 pt-5 space-y-3 text-center">
            <p className="text-sm text-slate-600">Os produtos foram liberados na conta <strong>{profile.email}</strong>. Entre com o seu e-mail e senha.</p>
            <Link href={`/sign-in?redirect_url=${DESTINO}`} className={botao}>Entrar</Link>
            <Link href="/esqueci-senha" className="block text-sm text-indigo-600 font-medium">Ainda não tem senha? Crie aqui</Link>
          </div>
        )}
        <p className="text-xs text-slate-400 text-center">Também enviamos a confirmação e o link de acesso para o seu e-mail e WhatsApp.</p>
      </div>
      <UpsellOferta compraId={compra.id} token={assinarUpsell(compra.id)} />
    </main>
  );
}
