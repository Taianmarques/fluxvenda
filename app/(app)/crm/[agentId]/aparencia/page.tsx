import { SunMoon } from "lucide-react";
import { CrmPageGate } from "@/app/(app)/crm/CrmPageGate";
import { AparenciaClient } from "./AparenciaClient";

export default function AparenciaPage() {
  return (
    <CrmPageGate pageKey="aparencia">
      <div className="h-full overflow-y-auto bg-gray-950 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div>
            <p className="text-gray-400 text-sm">Configurações</p>
            <h1 className="text-3xl font-bold mt-1 flex items-center gap-2"><SunMoon size={28} className="text-blue-400" /> Aparência</h1>
            <p className="text-gray-400 mt-1">Escolha o tema usado em todo o CRM.</p>
          </div>

          <AparenciaClient />
        </div>
      </div>
    </CrmPageGate>
  );
}
