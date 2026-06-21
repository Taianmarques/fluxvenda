export type Question = {
  id: string;
  text: string;
  type: "text" | "select";
  placeholder?: string;
  options?: string[];
};

export type AreaConfig = {
  intro: string;
  questions: Question[];
  solutionLabel: string;
  solutionPrompt: (answers: Record<string, string>, segment: string) => string;
};

export const AREA_QUESTIONS: Record<string, AreaConfig> = {
  leads: {
    intro: "Vamos construir seu Perfil de Cliente Ideal e definir os melhores canais de prospecção para o seu segmento.",
    solutionLabel: "ICP + Estratégia de Prospecção",
    questions: [
      { id: "cargo", type: "text", text: "Qual é o cargo ou função do seu cliente ideal?", placeholder: "Ex: Diretor Comercial, Dono de clínica, Gestor de TI..." },
      { id: "tamanho", type: "select", text: "Qual é o porte das empresas que você quer atingir?", options: ["Autônomos / MEI", "Micro (1–9 funcionários)", "Pequena (10–49)", "Média (50–199)", "Grande (200+)"] },
      { id: "dor", type: "text", text: "Qual é o principal problema que o seu produto/serviço resolve para esse cliente?", placeholder: "Ex: perda de clientes por falta de follow-up..." },
      { id: "canais_atuais", type: "text", text: "Como você gera leads hoje?", placeholder: "Ex: indicações, LinkedIn, Google Ads, eventos..." },
      { id: "canal_potencial", type: "text", text: "Qual canal você acha que tem mais potencial mas ainda não explorou direito?", placeholder: "Ex: LinkedIn, parceiros, conteúdo..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em vendas B2B no segmento "${seg}".
Com base nas respostas do empresário, crie um documento prático com 2 seções:

RESPOSTAS:
- Cliente ideal: ${a.cargo} em empresas ${a.tamanho}
- Problema que resolve: ${a.dor}
- Canais atuais: ${a.canais_atuais}
- Canal com potencial: ${a.canal_potencial}

Crie:

**1. PERFIL DE CLIENTE IDEAL (ICP)**
- Cargo/função alvo
- Porte de empresa
- Setor (infira do segmento)
- Principal dor resolvida
- Como esse cliente toma decisão de compra (infira do perfil)

**2. TOP 3 CANAIS DE PROSPECÇÃO**
Para cada canal: nome, por que faz sentido para esse perfil, e 1 ação concreta para começar essa semana.

Seja específico e prático. Use exemplos reais do segmento "${seg}".`,
  },

  process: {
    intro: "Vamos mapear onde estão os gargalos no seu processo comercial e criar um funil de vendas estruturado.",
    solutionLabel: "Funil de Vendas Estruturado",
    questions: [
      { id: "etapas", type: "text", text: "Descreva as etapas do seu processo de vendas hoje (do primeiro contato ao fechamento):", placeholder: "Ex: prospecção → reunião → proposta → follow-up → fechamento" },
      { id: "gargalo", type: "select", text: "Em qual etapa os negócios morrem com mais frequência?", options: ["Prospecção (não gero leads suficientes)", "Qualificação (falo com pessoas erradas)", "Reunião / apresentação", "Envio de proposta", "Follow-up / negociação", "Fechamento"] },
      { id: "ciclo", type: "select", text: "Quanto tempo leva em média do primeiro contato ao fechamento?", options: ["Menos de 1 semana", "1–2 semanas", "15–30 dias", "1–3 meses", "Mais de 3 meses"] },
      { id: "follow_up", type: "select", text: "O que acontece quando um lead some depois de receber a proposta?", options: ["Insisto com follow-up estruturado", "Mando 1-2 mensagens e desisto", "Geralmente não faço follow-up", "Vario muito, não tenho padrão"] },
      { id: "maior_problema", type: "text", text: "Qual é a sua maior dificuldade no processo comercial hoje?", placeholder: "Ex: falta de tempo, equipe pequena, preço..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em processos comerciais B2B no segmento "${seg}".
Com base nas respostas, crie um funil de vendas estruturado:

RESPOSTAS:
- Processo atual: ${a.etapas}
- Maior gargalo: ${a.gargalo}
- Ciclo médio: ${a.ciclo}
- Comportamento no follow-up: ${a.follow_up}
- Maior problema: ${a.maior_problema}

Crie:

**1. FUNIL DE VENDAS MELHORADO**
Defina 5–6 etapas claras com: nome da etapa, critério de entrada, critério de avanço, e prazo máximo em cada etapa.

**2. SOLUÇÃO PARA O GARGALO PRINCIPAL**
Com base no gargalo "${a.gargalo}", dê 3 ações práticas e imediatas para resolver.

**3. PROCESSO DE FOLLOW-UP**
Crie uma régua de follow-up: contato 1 (quando e o que dizer), contato 2 (quando e o que dizer), contato 3 (quando e o que dizer).

Seja específico para o segmento "${seg}".`,
  },

  team: {
    intro: "Vamos identificar as objeções mais críticas do seu negócio e construir respostas prontas para cada uma.",
    solutionLabel: "Guia de Objeções e Respostas",
    questions: [
      { id: "objecao_principal", type: "select", text: "Qual objeção você recebe com mais frequência?", options: ["\"Tá caro\" / preço alto", "\"Preciso pensar\" / sem urgência", "\"Já tenho fornecedor\"", "\"Não é prioridade agora\"", "\"Me manda por e-mail\""] },
      { id: "resposta_preco", type: "text", text: "Como você responde quando o cliente diz \"tá caro\"? (seja honesto)", placeholder: "Ex: explico o valor, dou desconto, fico sem argumento..." },
      { id: "desconto", type: "select", text: "Com que frequência você concede desconto?", options: ["Sempre que pedem", "Na maioria dos casos", "Às vezes, sem critério claro", "Raramente, só com contrapartida", "Quase nunca"] },
      { id: "negocio_perdido", type: "text", text: "Descreva um negócio que você perdeu recentemente. Por que o cliente não fechou?", placeholder: "Ex: foi para o concorrente, achou caro, sumiu..." },
      { id: "melhoria_negociacao", type: "text", text: "O que você gostaria de saber falar melhor nas negociações?", placeholder: "Ex: defender o preço, criar urgência, lidar com concorrente..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em negociação e gestão de objeções B2B no segmento "${seg}".
Com base nas respostas, crie um guia de objeções personalizado:

RESPOSTAS:
- Objeção mais comum: ${a.objecao_principal}
- Como responde ao "tá caro": ${a.resposta_preco}
- Frequência de desconto: ${a.desconto}
- Negócio perdido recentemente: ${a.negocio_perdido}
- O que quer melhorar: ${a.melhoria_negociacao}

Crie:

**1. RESPOSTAS PRONTAS PARA AS 3 PRINCIPAIS OBJEÇÕES**
Para cada objeção: a objeção exata, a psicologia por trás dela, e um roteiro de resposta em 2-3 frases que preserve o valor sem dar desconto.

**2. POLÍTICA DE DESCONTO**
Com base no padrão "${a.desconto}", defina: quando e como conceder desconto (máximo %, com qual contrapartida, quem autoriza).

**3. ANÁLISE DO NEGÓCIO PERDIDO**
Analise o caso "${a.negocio_perdido}" e diga o que poderia ter sido feito diferente em cada etapa.

Seja direto e use linguagem de vendas real do segmento "${seg}".`,
  },

  kpis: {
    intro: "Vamos definir os KPIs mais importantes para o seu negócio e criar metas realistas para os próximos 90 dias.",
    solutionLabel: "Dashboard de KPIs Comerciais",
    questions: [
      { id: "metricas_atuais", type: "text", text: "Quais números de vendas você acompanha hoje?", placeholder: "Ex: faturamento, número de clientes, nada sistemático..." },
      { id: "taxa_conversao", type: "select", text: "Você sabe sua taxa de conversão de leads para clientes?", options: ["Sim, acompanho regularmente", "Tenho uma estimativa aproximada", "Não sei ao certo", "Não acompanho isso"] },
      { id: "frequencia_revisao", type: "select", text: "Com que frequência você revisa seus números comerciais?", options: ["Todo dia", "Uma vez por semana", "Uma vez por mês", "Raramente", "Quando tem problema"] },
      { id: "numero_desconhecido", type: "text", text: "Qual número você não consegue responder de cabeça mas deveria saber?", placeholder: "Ex: ticket médio, CAC, tempo médio de ciclo..." },
      { id: "pipeline", type: "text", text: "Quantos negócios ativos estão no seu pipeline hoje e qual o valor total estimado?", placeholder: "Ex: 8 negócios, R$ 120.000 em aberto..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em KPIs e gestão comercial B2B no segmento "${seg}".
Com base nas respostas, crie um dashboard de KPIs personalizado:

RESPOSTAS:
- Métricas atuais: ${a.metricas_atuais}
- Conhecimento da taxa de conversão: ${a.taxa_conversao}
- Frequência de revisão: ${a.frequencia_revisao}
- Número desconhecido mas importante: ${a.numero_desconhecido}
- Pipeline atual: ${a.pipeline}

Crie:

**1. OS 5 KPIs ESSENCIAIS**
Para cada KPI: nome, o que mede, por que é crítico, como calcular, e uma meta realista para 90 dias (baseada no que foi informado).

**2. ROTINA DE ACOMPANHAMENTO**
- O que revisar diariamente (2 minutos)
- O que revisar semanalmente (15 minutos)
- O que revisar mensalmente (1 hora)

**3. PRÓXIMOS PASSOS**
3 ações para começar a medir certo ainda esta semana.

Adapte tudo ao contexto do segmento "${seg}" e ao porte informado no pipeline.`,
  },

  tools: {
    intro: "Vamos criar um plano de implementação de CRM e ferramentas comerciais para a sua equipe.",
    solutionLabel: "Plano de Implementação de CRM",
    questions: [
      { id: "crm_atual", type: "text", text: "Qual CRM ou ferramenta você usa hoje para gestão comercial?", placeholder: "Ex: Pipedrive, HubSpot, Planilha Excel, nenhum..." },
      { id: "adocao_equipe", type: "select", text: "A equipe registra as interações de forma consistente no CRM?", options: ["Sim, mais de 80% das interações", "Parcialmente, só alguns registram", "Muito inconsistente", "Não usamos CRM"] },
      { id: "maior_perda", type: "select", text: "O que se perde com mais frequência no processo comercial?", options: ["Contatos e leads novos", "Histórico de conversas", "Oportunidades em aberto (follow-up)", "Dados e relatórios", "Tudo isso"] },
      { id: "resistencia", type: "text", text: "Qual é o maior obstáculo para a equipe adotar as ferramentas?", placeholder: "Ex: acham complicado, esquecem, não veem valor..." },
      { id: "sonho_tech", type: "text", text: "Se você pudesse resolver um problema de processo com tecnologia, qual seria?", placeholder: "Ex: automatizar follow-up, ter visibilidade do pipeline..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em operações comerciais e CRM para empresas do segmento "${seg}".
Com base nas respostas, crie um plano de implementação:

RESPOSTAS:
- CRM atual: ${a.crm_atual}
- Adoção da equipe: ${a.adocao_equipe}
- Maior perda no processo: ${a.maior_perda}
- Obstáculo de adoção: ${a.resistencia}
- Problema a resolver com tech: ${a.sonho_tech}

Crie:

**1. PLANO DE 30 DIAS**
- Semana 1: o que configurar/ajustar no CRM
- Semana 2: treinamento da equipe (o que ensinar, como)
- Semana 3: rotina de adoção (quem registra o quê e quando)
- Semana 4: revisão e ajuste (o que medir para saber se funcionou)

**2. TOP 3 FUNCIONALIDADES PARA USAR PRIMEIRO**
As 3 funções do CRM com maior impacto imediato para esse perfil.

**3. COMO SUPERAR A RESISTÊNCIA**
Estratégia específica para resolver o obstáculo "${a.resistencia}".`,
  },

  value: {
    intro: "Vamos construir uma proposta de valor poderosa que diferencia você da concorrência e convence o cliente certo.",
    solutionLabel: "Proposta de Valor + Pitch",
    questions: [
      { id: "problema_resolvido", type: "text", text: "Em uma frase, qual problema você resolve para o cliente?", placeholder: "Ex: ajudo restaurantes a reduzirem desperdício de alimentos..." },
      { id: "resultado_concreto", type: "text", text: "Qual resultado concreto e mensurável seu cliente tem após te contratar?", placeholder: "Ex: redução de 30% no custo, aumento de 20% em vendas..." },
      { id: "diferencial", type: "text", text: "Por que um cliente escolheria você e não a concorrência?", placeholder: "Ex: entrega mais rápida, atendimento personalizado, método exclusivo..." },
      { id: "descricao_simples", type: "text", text: "Como você descreveria seu serviço para alguém que nunca ouviu falar?", placeholder: "Explique como se fosse para um amigo..." },
      { id: "melhor_case", type: "text", text: "Qual resultado de cliente você mais se orgulha? Descreva brevemente.", placeholder: "Ex: cliente X aumentou faturamento em 40% em 3 meses..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em posicionamento e proposta de valor B2B no segmento "${seg}".
Com base nas respostas, crie os materiais de proposta de valor:

RESPOSTAS:
- Problema resolvido: ${a.problema_resolvido}
- Resultado concreto: ${a.resultado_concreto}
- Diferencial: ${a.diferencial}
- Como descreve o serviço: ${a.descricao_simples}
- Melhor case: ${a.melhor_case}

Crie:

**1. PITCH DE 30 SEGUNDOS (Elevator Pitch)**
Use a estrutura: "Para [cliente], que enfrenta [problema], nós entregamos [resultado]. Diferente de [concorrente], nós [diferencial único]."
Crie 2 versões: uma mais formal e uma mais casual/conversacional.

**2. HEADLINE PARA MARKETING**
Uma frase de impacto para site, LinkedIn ou apresentação comercial.

**3. COMO USAR O CASE**
Script de como apresentar o case "${a.melhor_case}" em uma reunião de vendas para criar credibilidade.

Seja específico, evite clichês e adapte ao segmento "${seg}".`,
  },

  retention: {
    intro: "Vamos identificar clientes em risco e criar um plano de retenção proativo para a sua base.",
    solutionLabel: "Plano de Retenção de Clientes",
    questions: [
      { id: "frequencia_contato", type: "select", text: "Com que frequência você entra em contato proativamente com clientes ativos?", options: ["Semanalmente", "Mensalmente", "A cada 2–3 meses", "Só quando eles chamam", "Raramente ou nunca"] },
      { id: "clientes_inativos", type: "select", text: "Você consegue identificar quais clientes não compram há mais de 90 dias?", options: ["Sim, tenho controle disso", "Mais ou menos, mas não é sistemático", "Não tenho controle disso"] },
      { id: "quantidade_inativos", type: "text", text: "Qual é sua estimativa de clientes inativos na base atual?", placeholder: "Ex: uns 20 clientes, cerca de 30% da base..." },
      { id: "motivo_saida", type: "select", text: "Quando um cliente para de comprar ou vai embora, você entende o motivo?", options: ["Sim, peço feedback sempre", "Às vezes consigo entender", "Raramente sei o motivo", "Nunca investigo"] },
      { id: "oferta_reativacao", type: "text", text: "Qual seria uma oferta irresistível para trazer um cliente inativo de volta?", placeholder: "Ex: desconto na reativação, bônus no próximo pedido, condição especial..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em retenção e Customer Success para empresas do segmento "${seg}".
Com base nas respostas, crie um plano de retenção prático:

RESPOSTAS:
- Frequência de contato proativo: ${a.frequencia_contato}
- Controle de inativos: ${a.clientes_inativos}
- Estimativa de inativos: ${a.quantidade_inativos}
- Investigação de motivo de saída: ${a.motivo_saida}
- Oferta de reativação: ${a.oferta_reativacao}

Crie:

**1. CRITÉRIOS DE ALERTA DE CHURN**
Defina 3 sinais de que um cliente está em risco (específicos para o segmento "${seg}").

**2. RÉGUA DE RELACIONAMENTO PROATIVO**
- Contato do 1º mês pós-venda (o que fazer e dizer)
- Contato do 3º mês (check-in de resultado)
- Contato do 6º mês (renovação/expansão)
- Contato de crise (quando identificar sinal de risco)

**3. CAMPANHA DE REATIVAÇÃO DE INATIVOS**
Script de mensagem para reativar os ${a.quantidade_inativos} clientes inativos usando a oferta "${a.oferta_reativacao}".`,
  },

  money: {
    intro: "Vamos identificar onde sua empresa está deixando receita na mesa e criar um plano para capturá-la.",
    solutionLabel: "Plano de Captura de Receita",
    questions: [
      { id: "upsell_ativo", type: "select", text: "Você oferece produtos ou serviços complementares para quem já é seu cliente?", options: ["Sim, tenho processo estruturado de upsell", "Às vezes, mas sem processo definido", "Raramente ofereço", "Não faço isso"] },
      { id: "produto_subvendido", type: "text", text: "Qual produto ou serviço seu você acha que está subvendendo para a base atual?", placeholder: "Ex: plano premium, serviço de manutenção, consultoria..." },
      { id: "clientes_potencial", type: "select", text: "Você tem clientes que poderiam comprar mais mas ainda não compram?", options: ["Sim, vários — sei quem são", "Sim, mas não sei identificar bem", "Talvez, nunca analisei", "Não acredito que sim"] },
      { id: "indicacoes", type: "select", text: "Os seus clientes satisfeitos te indicam para outros? Você pede indicação ativamente?", options: ["Sim, tenho programa de indicação", "Acontece espontaneamente mas não peço", "Raramente recebo indicações", "Nunca pedi indicação"] },
      { id: "desconto_arrependido", type: "text", text: "Quando foi a última vez que você deu desconto e depois achou que não precisava? O que aconteceu?", placeholder: "Ex: cliente fecharia sem o desconto, dei 15% desnecessariamente..." },
    ],
    solutionPrompt: (a, seg) => `Você é especialista em crescimento de receita e gestão comercial no segmento "${seg}".
Com base nas respostas, identifique e estruture as oportunidades de receita não capturada:

RESPOSTAS:
- Processo de upsell atual: ${a.upsell_ativo}
- Produto subvendido: ${a.produto_subvendido}
- Clientes com potencial de expansão: ${a.clientes_potencial}
- Situação de indicações: ${a.indicacoes}
- Desconto desnecessário: ${a.desconto_arrependido}

Crie:

**1. TOP 3 OPORTUNIDADES DE RECEITA IMEDIATA**
Para cada oportunidade: o que é, por que está sendo perdida, e um roteiro de abordagem específico.

**2. PLANO DE UPSELL PARA "${a.produto_subvendido}"**
- Quem abordar primeiro (perfil de cliente)
- O que dizer (script de 3 frases)
- Como precificar e apresentar

**3. PROGRAMA DE INDICAÇÕES EM 3 PASSOS**
Como criar um programa simples de referral para o segmento "${seg}" que comece a gerar indicações esta semana.

**4. POLÍTICA DE DESCONTO**
Baseado no caso "${a.desconto_arrependido}", defina: quando conceder desconto, o máximo %, e o que pedir em troca.`,
  },
};
