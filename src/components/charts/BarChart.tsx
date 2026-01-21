import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface BarChartProps {
  data: Array<Record<string, string | number>>
  dataKey: string
  xKey: string
  name?: string
  color?: string
  yAxisFormatter?: (value: string | number) => string
}

export function BarChart({ data, dataKey, xKey, name, color = '#8884d8', yAxisFormatter }: BarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={yAxisFormatter} />
        <Tooltip formatter={(value: any) => yAxisFormatter ? yAxisFormatter(value) : value} />
        <Legend />
        <Bar dataKey={dataKey} fill={color} name={name || dataKey} />
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
