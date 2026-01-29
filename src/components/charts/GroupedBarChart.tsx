import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

const CHART_GRID_STROKE = '#e5e7eb'
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

interface GroupedBarChartProps {
  data: Array<{
    material: string
    exigido: number
    atual: number
    corAtual?: string
  }>
}

export function GroupedBarChart({ data }: GroupedBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] rounded-xl bg-gray-50/50 text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
        <XAxis dataKey="material" tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="exigido" fill="#94a3b8" name="Meta Exigida" radius={[6, 6, 0, 0]} maxBarSize={36} />
        <Bar dataKey="atual" name="Estoque Atual" radius={[6, 6, 0, 0]} maxBarSize={36}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.corAtual ?? '#fc4d00'} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
