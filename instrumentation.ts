export function register() {
  // Garante que toda lógica de data/hora (agendamentos, follow-up, etc.) opere no
  // fuso de Brasília, independente do fuso padrão do host onde o servidor rodar.
  process.env.TZ = "America/Sao_Paulo";
}
