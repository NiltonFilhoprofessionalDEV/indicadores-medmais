import { ComposedChart as RechartsComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ComposedChartProps {
  data: Array<Record<string, string | number>>
  barDataKey: string
  lineDataKey: string
  xKey: string
  barName?: string
  lineName?: string
  barColor?: string
  lineColor?: string
  barYAxisFormatter?: (value: string | number) => string
  lineYAxisFormatter?: (value: string | number) => string
}

export function ComposedChart({
  data,
  barDataKey,
  lineDataKey,
  xKey,
  barName,
  lineName,
  barColor = '#8884d8',
  lineColor = '#82ca9d',
  barYAxisFormatter,
  lineYAxisFormatter,
}: ComposedChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis yAxisId="left" tickFormatter={barYAxisFormatter} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={lineYAxisFormatter} />
        <Tooltip />
        <Legend />
        <Bar yAxisId="left" dataKey={barDataKey} fill={barColor} name={barName || barDataKey} />
        <Line yAxisId="right" type="monotone" dataKey={lineDataKey} stroke={lineColor} name={lineName || lineDataKey} />
      </RechartsComposedChart>
    </ResponsiveContainer>
  )
}
