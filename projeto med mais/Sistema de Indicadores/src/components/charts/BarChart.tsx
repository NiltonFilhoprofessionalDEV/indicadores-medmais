import type { ReactNode } from 'react'
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts'

const CHART_GRID_STROKE = '#e5e7eb'
const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.98)',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '10px 14px',
}

interface BarChartProps {
  data: Array<Record<string, string | number>>
  dataKey: string
  xKey: string
  name?: string
  color?: string
  yAxisFormatter?: (value: string | number) => string
  layout?: 'horizontal' | 'vertical'
  yAxisWidth?: number
  referenceLine?: {
    value: number
    label?: string
    stroke?: string
    strokeDasharray?: string
  }
  showLabel?: boolean
}

export function BarChart({ data, dataKey, xKey, name, color = '#fc4d00', yAxisFormatter, layout = 'vertical', yAxisWidth, referenceLine, showLabel = false }: BarChartProps) {
  const isHorizontal = layout === 'horizontal'

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] rounded-xl bg-gray-50/50 text-gray-500 text-sm">
        Nenhum dado disponível
      </div>
    )
  }

  const yWidth = yAxisWidth || (isHorizontal ? 200 : undefined)
  const leftMargin = isHorizontal ? (yWidth ? yWidth + 10 : 210) : 20

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart
        data={data}
        layout={isHorizontal ? 'vertical' : undefined}
        margin={isHorizontal ? { top: 10, right: 20, left: leftMargin, bottom: 10 } : { top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <defs>
          <linearGradient id={`barGradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={1} />
            <stop offset="100%" stopColor={color} stopOpacity={0.75} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
        {isHorizontal ? (
          <>
            <XAxis type="number" tickFormatter={yAxisFormatter} domain={[0, 'dataMax']} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis type="category" dataKey={xKey} width={yWidth} tick={{ fontSize: 11, fill: '#475569' }} interval={0} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tick={{ fill: '#64748b', fontSize: 12 }} />
            <YAxis tickFormatter={yAxisFormatter} tick={{ fill: '#64748b', fontSize: 12 }} />
          </>
        )}
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: unknown, n: string): [ReactNode, string] => {
            if (isHorizontal && yAxisFormatter) return [yAxisFormatter(value as string | number), n]
            return [String(value), n]
          }}
          labelFormatter={(label) => label}
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
        <Bar dataKey={dataKey} fill={`url(#barGradient-${dataKey})`} name={name || dataKey} radius={[6, 6, 0, 0]} maxBarSize={48}>
          {showLabel && <LabelList dataKey={dataKey} position="top" fill="#475569" fontSize={11} />}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
