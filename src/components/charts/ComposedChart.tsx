import type { ReactNode } from 'react'
import { ComposedChart as RechartsComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const CHART_GRID_STROKE = '#e5e7eb'
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

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
  barColor = '#fc4d00',
  lineColor = '#22c55e',
  barYAxisFormatter,
  lineYAxisFormatter,
}: ComposedChartProps) {
  const barGradientId = `composedBar-${barDataKey}`
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsComposedChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id={barGradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={barColor} stopOpacity={1} />
            <stop offset="100%" stopColor={barColor} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis yAxisId="left" tickFormatter={barYAxisFormatter} tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={lineYAxisFormatter} tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: unknown, name: string): [ReactNode, string] => {
            if (name === lineName || name === lineDataKey) {
              if (lineYAxisFormatter) return [lineYAxisFormatter(value as string | number), name]
              const hours = Math.floor(Number(value) / 60)
              const minutes = Number(value) % 60
              return [`${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`, name]
            }
            return [String(value), name]
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="left" dataKey={barDataKey} fill={`url(#${barGradientId})`} name={barName || barDataKey} radius={[6, 6, 0, 0]} maxBarSize={40} />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey={lineDataKey}
          stroke={lineColor}
          strokeWidth={2.5}
          dot={{ fill: lineColor, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
          name={lineName || lineDataKey}
        />
      </RechartsComposedChart>
    </ResponsiveContainer>
  )
}
