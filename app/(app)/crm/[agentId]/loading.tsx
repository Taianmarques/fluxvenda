// Feedback instantâneo ao navegar entre as seções do CRM — sem isso o Next segura a
// tela anterior até o servidor terminar todas as queries da próxima página.
export default function CrmSectionLoading() {
  return (
    <div className="h-full bg-gray-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-gray-700 border-t-blue-500 animate-spin" />
        <p className="text-xs text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}
