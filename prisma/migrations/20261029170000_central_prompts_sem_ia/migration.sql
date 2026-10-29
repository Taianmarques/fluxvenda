-- Central passa a preparar prompts para o ChatGPT/Claude do usuário, sem executar IA na plataforma.

-- Histórico: o que já existe são respostas de IA da versão anterior — ficam guardadas como
-- "resposta"; daqui pra frente cada registro é um prompt preparado ("prompt", o padrão)
ALTER TABLE "CentralGeracao" ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'prompt';
UPDATE "CentralGeracao" SET "tipo" = 'resposta';

-- Perfil da empresa: objetivos comerciais
ALTER TABLE "PerfilEmpresa" ADD COLUMN "objetivos" TEXT NOT NULL DEFAULT '';

-- Regras das 100 ferramentas de volta ao texto original do material: no ChatGPT/Claude existe
-- conversa, então vale "faça no máximo três perguntas objetivas antes de entregar"
UPDATE "CentralFerramenta"
SET "instrucoes" = replace(
  "instrucoes",
  'Se alguma informação essencial estiver ausente, não pergunte de volta: assuma hipóteses razoáveis, deixe-as explícitas no início da resposta e diga como validá-las.',
  'Se alguma informação essencial estiver ausente, faça no máximo três perguntas objetivas antes de entregar.'
);
