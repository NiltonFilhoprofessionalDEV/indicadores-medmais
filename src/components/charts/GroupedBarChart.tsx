import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'

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
      <div className="flex items-center justify-center h-[400px] text-gray-500">
        Nenhum dado disponível
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsBarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="material" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="exigido" fill="#94a3b8" name="Meta Exigida" radius={[0, 0, 0, 0]} />
        <Bar dataKey="atual" name="Estoque Atual" radius={[0, 0, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.corAtual || '#3b82f6'} />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
