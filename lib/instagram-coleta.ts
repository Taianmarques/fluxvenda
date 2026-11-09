// Coleta de WhatsApp no Instagram: conseguir o número é o único objetivo da conversa, e o
// atendimento (preço, detalhes) acontece no WhatsApp.

type ConfigColeta = { igColetaWhatsappEnabled: boolean; igColetaWhatsappInstrucoes: string };

const PEDIDO_PADRAO = "Me passa seu WhatsApp com DDD que a equipe te chama lá agora com todas as informações!";

// O campo do gestor pode ser uma frase pronta ou uma orientação ("peça depois de cumprimentar")
function fraseProntaDoGestor(instrucoes: string): string | null {
  const t = instrucoes.trim();
  if (!/whats|zap/i.test(t) || /^(pe[çc]a|pedir|solicit|pergunt|diga|fale|envie|sempre|quando|s[oó]\b)/i.test(t)) return null;
  return t;
}

// Vai por último no prompt para ter prioridade sobre o resto
export function instrucaoColetaWhatsapp(config: ConfigColeta, jaEnviouNumero: boolean): string {
  if (!config.igColetaWhatsappEnabled) return "";
  if (jaEnviouNumero) {
    return `\n\nO CLIENTE JÁ ENVIOU O WHATSAPP (tem prioridade sobre todas as instruções acima): confirme em 1 frase que a equipe vai chamar no WhatsApp em instantes. Não faça perguntas, não passe informações e não peça o número de novo. Nunca diga que não pode salvar, armazenar ou guardar números.`;
  }
  const instrucoes = config.igColetaWhatsappInstrucoes.trim();
  const frase = fraseProntaDoGestor(instrucoes);
  const formaDePedir = frase
    ? `\n- Responda usando esta frase, quase igual: "${frase}"`
    : instrucoes ? `\n- Forma de pedir, segundo a empresa: ${instrucoes}` : "";
  return `\n\nOBJETIVO ÚNICO DESTA CONVERSA (tem prioridade sobre todas as instruções acima): conseguir o número de WhatsApp do cliente para a equipe continuar o atendimento por lá.
- Toda resposta precisa pedir o WhatsApp, em no máximo 2 frases, de forma animada e direta.
- Nunca diga que não consegue, não tem, não sabe ou não pode informar algo, e nunca peça desculpas. Se perguntarem preço ou qualquer detalhe, responda como quem vai passar tudo no WhatsApp.
- Não passe preços, condições, financiamento, características ou disponibilidade, não sugira visita, não envie links e não faça outras perguntas.${formaDePedir}
- Se o cliente recusar expressamente, não pressione: diga que, quando quiser, é só mandar o número.`;
}

export function respostaDeColetaValida(resposta: string): boolean {
  const pedeContato = /whats|zap|\bn[úu]mero\b/i.test(resposta);
  const negaInformacao = /n[ãa]o\s+(consigo|tenho|posso|sei|disponho|temos)|desculp|infelizmente|sem\s+informa/i.test(resposta);
  const passaPreco = /R\$\s?\d/i.test(resposta);
  return pedeContato && !negaInformacao && !passaPreco;
}

// Trava final: o modelo às vezes ignora o prompt, então resposta fora do objetivo é trocada pelo pedido
export function ajustarRespostaColeta(config: ConfigColeta, jaEnviouNumero: boolean, resposta: string): string {
  if (!config.igColetaWhatsappEnabled || jaEnviouNumero || respostaDeColetaValida(resposta)) return resposta;
  return fraseProntaDoGestor(config.igColetaWhatsappInstrucoes) ?? PEDIDO_PADRAO;
}
