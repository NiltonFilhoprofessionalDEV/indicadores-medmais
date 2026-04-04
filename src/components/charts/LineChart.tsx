import type { ReactNode } from 'react'
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

const CHART_GRID_STROKE = '#e5e7eb'
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

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

export function LineChart({ data, dataKey, xKey, name, color = '#fc4d00', yAxisFormatter, referenceLine }: LineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 12 }} />
        <YAxis tickFormatter={yAxisFormatter} tick={{ fill: '#64748b', fontSize: 12 }} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: unknown): ReactNode =>
            yAxisFormatter ? yAxisFormatter(value as string | number) : String(value)
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.value}
            label={referenceLine.label || ''}
            stroke={referenceLine.stroke || '#ef4444'}
            strokeDasharray={referenceLine.strokeDasharray || '5 5'}
          />
        )}
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          dot={{ fill: color, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
          name={name || dataKey}
        />
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}
