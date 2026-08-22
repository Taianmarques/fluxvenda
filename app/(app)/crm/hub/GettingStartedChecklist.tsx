"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2, Circle } from "lucide-react";
import type { ChecklistStep, ChecklistStepKey } from "@/lib/crm-onboarding";

export function GettingStartedChecklist({ steps, name }: { steps: ChecklistStep[]; name: string }) {
  const firstOpenKey = steps.find(s => !s.done)?.key ?? null;
  const [openKey, setOpenKey] = useState<ChecklistStepKey | null>(firstOpenKey);

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;
  const [dismissed, setDismissed] = useState(false);
  if (allDone && dismissed) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-6 space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg md:text-xl font-bold">
            {allDone ? `Tudo pronto, ${name}!` : `Seu CRM está pronto, ${name}`}
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {allDone
              ? "Você concluiu os primeiros passos — a operação já está no ar."
              : "Use estes passos pra transformar a conta nova em uma operação pronta pra atender e vender."}
          </p>
        </div>
        {allDone && (
          <button onClick={() => setDismissed(true)} className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex-shrink-0">
            Dispensar
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs text-gray-500">{doneCount} de {steps.length} concluídos</p>
        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
            <div key={step.key} className="border border-gray-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenKey(open ? null : step.key)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
              >
                {step.done
                  ? <CheckCircle2 size={20} className="text-green-500 flex-shrink-0" />
                  : <Circle size={20} className="text-gray-600 flex-shrink-0" />}
                <span className={`text-sm font-medium flex-1 ${step.done ? "text-gray-400 line-through" : "text-white"}`}>
                  {step.label}
                </span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="px-4 pb-4 pl-11 space-y-3">
                  <p className="text-sm text-gray-400">{step.description}</p>
                  <Link
                    href={step.href}
                    className="inline-block bg-blue-600 hover:bg-blue-500 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                  >
                    {step.cta}
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
