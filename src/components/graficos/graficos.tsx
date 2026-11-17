"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { coloresGraficos as c } from "@/styles/tokens";
import { cop } from "@/lib/format";

const millones = (v: number) => (Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}k`);
const eje = { fontSize: 14, fill: c.eje };

export function GraficoVentasGastos({ datos }: { datos: { dia: string; ventas: number; gastos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.cuadricula} />
        <XAxis dataKey="dia" tick={eje} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={millones} tick={eje} tickLine={false} axisLine={false} width={48} />
        <Tooltip formatter={(v) => cop(Number(v))} cursor={{ fill: c.cursor }} />
        <Legend wrapperStyle={{ fontSize: 15 }} />
        <Bar dataKey="ventas" name="Ventas" fill={c.ventas} radius={[4, 4, 0, 0]} />
        <Bar dataKey="gastos" name="Gastos" fill={c.gastos} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GraficoCategorias({ datos }: { datos: { nombre: string; gramos: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={c.cuadricula} />
        <XAxis type="number" tick={eje} tickLine={false} axisLine={false} unit=" g" />
        <YAxis type="category" dataKey="nombre" tick={{ ...eje, fill: c.ejeFuerte }} tickLine={false} axisLine={false} width={140} />
        <Tooltip formatter={(v) => `${Number(v).toLocaleString("es-CO", { minimumFractionDigits: 2 })} g`} cursor={{ fill: c.cursor }} />
        <Bar dataKey="gramos" name="Gramos vendidos" fill={c.categorias} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
