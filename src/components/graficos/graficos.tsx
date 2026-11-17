"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const cop = (v: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(v);
const millones = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`);

export function GraficoVentasGastos({ datos }: { datos: { dia: string; ventas: number; gastos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
        <XAxis dataKey="dia" tick={{ fontSize: 14, fill: "#78716c" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={millones} tick={{ fontSize: 14, fill: "#78716c" }} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(v) => cop(Number(v))} cursor={{ fill: "#f5f5f4" }} />
        <Legend wrapperStyle={{ fontSize: 15 }} />
        <Bar dataKey="ventas" name="Ventas" fill="#b98a30" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastos" name="Gastos" fill="#a8a29e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoCategorias({ datos }: { datos: { nombre: string; gramos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e7e5e4" />
        <XAxis type="number" tick={{ fontSize: 14, fill: "#78716c" }} tickLine={false} axisLine={false} unit=" g" />
        <YAxis type="category" dataKey="nombre" tick={{ fontSize: 14, fill: "#57534e" }} tickLine={false} axisLine={false} width={140} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })} g`} cursor={{ fill: "#f5f5f4" }} />
        <Bar dataKey="gramos" name="Gramos vendidos" fill="#9a6c27" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
