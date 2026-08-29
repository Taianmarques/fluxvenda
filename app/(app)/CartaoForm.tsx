"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";

export type CartaoFormData = {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
  postalCode: string;
  addressNumber: string;
};

// Formulário de cartão nativo — número/validade/CVV nunca são gravados no banco, só
// repassados ao Asaas na hora da cobrança (ver app/api/*/checkout). CEP e número do
// endereço são exigidos pelo Asaas pra análise antifraude de cobrança com cartão.
export function CartaoForm({ onSubmit, submitting, error, dark }: {
  onSubmit: (data: CartaoFormData) => void;
  submitting: boolean;
  error: string | null;
  dark?: boolean;
}) {
  const [data, setData] = useState<CartaoFormData>({
    holderName: "", number: "", expiryMonth: "", expiryYear: "", ccv: "", postalCode: "", addressNumber: "",
  });

  const inputCls = `w-full rounded-lg px-3 py-2 text-sm ${
    dark ? "bg-gray-950 border border-gray-800 placeholder:text-gray-600" : "bg-white border border-gray-200 text-slate-900 placeholder:text-gray-400"
  }`;
  const labelCls = `text-xs block mb-1 ${dark ? "text-gray-400" : "text-gray-500"}`;

  function set<K extends keyof CartaoFormData>(key: K, value: string) {
    setData(d => ({ ...d, [key]: value }));
  }

  const valido =
    data.holderName.trim().length > 2 &&
    data.number.replace(/\D/g, "").length >= 13 &&
    data.expiryMonth.length === 2 &&
    data.expiryYear.length === 2 &&
    data.ccv.length >= 3 &&
    data.postalCode.replace(/\D/g, "").length === 8 &&
    data.addressNumber.trim().length > 0;

  return (
    <div className="space-y-3">
      <div>
        <label className={labelCls}>Nome no cartão</label>
        <input value={data.holderName} onChange={e => set("holderName", e.target.value)} placeholder="Como está no cartão" className={inputCls} />
      </div>
      <div>
        <label className={labelCls}>Número do cartão</label>
        <input
          value={data.number}
          onChange={e => set("number", e.target.value.replace(/\D/g, "").slice(0, 19))}
          placeholder="0000 0000 0000 0000"
          inputMode="numeric"
          className={inputCls}
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelCls}>Mês</label>
          <input value={data.expiryMonth} onChange={e => set("expiryMonth", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="MM" inputMode="numeric" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Ano</label>
          <input value={data.expiryYear} onChange={e => set("expiryYear", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="AA" inputMode="numeric" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>CVV</label>
          <input value={data.ccv} onChange={e => set("ccv", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="123" inputMode="numeric" className={inputCls} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelCls}>CEP</label>
          <input value={data.postalCode} onChange={e => set("postalCode", e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder="00000000" inputMode="numeric" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Número do endereço</label>
          <input value={data.addressNumber} onChange={e => set("addressNumber", e.target.value)} placeholder="123" className={inputCls} />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={() => onSubmit(data)}
        disabled={!valido || submitting}
        className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium"
      >
        <CreditCard size={14} /> {submitting ? "Processando..." : "Pagar com cartão"}
      </button>
    </div>
  );
}
