"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";
import type { ChecklistStep, ChecklistStepKey } from "@/lib/crm-onboarding";
import { PlanosModal } from "./PlanosModal";

// dismissHref: se informado, "Dispensar" navega pra lá em vez de só esconder o card no
// lugar — usado na página de boas-vindas standalone, que ficaria em branco sem isso.
export function GettingStartedChecklist({ steps, name, dismissHref }: { steps: ChecklistStep[]; name: string; dismissHref?: string }) {
  const router = useRouter();
  const firstOpenKey = steps.find(s => !s.done)?.key ?? null;
  const [openKey, setOpenKey] = useState<ChecklistStepKey | null>(firstOpenKey);

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;
  const [dismissed, setDismissed] = useState(false);
  const [planosAberto, setPlanosAberto] = useState(false);
  if (allDone && dismissed) return null;

  function handleDismiss() {
    if (dismissHref) router.push(dismissHref);
    else setDismissed(true);
  }

  return (
    <div className="bg-white border border-gray-200 shadow-sm rounded-2xl p-5 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900">
            {allDone ? `Tudo pronto, ${name}!` : `Seu CRM está pronto, ${name}`}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {allDone
              ? "Você concluiu os primeiros passos — a operação já está no ar."
              : "Use estes passos pra transformar a conta nova em uma operação pronta pra atender e vender."}
          </p>
        </div>
        {allDone && (
          <button onClick={handleDismiss} className="text-xs text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0">
            Dispensar
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-400">{doneCount} de {steps.length} concluídos</p>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {steps.map(step => {
          const open = openKey === step.key;
          return (
            <div key={step.key} className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenKey(open ? null : step.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
              >
                {step.done
                  ? <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                  : <Circle size={20} className="text-gray-300 flex-shrink-0" />}
                <span className={`text-sm font-medium flex-1 ${step.done ? "text-gray-400 line-through" : "text-slate-900"}`}>
                  {step.label}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 pl-11 space-y-3">
                  <p className="text-sm text-gray-500">{step.description}</p>
                  {step.key === "plano" ? (
                    <button
                      onClick={() => setPlanosAberto(true)}
                      className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {step.cta}
                    </button>
                  ) : (
                    <Link
                      href={step.href}
                      className="inline-block bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                    >
                      {step.cta}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {planosAberto && <PlanosModal onClose={() => setPlanosAberto(false)} />}
    </div>
  );
}
