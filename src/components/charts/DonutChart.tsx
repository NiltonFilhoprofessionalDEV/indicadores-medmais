import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

interface DonutChartProps {
  data: Array<{ name: string; value: number; porcentagem?: number }>
  colors?: string[]
  showCenterLabel?: boolean
  centerLabel?: string
}

const DEFAULT_COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6']

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

export function DonutChart({ data, colors = DEFAULT_COLORS, showCenterLabel = true, centerLabel }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const aprovados = data.find((item) => item.name.toLowerCase().includes('aprovado'))?.value ?? 0
  const porcentagemAprovacao = total > 0 ? ((aprovados / total) * 100).toFixed(1) : '0.0'
  const hasAnyValue = total > 0

  const renderLabel = (entry: { value: number }) => {
    const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0.0'
    return `${pct}%`
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        {hasAnyValue ? (
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            label={renderLabel}
            labelLine={{ stroke: '#94a3b8' }}
            outerRadius={105}
            innerRadius={68}
            stroke="none"
            paddingAngle={1}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="white" strokeWidth={2} />
            ))}
          </Pie>
        ) : (
          <Pie
            data={[{ name: 'Sem dados', value: 1 }]}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={105}
            innerRadius={68}
            stroke="none"
            dataKey="value"
            nameKey="name"
          >
            <Cell fill="#f1f5f9" stroke="white" strokeWidth={2} />
          </Pie>
        )}
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {showCenterLabel && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '26px', fontWeight: 700, fill: 'var(--foreground)', letterSpacing: '-0.02em' }}
          >
            {centerLabel ?? `${porcentagemAprovacao}%`}
          </text>
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
