import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

interface PieChartProps {
  data: Array<{ name: string; value: number; porcentagem?: number }>
  colors?: string[]
}

const DEFAULT_COLORS = ['#fc4d00', '#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6']

export function PieChart({ data, colors = DEFAULT_COLORS }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={{ stroke: '#94a3b8' }}
          label={({ name, porcentagem }) => `${name}: ${porcentagem?.toFixed(1) ?? 0}%`}
          outerRadius={100}
          stroke="none"
          paddingAngle={1}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="white" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  )
}
