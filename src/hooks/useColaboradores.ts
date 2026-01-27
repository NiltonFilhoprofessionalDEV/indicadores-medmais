import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type Colaborador = Database['public']['Tables']['colaboradores']['Row']
type ColaboradorInsert = Database['public']['Tables']['colaboradores']['Insert']
type ColaboradorUpdate = Database['public']['Tables']['colaboradores']['Update']

/**
 * Hook para buscar colaboradores de uma base
 */
export function useColaboradores(baseId: string | null) {
  return useQuery({
    queryKey: ['colaboradores', baseId],
    enabled: !!baseId,
    queryFn: async () => {
      if (!baseId) return []

      const { data, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('base_id', baseId)
        .order('nome', { ascending: true })

      if (error) throw error
      return (data || []) as Colaborador[]
    },
  })
}

/**
 * Hook para criar colaborador individual
 */
export function useCreateColaborador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (colaborador: ColaboradorInsert) => {
      const table = supabase.from('colaboradores') as any
      const { data, error } = await table.insert(colaborador).select().single()

      if (error) throw error
      return data as Colaborador
    },
    onSuccess: (_, variables) => {
      // Invalidar query de colaboradores da base
      queryClient.invalidateQueries({ queryKey: ['colaboradores', variables.base_id] })
    },
  })
}

/**
 * Hook para criar múltiplos colaboradores em lote
 */
export function useCreateColaboradoresBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ colaboradores, baseId }: { colaboradores: ColaboradorInsert[]; baseId: string }) => {
      const table = supabase.from('colaboradores') as any
      const { data, error } = await table.insert(colaboradores).select()

      if (error) throw error
      // baseId usado no onSuccess
      return { data: (data || []) as Colaborador[], baseId }
    },
    onSuccess: (result) => {
      // Invalidar query de colaboradores da base
      queryClient.invalidateQueries({ queryKey: ['colaboradores', result.baseId] })
    },
  })
}

/**
 * Hook para atualizar colaborador
 */
export function useUpdateColaborador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ColaboradorUpdate }) => {
      const table = supabase.from('colaboradores') as any
      const { data, error } = await table.update(updates).eq('id', id).select().single()

      if (error) throw error
      return data as Colaborador
    },
    onSuccess: (data) => {
      // Invalidar query de colaboradores da base
      queryClient.invalidateQueries({ queryKey: ['colaboradores', data.base_id] })
    },
  })
}

/**
 * Hook para deletar colaborador
 */
export function useDeleteColaborador() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, baseId }: { id: string; baseId: string }) => {
      const { error } = await (supabase.from('colaboradores') as any).delete().eq('id', id)

      if (error) throw error
      // baseId usado no onSuccess
      return baseId
    },
    onSuccess: (baseId) => {
      // Invalidar query de colaboradores da base
      queryClient.invalidateQueries({ queryKey: ['colaboradores', baseId] })
    },
  })
}
