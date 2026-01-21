import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import type { Database } from '@/lib/database.types'

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

      // Verificar se já existe lançamento para esta combinação
      const { data: existing } = await supabase
        .from('lancamentos')
        .select('id')
        .eq('data_referencia', dataReferencia)
        .eq('base_id', finalBaseId)
        .eq('equipe_id', finalEquipeId)
        .eq('indicador_id', indicadorId)
        .maybeSingle()

      const lancamentoData: LancamentoInsert = {
        data_referencia: dataReferencia,
        base_id: finalBaseId,
        equipe_id: finalEquipeId,
        user_id: authUser.user.id,
        indicador_id: indicadorId,
        conteudo: conteudo as Database['public']['Tables']['lancamentos']['Row']['conteudo'],
      }

      if (existing) {
        // Atualizar existente
        const { data, error } = await supabase
          .from('lancamentos')
          .update({
            conteudo: lancamentoData.conteudo,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from('lancamentos')
          .insert(lancamentoData)
          .select()
          .single()

        if (error) throw error
        return data
      }
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
