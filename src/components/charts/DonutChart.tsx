import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface DonutChartProps {
  data: Array<{ name: string; value: number; porcentagem?: number }>
  colors?: string[]
  showCenterLabel?: boolean
  centerLabel?: string
}

const DEFAULT_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

export function DonutChart({ data, colors = DEFAULT_COLORS, showCenterLabel = true, centerLabel }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const aprovados = data.find((item) => item.name.toLowerCase().includes('aprovado'))?.value || 0
  const porcentagemAprovacao = total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0.0'

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={100}
          innerRadius={60}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
        {showCenterLabel && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '24px', fontWeight: 'bold', fill: 'currentColor' }}
          >
            {centerLabel || `${porcentagemAprovacao}%`}
          </text>
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
