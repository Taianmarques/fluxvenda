// Cadastra o produto "Gestor de Tráfego com IA" (formato curso) com os módulos e os 30 comandos
// prontos. Os textos dos comandos são os enviados pela equipe, sem alteração; o título curto de
// cada um foi criado para a lista da área do curso.
//
// Uso (no servidor, dentro de ~/fluxvenda):
//   npx tsx scripts/cadastrar-gestor-trafego.ts              → só mostra o que faria (não grava)
//   npx tsx scripts/cadastrar-gestor-trafego.ts --aplicar    → grava
//   ... --aplicar --substituir                               → apaga e recria os comandos dos módulos
//
// Seguro para rodar de novo: o produto e os módulos são reaproveitados pelo slug/id; módulo que já
// tem comandos fica como está (a não ser com --substituir). As aulas em vídeo NÃO são criadas aqui
// (cadastre no admin quando tiver os links do Vimeo). O produto nasce como rascunho (publicado =
// false); publique no admin quando estiver pronto.
import { prisma } from "../lib/prisma";

const APLICAR = process.argv.includes("--aplicar");
const SUBSTITUIR = process.argv.includes("--substituir");

const PRODUTO = {
  slug: "gestor-trafego-ia",
  nome: "Gestor de Tráfego com IA",
  beneficio: "Conecte o Meta Ads ao ChatGPT ou ao Claude e gerencie seus anúncios conversando com a IA.",
  descricao: "Aulas em vídeo e comandos prontos para conectar a conta de anúncios, analisar resultados, criar campanhas, otimizar e montar agentes que acompanham as campanhas por você.",
  categoria: "Tráfego",
  icone: "megaphone",
};

const MODULOS: { chave: string; nome: string; icone: string; comandos: [titulo: string, texto: string][] }[] = [
  {
    chave: "aula-1", nome: "Conectar e conhecer a conta", icone: "search",
    comandos: [
      ["Ver contas disponíveis", "Quais contas de anúncios estão disponíveis no MCP do Meta?"],
      ["Contas prontas para anunciar", "Quais dessas contas estão ativas, com forma de pagamento e prontas para anunciar?"],
      ["Campanhas ativas e gasto", "Liste as campanhas ativas da conta [nome da conta] com o gasto dos últimos 7 dias."],
      ["Páginas e perfis conectados", "Quais páginas do Facebook e perfis do Instagram estão conectados à conta [nome da conta]?"],
      ["Conferir pixel e eventos", "Verifique se a conta [nome da conta] tem pixel e quais eventos ele está registrando."],
    ],
  },
  {
    chave: "aula-2", nome: "Analisar", icone: "bar-chart",
    comandos: [
      ["O que está funcionando", "Analise as campanhas ativas da conta [nome da conta] e me diga o que está funcionando e o que não está."],
      ["Anúncio com resultado mais barato", "Compare os anúncios da campanha [nome da campanha] e me diga qual está trazendo resultado mais barato."],
      ["Gasto por idade e gênero", "Mostre a divisão do gasto da campanha [nome] por idade e gênero. Para quem está indo a maior parte da verba?"],
      ["Gasto por posicionamento", "Em quais posicionamentos (Feed, Stories, Reels, Facebook, Instagram) a campanha [nome] está gastando, e quais dão resultado?"],
      ["Muitos cliques, poucos resultados", "A campanha [nome] tem muitos cliques e poucos resultados. Investigue o motivo."],
      ["Custo por lead subiu", "Meu custo por lead subiu nos últimos dias. Descubra o que mudou na campanha [nome]."],
      ["Frequência e criativo cansado", "A frequência dos meus anúncios está alta? Algum criativo está cansando o público?"],
      ["Esta semana × semana passada", "Compare o desempenho desta semana com a semana passada na conta [nome da conta]."],
      ["Relatório de 30 dias para o cliente", "Faça um relatório simples da conta [nome da conta] dos últimos 30 dias para eu enviar ao meu cliente."],
    ],
  },
  {
    chave: "aula-3", nome: "Criar campanha", icone: "rocket",
    comandos: [
      ["Estrutura ideal de campanha", "Qual a estrutura de campanha ideal para [seu negócio] com orçamento de R$ [valor] por dia?"],
      ["Estimativa de resultados", "Quantos [leads/vendas/mensagens] posso esperar por semana investindo R$ [valor] por dia?"],
      ["Criar campanha pausada para revisão", "Crie uma campanha de [mensagens no WhatsApp / cadastros / vendas] para [produto], público de [idade] anos em [cidade/estado/Brasil], com R$ [valor] por dia. Deixe tudo pausado para eu revisar."],
      ["3 versões de texto e título", "Escreva 3 versões de texto e título para um anúncio de [produto], destacando [benefício principal]."],
      ["Subir vídeo e criar anúncio", "Suba este vídeo [arquivo] e crie um anúncio com o botão “[Saiba mais / Enviar mensagem]” levando para [link]."],
      ["Resumo antes de publicar", "Me mostre um resumo do que você criou antes de publicar: objetivo, público, orçamento, posicionamentos, textos e link."],
      ["Publicar e ativar", "Pode publicar a campanha [nome] e ativar."],
    ],
  },
  {
    chave: "aula-4", nome: "Otimizar", icone: "trending-up",
    comandos: [
      ["Travar faixa de idade", "Trave a idade do conjunto [nome] entre [X] e [Y] anos."],
      ["Rodar só no Instagram", "Deixe a campanha [nome] rodando só no Instagram."],
      ["Pausar o pior anúncio", "Pause o anúncio que está com o pior resultado na campanha [nome]."],
      ["Aumentar orçamento", "Aumente o orçamento da campanha [nome] para R$ [valor] por dia."],
      ["Duplicar conjunto para teste", "Duplique o conjunto [nome] com [mudança] para eu testar lado a lado, com R$ [valor] por dia cada."],
      ["Hora de mexer ou esperar?", "Já tem dados suficientes para mexer na campanha [nome] ou devo esperar mais?"],
    ],
  },
  {
    chave: "aula-5", nome: "Agente automático", icone: "zap",
    comandos: [
      ["Alerta diário de custo", "Crie um agente que confira a campanha [nome] todo dia às 9h e me avise se o custo por resultado passar de R$ [valor]."],
      ["Análise semanal com recomendações", "Crie uma análise semanal toda segunda-feira com os destaques da conta [nome da conta] e até 3 recomendações para eu aprovar."],
      ["Alerta de queda na entrega", "Me avise se alguma campanha da conta [nome da conta] parar de entregar ou se o gasto cair de repente."],
    ],
  },
];

