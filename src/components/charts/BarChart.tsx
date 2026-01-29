import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, LabelList } from 'recharts'

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

export function BarChart({ data, dataKey, xKey, name, color = '#8884d8', yAxisFormatter, layout = 'vertical', yAxisWidth, referenceLine, showLabel = false }: BarChartProps) {
  const isHorizontal = layout === 'horizontal'
  
  // Validar dados
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        Nenhum dado disponível
      </div>
    )
  }
  
  const yWidth = yAxisWidth || (isHorizontal ? 200 : undefined)
  
  // Para gráficos horizontais, ajustar margem esquerda baseada na largura do eixo Y
  const leftMargin = isHorizontal ? (yWidth ? yWidth + 10 : 210) : 20
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsBarChart 
        data={data} 
        layout={isHorizontal ? 'vertical' : undefined}
        margin={isHorizontal ? { top: 10, right: 20, left: leftMargin, bottom: 10 } : { top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        {isHorizontal ? (
          <>
            <XAxis 
              type="number" 
              tickFormatter={yAxisFormatter}
              domain={[0, 'dataMax']}
            />
            <YAxis 
              type="category" 
              dataKey={xKey} 
              width={yWidth}
              tick={{ fontSize: 10 }}
              interval={0}
              angle={0}
              textAnchor="end"
            />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} />
            <YAxis tickFormatter={yAxisFormatter} />
          </>
        )}
        <Tooltip 
          formatter={(value: any, name: string) => {
            if (isHorizontal && yAxisFormatter) {
              return [yAxisFormatter(value), name]
            }
            return [value, name]
          }}
          labelFormatter={(label) => {
            if (isHorizontal) {
              // No layout horizontal, o label vem do eixo Y (tipo)
              return label
            }
            return label
          }}
        />
        <Legend />
        {referenceLine && (
          <ReferenceLine
            y={referenceLine.value}
            label={referenceLine.label || ''}
            stroke={referenceLine.stroke || '#ef4444'}
            strokeDasharray={referenceLine.strokeDasharray || '5 5'}
          />
        )}
        <Bar 
          dataKey={dataKey} 
          fill={color} 
          name={name || dataKey}
          radius={[0, 4, 4, 0]}
        >
          {showLabel && <LabelList dataKey={dataKey} position="top" />}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}
