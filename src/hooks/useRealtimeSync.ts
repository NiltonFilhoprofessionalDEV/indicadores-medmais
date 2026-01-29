import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/**
 * Hook que se inscreve nas mudanças da tabela lancamentos (INSERT, UPDATE, DELETE)
 * e invalida as queries do TanStack Query para que todos os dashboards analíticos
 * sejam atualizados automaticamente sem piscar (use placeholderData: keepPreviousData nas queries).
 * A inscrição é limpa no unmount para evitar vazamento de memória.
 */
export function useRealtimeSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('lancamentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lancamentos',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['lancamentos'] })
          queryClient.invalidateQueries({ queryKey: ['lancamentos-todos'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
