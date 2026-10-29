-- "Copiar prompt" liberado em todas as ferramentas da Central: o cliente pode levar o prompt
-- (já preenchido com os dados da empresa) para o próprio ChatGPT ou Claude. O admin desliga
-- ferramenta por ferramenta em /admin/central.
UPDATE "CentralFerramenta" SET "permitirCopiarPrompt" = true;
