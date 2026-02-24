import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Database } from '@/lib/database.types'
import { formatDateForStorage } from '@/lib/date-utils'

type LancamentoInsert = Database['public']['Tables']['lancamentos']['Insert']
type LancamentoUpdate = Database['public']['Tables']['lancamentos']['Update']

/** Mensagem lançada quando a sessão está expirada (para fechar modal e redirecionar) */
export const SESSION_EXPIRED_MESSAGE = 'Sessão expirada. Faça login novamente.'

/** Timeout em ms para o salvamento (evita botão "Salvando..." travado para sempre) */
const SAVE_TIMEOUT_MS = 35000 // 35 segundos (redes/PCs lentos)

/** Rejeita após um tempo; evita que a promise do save fique pendurada. */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      }
    )
  })
}

interface SaveLancamentoParams {
  id?: string // quando presente, faz UPDATE no registro existente; caso contrário, INSERT
  dataReferencia: string // formato YYYY-MM-DD
  indicadorId: string
  conteudo: Record<string, unknown>
  baseId?: string
  equipeId?: string
}

/** Trata erro ao salvar: se for sessão expirada, mostra mensagem, fecha o modal (onSuccess) e opcionalmente redireciona ao login */
export function handleSaveError(
  error: unknown,
  options?: { onSuccess?: () => void; navigate?: (path: string) => void }
): void {
  const message = error instanceof Error ? error.message : String(error)
  const isSessionExpired = message.includes(SESSION_EXPIRED_MESSAGE) || message.includes('Sessão expirada')
  if (isSessionExpired) {
    alert(SESSION_EXPIRED_MESSAGE)
    options?.onSuccess?.()
    options?.navigate?.('/login')
  } else {
    alert(message || 'Erro ao salvar. Tente novamente.')
  }
}

export function useLancamento() {
  const queryClient = useQueryClient()
  const { authUser } = useAuth()

  const saveMutation = useMutation({
    mutationFn: async (params: SaveLancamentoParams) => {
      const doSave = async () => {
        const { id, dataReferencia, indicadorId, conteudo, baseId, equipeId } = params

        if (!authUser?.user?.id) {
          throw new Error('Usuário não autenticado')
        }

        if (!authUser.profile) {
          throw new Error('Perfil do usuário não encontrado')
        }

        // Usar base_id e equipe_id do perfil se não fornecidos ou vazios
        const finalBaseId = (baseId && String(baseId).trim()) ? baseId.trim() : authUser.profile.base_id
        const finalEquipeId = (equipeId && String(equipeId).trim()) ? equipeId.trim() : authUser.profile.equipe_id

        if (!finalBaseId || !finalEquipeId) {
          throw new Error('Base e Equipe são obrigatórios')
        }

        // CORREÇÃO TIMEZONE: Garantir que data_referencia está no formato YYYY-MM-DD (local, não UTC)
        let normalizedDate: string
        if (typeof dataReferencia === 'string') {
          if (dataReferencia.includes('T')) {
            normalizedDate = dataReferencia.split('T')[0]
          } else if (/^\d{4}-\d{2}-\d{2}$/.test(dataReferencia)) {
            normalizedDate = dataReferencia
          } else {
            const date = new Date(dataReferencia)
            normalizedDate = formatDateForStorage(date)
          }
        } else {
          normalizedDate = formatDateForStorage(new Date(dataReferencia))
        }

        const conteudoTyped = conteudo as Database['public']['Tables']['lancamentos']['Row']['conteudo']
        const table = supabase.from('lancamentos')

        if (id) {
          // Edição: atualizar registro existente pelo ID (evita duplicidade)
          const updatePayload: LancamentoUpdate = {
            data_referencia: normalizedDate,
            base_id: finalBaseId,
            equipe_id: finalEquipeId,
            user_id: authUser.user.id,
            indicador_id: indicadorId,
            conteudo: conteudoTyped,
          }
          const { data, error } = await (table as any).update(updatePayload).eq('id', id).select().single()
          if (error) {
            const msg = error.message || 'Erro ao atualizar no servidor.'
            const code = (error as { code?: string }).code
            if (code === 'PGRST301' || code === '401' || /jwt|session|unauthorized|expired/i.test(msg)) {
              throw new Error(SESSION_EXPIRED_MESSAGE)
            }
            throw new Error(msg)
          }
          return data
        }

        // Novo lançamento: INSERT
        const lancamentoData: LancamentoInsert = {
          data_referencia: normalizedDate,
          base_id: finalBaseId,
          equipe_id: finalEquipeId,
          user_id: authUser.user.id,
          indicador_id: indicadorId,
          conteudo: conteudoTyped,
        }
        const { data, error } = await (table as any).insert(lancamentoData).select().single()

        if (error) {
          const msg = error.message || 'Erro ao salvar no servidor.'
          const code = (error as { code?: string }).code
          if (code === 'PGRST301' || code === '401' || /jwt|session|unauthorized|expired/i.test(msg)) {
            throw new Error(SESSION_EXPIRED_MESSAGE)
          }
          throw new Error(msg)
        }
        return data
      }

      return withTimeout(
        doSave(),
        SAVE_TIMEOUT_MS,
        'A requisição demorou muito. Verifique sua conexão e tente novamente.'
      )
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
