-- AlterTable: quem a IA atende + transferência automática ao pedir foto + vendedor fixo/rodízio pra leads da IA
ALTER TABLE "AgentConfig" ADD COLUMN     "iaIgnoraAtribuidos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iaNiveisCarteiraExcluidos" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "transferirAoPedirFoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "iaLeadAttendantId" TEXT;
