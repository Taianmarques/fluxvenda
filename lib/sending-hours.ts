// Horário (hora local — America/Sao_Paulo, ver instrumentation.ts) em que follow-up,
// prospecção e campanha podem disparar mensagens automáticas. Fora da janela, o cron pula o
// envio pra tentar de novo na próxima execução — não marca como enviado nem perde o candidato,
// só adia. Não se aplica ao funil do teste grátis (tem sua própria lógica de dia/hora) nem a
// lembretes de agendamento/mensagens agendadas por um humano.
export function dentroHorarioEnvio(inicio: string, fim: string, now: Date = new Date()): boolean {
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return hora >= inicio && hora <= fim;
}
