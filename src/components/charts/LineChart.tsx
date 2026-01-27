import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface LineChartProps {
  data: Array<Record<string, string | number>>
  dataKey: string
  xKey: string
  name?: string
  color?: string
  yAxisFormatter?: (value: string | number) => string
}

export function LineChart({ data, dataKey, xKey, name, color = '#8884d8', yAxisFormatter }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={yAxisFormatter} />
        <Tooltip formatter={(value: any) => yAxisFormatter ? yAxisFormatter(value) : value} />
        <Legend />
        <Line type="monotone" dataKey={dataKey} stroke={color} name={name || dataKey} />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
