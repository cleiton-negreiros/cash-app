import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { Transaction } from '../types'
import { MONTHS } from '../types'

interface MonthlyBarChartProps {
  transactions: Transaction[]
  year: number
}

export default function MonthlyBarChart({ transactions, year }: MonthlyBarChartProps) {
  const monthlyData = Array.from({ length: 12 }, (_, month) => {
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date + 'T12:00:00')
      return d.getMonth() === month && d.getFullYear() === year
    })

    return {
      name: MONTHS[month].slice(0, 3),
      Receitas: monthTxs.filter((t) => t.type === 'income').reduce((a, b) => a + b.value, 0),
      Despesas: monthTxs.filter((t) => t.type === 'expense').reduce((a, b) => a + b.value, 0),
      Investimentos: monthTxs.filter((t) => t.type === 'investment').reduce((a, b) => a + b.value, 0),
    }
  })

  if (monthlyData.every((d) => d.Receitas === 0 && d.Despesas === 0 && d.Investimentos === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-600">
        Sem dados anuais
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={monthlyData} barGap={2} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '12px',
            fontSize: '13px',
          }}
          formatter={(value) => [
            Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          ]}
        />
        <Bar dataKey="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Investimentos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
