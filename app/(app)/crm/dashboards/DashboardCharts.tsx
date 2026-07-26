"use client";

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";

export function WeeklyBarChart({ data, color = "#3b82f6" }: { data: { semana: string; total: number }[]; color?: string }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="semana" stroke="#6b7280" fontSize={12} />
        <YAxis stroke="#6b7280" fontSize={12} allowDecimals={false} />
        <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }} />
        <Bar dataKey="total" fill={color} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Barras diárias empilhadas ganho/perda — usado no dashboard de vendas aprofundado
export function DailyWonLostChart({ data, tickInterval = 0 }: { data: { dia: string; ganho: number; perdido: number }[]; tickInterval?: number }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
        <XAxis dataKey="dia" stroke="#6b7280" fontSize={11} interval={tickInterval} />
        <YAxis stroke="#6b7280" fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
          formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="ganho" name="Ganho" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="perdido" name="Perdido" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ec4899", "#06b6d4", "#f97316", "#6b7280"];

export function AttendantDonutChart({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
        </Pie>
        <Tooltip
          contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
          formatter={(v: number) => `${v} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
