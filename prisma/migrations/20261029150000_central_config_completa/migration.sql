-- Configuração completa de cada ferramenta da Central: instruções de uso, formato esperado da
-- resposta, ferramentas relacionadas, acesso e limite diário por usuário.
ALTER TABLE "CentralFerramenta" ADD COLUMN "comoUsar" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CentralFerramenta" ADD COLUMN "formatoResposta" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CentralFerramenta" ADD COLUMN "relacionadas" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CentralFerramenta" ADD COLUMN "acesso" TEXT NOT NULL DEFAULT 'todos';
ALTER TABLE "CentralFerramenta" ADD COLUMN "limiteDiario" INTEGER;

-- Formato esperado = o bloco "ENTREGUE" do prompt de cada ferramenta (material oficial)
UPDATE "CentralFerramenta"
SET "formatoResposta" = trim(substring("prompt" from 'ENTREGUE:\s*(.*)$'))
WHERE "formatoResposta" = '' AND "prompt" LIKE '%ENTREGUE:%';

-- Instruções de uso por módulo (o admin ajusta ferramenta por ferramenta depois)
UPDATE "CentralFerramenta" SET "comoUsar" = CASE "moduloId"
  WHEN 'conheca-seu-cliente' THEN 'Preencha com o que você realmente sabe sobre seus clientes. Se tiver números (vendas por mês, perfil de quem mais compra, de onde vêm os clientes), coloque em "Dados que você já tem" — a análise fica muito mais precisa.'
  WHEN 'criacao-de-ofertas' THEN 'Informe o preço real e até onde você pode ir no desconto. Assim as ofertas saem atrativas sem comer a sua margem.'
  WHEN 'anuncios-e-aquisicao' THEN 'Descreva a oferta exatamente como vai anunciar (produto + condição). Provas reais, como fotos de antes e depois e avaliações, deixam os anúncios mais convincentes.'
  WHEN 'conteudo-e-whatsapp' THEN 'Diga em qual canal vai publicar e o tom que você usa com seus clientes. Os textos saem prontos para postar ou enviar.'
  WHEN 'atendimento-e-qualificacao' THEN 'Liste as perguntas que os clientes mais fazem e o horário de atendimento. As mensagens saem prontas para virar respostas rápidas no WhatsApp.'
  WHEN 'negociacao-e-objecoes' THEN 'Cole a fala do cliente do jeito que ele disse e informe suas regras de desconto e pagamento. Quanto mais fiel, mais certeira a resposta.'
  WHEN 'follow-up-e-fechamento' THEN 'Conte como foi a última conversa e o que foi proposto. As mensagens retomam de onde parou, sem soar insistente.'
  WHEN 'pos-venda-e-recompra' THEN 'Informe de quanto em quanto tempo o cliente costuma voltar a comprar. Os contatos saem no momento certo do ciclo.'
  WHEN 'gestao-comercial' THEN 'Coloque os números que você tiver (leads, vendas, receita, tempo para fechar). Sem números, a IA trabalha com hipóteses e mostra como medir.'
  WHEN 'planejamento-comercial' THEN 'Seja realista nos números e nos desafios. O plano sai do tamanho da sua equipe e do seu orçamento.'
  ELSE "comoUsar" END
WHERE "comoUsar" = '';