async function main() {
  const total = MODULOS.reduce((s, m) => s + m.comandos.length, 0);
  console.log(`${APLICAR ? "APLICANDO" : "SIMULAÇÃO (nada é gravado; use --aplicar)"} · ${MODULOS.length} módulos · ${total} comandos${SUBSTITUIR ? " · substituindo comandos existentes" : ""}`);

  let produto = await prisma.infoProduto.findUnique({ where: { slug: PRODUTO.slug } });
  if (produto) {
    console.log(`Produto já existe (${produto.id}) · formato ${produto.formato}${produto.formato !== "curso" ? " → curso" : ""}`);
    if (APLICAR && produto.formato !== "curso") produto = await prisma.infoProduto.update({ where: { id: produto.id }, data: { formato: "curso" } });
  } else {
    console.log(`Criar produto "${PRODUTO.nome}" (/biblioteca/${PRODUTO.slug}) como rascunho`);
    if (APLICAR) produto = await prisma.infoProduto.create({ data: { ...PRODUTO, formato: "curso", publicado: false } });
  }

  let proximoNumero = ((await prisma.centralModulo.aggregate({ _max: { numero: true } }))._max.numero ?? 0) + 1;
  for (const [i, m] of MODULOS.entries()) {
    const id = `${PRODUTO.slug}-${m.chave}`;
    const existente = await prisma.centralModulo.findUnique({ where: { id }, include: { _count: { select: { comandos: true } } } });
    if (!existente) {
      console.log(`  Módulo ${i + 1} "${m.nome}": criar (número ${proximoNumero})`);
      if (APLICAR && produto) await prisma.centralModulo.create({ data: { id, numero: proximoNumero, nome: m.nome, icone: m.icone, produtoId: produto.id } });
      proximoNumero++;
    } else {
      console.log(`  Módulo ${i + 1} "${m.nome}": já existe (${existente._count.comandos} comandos)`);
    }

    const jaTem = existente?._count.comandos ?? 0;
    if (jaTem > 0 && !SUBSTITUIR) {
      console.log(`    comandos mantidos (use --substituir para recriar)`);
      continue;
    }
    console.log(`    ${jaTem > 0 ? `apagar ${jaTem} e ` : ""}criar ${m.comandos.length} comandos publicados`);
    if (!APLICAR) continue;
    if (jaTem > 0) await prisma.centralComando.deleteMany({ where: { moduloId: id } });
    await prisma.centralComando.createMany({
      data: m.comandos.map(([titulo, texto], ordem) => ({ moduloId: id, titulo, texto, ordem, publicada: true })),
    });
  }
  console.log(APLICAR ? "Pronto." : "Simulação concluída. Rode de novo com --aplicar para gravar.");
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
