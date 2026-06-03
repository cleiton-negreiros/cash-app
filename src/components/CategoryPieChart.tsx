import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { Transaction } from '../types'

interface CategoryPieChartProps {
  transactions: Transaction[]
  type: 'expense' | 'income' | 'investment'
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
  '#14b8a6', '#84cc16',
]

export default function CategoryPieChart({ transactions, type }: CategoryPieChartProps) {
  const filtered = transactions.filter((t) => t.type === type)

  const byCategory = filtered.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.value
    return acc
  }, {})

  const data = Object.entries(byCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-zinc-600">
        Sem dados no período
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke="transparent"
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '12px',
            fontSize: '13px',
          }}
          formatter={(value) => [
            Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            '',
          ]}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
