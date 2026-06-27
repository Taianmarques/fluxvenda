"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";

export function VendasChart({ data }: { data: { mes: string; total: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="mes" stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
          formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
        <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
