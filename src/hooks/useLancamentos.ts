import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Lancamento = Database['public']['Tables']['lancamentos']['Row']

interface UseLancamentosParams {
  baseId?: string
  equipeId?: string
  indicadorId?: string
  dataInicio?: string // YYYY-MM-DD
  dataFim?: string // YYYY-MM-DD
  enabled?: boolean
}

export function useLancamentos({
  baseId,
  equipeId,
  indicadorId,
  dataInicio,
  dataFim,
  enabled = true,
}: UseLancamentosParams = {}) {
  return useQuery({
    queryKey: ['lancamentos', baseId, equipeId, indicadorId, dataInicio, dataFim],
    enabled,
    queryFn: async () => {
      let query = supabase
        .from('lancamentos')
        .select('*')
        .order('data_referencia', { ascending: false })

      if (baseId) {
        query = query.eq('base_id', baseId)
      }

      if (equipeId) {
        query = query.eq('equipe_id', equipeId)
      }

      if (indicadorId) {
        query = query.eq('indicador_id', indicadorId)
      }

      if (dataInicio) {
        query = query.gte('data_referencia', dataInicio)
      }

      if (dataFim) {
        query = query.lte('data_referencia', dataFim)
      }

      const { data, error } = await query

      if (error) throw error

      return data as Lancamento[]
    },
  })
}
