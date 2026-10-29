// Etapa 10 — testes de compra, upsell, reembolso e idempotência dos infoprodutos. Roda NA VPS,
// contra o app (localhost:3002) e o SANDBOX do Asaas (sem dinheiro real). Liga o modo teste da
// oferta vendas-ia só durante o teste e, no fim, devolve o estado anterior e revoga os acessos de teste.
// Uso (na VPS): cd ~/fluxvenda && node scripts/teste-infoprodutos.js
const { execSync } = require("child_process");
const fs = require("fs");

const env = {};
for (const linha of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = linha.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"|"$/g, "").replace(/\\\$/g, "$");
}
const DB = (env.DATABASE_URL || "").split("?")[0];
const BASE = "http://localhost:3002";
const SANDBOX_KEY = env.ASAAS_PLATFORM_SANDBOX_API_KEY;
const WEBHOOK_TOKEN = env.ASAAS_PLATFORM_WEBHOOK_TOKEN;
const ASAAS = "https://api-sandbox.asaas.com/v3";

const q = sql => execSync(`psql "${DB}" -At -F'|' -c ${JSON.stringify(sql)}`, { encoding: "utf8" }).trim();
let falhas = 0;
const check = (cond, nome, extra = "") => { console.log(`${cond ? "ok    " : "FALHOU"} ${nome}${extra ? " — " + extra : ""}`); if (!cond) falhas++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function cpfValido() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const dv = base => { const s = base.reduce((a, d, i) => a + d * (base.length + 1 - i), 0); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
  n.push(dv(n)); n.push(dv(n));
  return n.join("");
}
async function api(path, init) {
  const res = await fetch(BASE + path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
async function asaas(path, init) {
  const res = await fetch(ASAAS + path, { ...init, headers: { "Content-Type": "application/json", access_token: SANDBOX_KEY } });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const acessosDaCompra = id => q(`SELECT p.slug || ':' || a.ativo FROM "AcessoProduto" a JOIN "InfoProduto" p ON p.id=a."produtoId" WHERE a."compraId"='${id}' ORDER BY p.slug`).split("\n").filter(Boolean);

(async () => {
  if (!SANDBOX_KEY) { console.log("SEM ASAAS_PLATFORM_SANDBOX_API_KEY — abortando"); process.exit(1); }
  console.log(`webhook token configurado: ${WEBHOOK_TOKEN ? "sim" : "NÃO"}`);
  const antes = q(`SELECT ativa || '|' || sandbox FROM "Oferta" WHERE slug='vendas-ia'`);
  console.log(`oferta antes do teste (ativa|sandbox): ${antes}`);
  q(`UPDATE "Oferta" SET ativa=true, sandbox=true WHERE slug='vendas-ia'`);
  const ts = Date.now().toString(36);
  const email1 = `marquestaian+vendasia-teste-${ts}@gmail.com`;
  const email2 = `marquestaian+vendasia-pix-${ts}@gmail.com`;
  const cartao = { holderName: "TESTE SANDBOX", number: "5162306219378829", expiryMonth: "05", expiryYear: "30", ccv: "318", postalCode: "89223005", addressNumber: "277" };

  try {
    // ── 1. Checkout no cartão com os dois order bumps ──
    console.log("\n[1] Cartão + 2 order bumps");
    const r1 = await api("/api/comprar/vendas-ia", { method: "POST", body: JSON.stringify({
      nome: "Teste Sandbox Cartão", email: email1, telefone: "11999990000", cpfCnpj: cpfValido(), formaPagamento: "CARTAO",
      bumps: ["produto-analisador-vendas", "produto-whatsapp-vendedor"], cartao,
    }) });
    check(r1.status === 200 && r1.body.status === "PAGO", "pagamento aprovado e compra PAGO", `HTTP ${r1.status} ${JSON.stringify(r1.body).slice(0, 160)}`);
    const c1 = r1.body.compraId;
    if (c1) {
      const [valor, status, sandbox, profileId] = q(`SELECT "valorCentavos", status, sandbox, "profileId" FROM "Compra" WHERE id='${c1}'`).split("|");
      check(valor === "8180", "total calculado no servidor = R$ 81,80", valor);
      check(sandbox === "t", "compra marcada como teste (sandbox)");
      check(acessosDaCompra(c1).join(",") === "100-prompts-vendas:true,analisador-vendas:true,whatsapp-vendedor:true", "3 acessos liberados", acessosDaCompra(c1).join(","));
      const [onb, prods, token] = q(`SELECT onboarded, "productsOwned", ("passwordResetToken" IS NOT NULL) FROM "Profile" WHERE id='${profileId}'`).split("|");
      check(onb === "t" && prods === "{}" && token === "t", "conta criada: onboarded, sem Plataforma/CRM, com link pra criar senha", `${onb}|${prods}|${token}`);

      // Idempotência: consultar de novo não duplica acesso
      await api(`/api/comprar/status/${c1}`); await api(`/api/comprar/status/${c1}`);
      check(acessosDaCompra(c1).length === 3, "consultar de novo não duplica acessos");

      // ── 2. Upsell ──
      console.log("\n[2] Upsell");
      const tok = r1.body.upsellToken;
      const falso = await api(`/api/comprar/upsell/${c1}?t=${encodeURIComponent(tok.slice(0, -2) + "xx")}`);
      check(falso.body.upsell === null, "assinatura adulterada não mostra upsell");
      const up = await api(`/api/comprar/upsell/${c1}?t=${encodeURIComponent(tok)}`);
      check(up.body.upsell?.nome === "Biblioteca de Anúncios IA" && up.body.upsell?.precoCentavos === 3700, "upsell oferecido: Biblioteca de Anúncios IA por R$ 37,00", JSON.stringify(up.body).slice(0, 140));
      console.log(`       cartão salvo pro 1 clique: ${up.body.upsell?.cartaoFinal ? "final " + up.body.upsell.cartaoFinal : "não (tokenização indisponível) → Pix"}`);
      const forma = up.body.upsell?.cartaoFinal ? "CARTAO_SALVO" : "PIX";
      const ac = await api(`/api/comprar/upsell/${c1}`, { method: "POST", body: JSON.stringify({ t: tok, forma }) });
      let cUp = ac.body.compraId;
      if (forma === "PIX" && cUp) {
        const pid = q(`SELECT "asaasPaymentId" FROM "Compra" WHERE id='${cUp}'`);
        await asaas(`/payments/${pid}/receiveInCash`, { method: "POST", body: JSON.stringify({ paymentDate: new Date().toISOString().slice(0, 10), value: 37 }) });
        await sleep(1500);
        await api(`/api/comprar/status/${cUp}`);
      }
      const stUp = cUp ? q(`SELECT status || '|' || "valorCentavos" || '|' || ("compraOrigemId"='${c1}') FROM "Compra" WHERE id='${cUp}'`) : "";
      check(stUp === "PAGO|3700|t", `upsell (${forma}) pago, R$ 37,00, ligado à compra original`, stUp || JSON.stringify(ac.body).slice(0, 160));
      check(cUp && acessosDaCompra(cUp).join(",") === "anuncios-ia:true", "Biblioteca de Anúncios liberada");
      const de_novo = await api(`/api/comprar/upsell/${c1}?t=${encodeURIComponent(tok)}`);
      check(de_novo.body.upsell === null, "upsell não é oferecido de novo depois de comprado");

      // ── 4. Reembolso do upsell via Asaas + webhook ──
      console.log("\n[4] Reembolso do upsell");
      if (cUp) {
        const pid = q(`SELECT "asaasPaymentId" FROM "Compra" WHERE id='${cUp}'`);
        const rf = await asaas(`/payments/${pid}/refund`, { method: "POST", body: "{}" });
        console.log(`       Asaas refund: HTTP ${rf.status} status=${rf.body.status ?? JSON.stringify(rf.body).slice(0, 120)}`);
        await sleep(2000);
        const evt = { id: `evt_teste_refund_${ts}`, event: "PAYMENT_REFUNDED", payment: { id: pid } };
        const wh = await fetch(BASE + "/api/webhooks/asaas-plataforma", { method: "POST", headers: { "Content-Type": "application/json", "asaas-access-token": WEBHOOK_TOKEN || "" }, body: JSON.stringify(evt) });
        const wh2 = await fetch(BASE + "/api/webhooks/asaas-plataforma", { method: "POST", headers: { "Content-Type": "application/json", "asaas-access-token": WEBHOOK_TOKEN || "" }, body: JSON.stringify(evt) });
        console.log(`       webhook: HTTP ${wh.status} e reenvio HTTP ${wh2.status}`);
        const stR = q(`SELECT status FROM "Compra" WHERE id='${cUp}'`);
        check(stR === "REEMBOLSADO", "compra do upsell virou REEMBOLSADO", stR);
        check(acessosDaCompra(cUp).join(",") === "anuncios-ia:false", "acesso à Biblioteca de Anúncios revogado");
        check(acessosDaCompra(c1).every(a => a.endsWith(":true")), "os 3 produtos da compra original continuam liberados");
        check(q(`SELECT count(*) FROM "PagamentoEvento" WHERE "eventoId"='${evt.id}'`) === "1", "webhook repetido processado uma vez só");
      }
    }

    // ── 3. Pix (só o principal), confirmado no sandbox ──
    console.log("\n[3] Pix");
    const r3 = await api("/api/comprar/vendas-ia", { method: "POST", body: JSON.stringify({ nome: "Teste Sandbox Pix", email: email2, telefone: "11999990001", cpfCnpj: cpfValido(), formaPagamento: "PIX", bumps: [] }) });
    check(r3.status === 200 && r3.body.status === "PENDENTE" && r3.body.pix?.payload, "Pix gerado (pendente, com QR)", `HTTP ${r3.status}`);
    const c3 = r3.body.compraId;
    if (c3) {
      check(acessosDaCompra(c3).length === 0, "nada liberado antes do pagamento");
      const pend = await api(`/api/comprar/status/${c3}`);
      check(pend.body.status === "PENDENTE", "consulta antes de pagar continua PENDENTE (página de obrigado não libera)");
      const pid = q(`SELECT "asaasPaymentId" FROM "Compra" WHERE id='${c3}'`);
      const pg = await asaas(`/payments/${pid}/receiveInCash`, { method: "POST", body: JSON.stringify({ paymentDate: new Date().toISOString().slice(0, 10), value: 47 }) });
      console.log(`       pagamento confirmado no sandbox: HTTP ${pg.status} status=${pg.body.status ?? ""}`);
      await sleep(1500);
      const st = await api(`/api/comprar/status/${c3}`);
      check(st.body.status === "PAGO", "Pix confirmado → compra PAGO", JSON.stringify(st.body).slice(0, 100));
      check(acessosDaCompra(c3).join(",") === "100-prompts-vendas:true", "só o produto principal liberado");
    }

    // ── 5. Manipulação do pedido pelo navegador ──
    console.log("\n[5] Pedido manipulado");
    const r5 = await api("/api/comprar/vendas-ia", { method: "POST", body: JSON.stringify({ nome: "Teste Manipulação", email: email2, telefone: "", cpfCnpj: cpfValido(), formaPagamento: "PIX", bumps: ["produto-anuncios-ia", "produto-inexistente", "produto-analisador-vendas"], valor: 1, total: 1 }) });
    const c5 = r5.body.compraId;
    const v5 = c5 ? q(`SELECT "valorCentavos" || '|' || (SELECT string_agg("produtoId", ',' ORDER BY "produtoId") FROM "CompraItem" WHERE "compraId"='${c5}') FROM "Compra" WHERE id='${c5}'`) : "";
    check(v5 === "6690|produto-100-prompts,produto-analisador-vendas", "upsell e produto falso ignorados; valor do navegador ignorado (R$ 66,90)", v5);
  } catch (err) {
    console.log("ERRO:", err.message); falhas++;
  } finally {
    // ── Limpeza ──
    const [ativa, sandbox] = antes.split("|");
    q(`UPDATE "Oferta" SET ativa=${ativa === "t"}, sandbox=${sandbox === "t"} WHERE slug='vendas-ia'`);
    const rev = q(`UPDATE "AcessoProduto" SET ativo=false, "revogadoEm"=now(), motivo='Teste encerrado' WHERE ativo=true AND "compraId" IN (SELECT id FROM "Compra" WHERE sandbox=true) RETURNING id`).split("\n").filter(Boolean).length;
    console.log(`\nlimpeza: oferta voltou a ativa=${ativa === "t"} sandbox=${sandbox === "t"}; ${rev} acesso(s) de teste revogado(s)`);
    console.log(`contas de teste: ${email1}, ${email2}`);
    console.log(falhas ? `\n${falhas} FALHA(S)` : "\nTODOS OS TESTES PASSARAM");
  }
})();
