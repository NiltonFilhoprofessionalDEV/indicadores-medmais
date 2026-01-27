import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/lib/database.types'
import { formatDateForStorage } from '@/lib/date-utils'

type LancamentoInsert = Database['public']['Tables']['lancamentos']['Insert']

interface SaveLancamentoParams {
  dataReferencia: string // formato YYYY-MM-DD
  indicadorId: string
  conteudo: Record<string, unknown>
  baseId?: string
  equipeId?: string
}

export function useLancamento() {
  const queryClient = useQueryClient()
  const { authUser } = useAuth()

  const saveMutation = useMutation({
    mutationFn: async ({ dataReferencia, indicadorId, conteudo, baseId, equipeId }: SaveLancamentoParams) => {
      if (!authUser?.user?.id) {
        throw new Error('Usuário não autenticado')
      }

      if (!authUser.profile) {
        throw new Error('Perfil do usuário não encontrado')
      }

      // Usar base_id e equipe_id do perfil se não fornecidos
      const finalBaseId = baseId || authUser.profile.base_id
      const finalEquipeId = equipeId || authUser.profile.equipe_id

      if (!finalBaseId || !finalEquipeId) {
        throw new Error('Base e Equipe são obrigatórios')
      }

      // CORREÇÃO: Sempre fazer INSERT (não UPDATE)
      // O sistema deve permitir múltiplos lançamentos para o mesmo indicador no mesmo dia
      // Removida a lógica de verificação e atualização de registros existentes
      
      // CORREÇÃO TIMEZONE: Garantir que data_referencia está no formato YYYY-MM-DD (local, não UTC)
      // Se já é string YYYY-MM-DD, usar direto. Se for Date ou ISO, converter.
      let normalizedDate: string
      if (typeof dataReferencia === 'string') {
        // Se já é string, pode ser YYYY-MM-DD ou ISO com timezone
        if (dataReferencia.includes('T')) {
          normalizedDate = dataReferencia.split('T')[0]
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
          normalizedDate = dataReferencia
        } else {
          // Tentar parsear e converter
          const date = new Date(dataReferencia)
          normalizedDate = formatDateForStorage(date)
        }
      } else {
        // Se for Date object, converter
        normalizedDate = formatDateForStorage(new Date(dataReferencia))
      }

      const lancamentoData: LancamentoInsert = {
        data_referencia: normalizedDate,
        base_id: finalBaseId,
        equipe_id: finalEquipeId,
        user_id: authUser.user.id,
        indicador_id: indicadorId,
        conteudo: conteudo as Database['public']['Tables']['lancamentos']['Row']['conteudo'],
      }

      // Sempre criar novo registro (INSERT)
      const table = (supabase.from('lancamentos') as any)
      const { data, error } = await table
        .insert(lancamentoData)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
    },
  })

  return {
    saveLancamento: saveMutation.mutateAsync,
    isLoading: saveMutation.isPending,
    error: saveMutation.error,
  }
}
