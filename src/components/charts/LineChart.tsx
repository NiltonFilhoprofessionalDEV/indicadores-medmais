import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface LineChartProps {
  data: Array<Record<string, string | number>>
  dataKey: string
  xKey: string
  name?: string
  color?: string
  yAxisFormatter?: (value: string | number) => string
  referenceLine?: {
    value: number
    label?: string
    stroke?: string
    strokeDasharray?: string
  }
}

export function LineChart({ data, dataKey, xKey, name, color = '#8884d8', yAxisFormatter, referenceLine }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis tickFormatter={yAxisFormatter} />
        <Tooltip formatter={(value: any) => yAxisFormatter ? yAxisFormatter(value) : value} />
        <Legend />
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.value}
            label={referenceLine.label || ''}
            stroke={referenceLine.stroke || '#ef4444'}
            strokeDasharray={referenceLine.strokeDasharray || '5 5'}
          />
        )}
        <Line type="monotone" dataKey={dataKey} stroke={color} name={name || dataKey} />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
