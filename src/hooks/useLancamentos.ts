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
  // Paginação server-side
  page?: number
  pageSize?: number
  // Busca por texto (busca em observações/local dentro do JSONB)
  searchText?: string
}

interface UseLancamentosResult {
  data: Lancamento[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const DEFAULT_PAGE_SIZE = 20

export function useLancamentos({
  baseId,
  equipeId,
  indicadorId,
  dataInicio,
  dataFim,
  enabled = true,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
  searchText,
}: UseLancamentosParams = {}) {
  return useQuery<UseLancamentosResult>({
    queryKey: [
      'lancamentos',
      baseId,
      equipeId,
      indicadorId,
      dataInicio,
      dataFim,
      page,
      pageSize,
      searchText,
    ],
    enabled,
    queryFn: async () => {
      // Função auxiliar para busca no cliente (fallback)
      const performClientSideSearch = async (
        searchText: string,
        page: number,
        pageSize: number,
        from: number,
        to: number,
        baseId?: string,
        equipeId?: string,
        indicadorId?: string,
        dataInicio?: string,
        dataFim?: string
      ): Promise<UseLancamentosResult> => {
        // Buscar TODOS os registros (sem paginação) para filtrar corretamente
        // Otimização: buscar apenas colunas necessárias
        let allQuery = supabase
          .from('lancamentos')
          .select('id, data_referencia, base_id, equipe_id, indicador_id, conteudo, user_id, created_at')
          .order('data_referencia', { ascending: false })
          .order('created_at', { ascending: true })
        
        // Aplicar os mesmos filtros (exceto paginação e busca)
        if (baseId) allQuery = allQuery.eq('base_id', baseId)
        if (equipeId) allQuery = allQuery.eq('equipe_id', equipeId)
        if (indicadorId) allQuery = allQuery.eq('indicador_id', indicadorId)
        if (dataInicio) allQuery = allQuery.gte('data_referencia', dataInicio)
        if (dataFim) allQuery = allQuery.lte('data_referencia', dataFim)
        
        const { data: allData, error: allError } = await allQuery
        
        if (allError) throw allError
        
        const allLancamentos = (allData || []) as Lancamento[]
        
        // Filtrar por texto no cliente
        const searchLower = searchText.toLowerCase()
        const filtered = allLancamentos.filter((lancamento) => {
          const conteudo = lancamento.conteudo as Record<string, any>
          if (!conteudo) return false

          // Buscar em campos comuns
          const local = String(conteudo.local || '').toLowerCase()
          const observacoes = String(conteudo.observacoes || '').toLowerCase()
          const tipoOcorrencia = String(conteudo.tipo_ocorrencia || '').toLowerCase()
          const tipoAtividade = String(conteudo.tipo_atividade || '').toLowerCase()

          return (
            local.includes(searchLower) ||
            observacoes.includes(searchLower) ||
            tipoOcorrencia.includes(searchLower) ||
            tipoAtividade.includes(searchLower)
          )
        })
        
        const totalFiltered = filtered.length
        // Aplicar paginação no resultado filtrado
        const lancamentos = filtered.slice(from, to + 1)
        const totalPages = Math.ceil(totalFiltered / pageSize)

        return {
          data: lancamentos,
          total: totalFiltered,
          page,
          pageSize,
          totalPages,
        }
      }

      // Calcular range para paginação
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Query para contar total (sem paginação)
      let countQuery = supabase
        .from('lancamentos')
        .select('*', { count: 'exact', head: true })

      // Query para buscar dados (com paginação): data (mais recente primeiro), depois ordem de salvamento (created_at)
      let dataQuery = supabase
        .from('lancamentos')
        .select('*')
        .order('data_referencia', { ascending: false })
        .order('created_at', { ascending: true })
        .range(from, to)

      // Se há busca por texto, tentar usar função RPC para busca otimizada no servidor
      // Se a função não existir (migration não aplicada), fazer fallback para busca no cliente
      if (searchText && searchText.trim() && searchText.length >= 2) {
        try {
          // Tentar buscar IDs usando função PostgreSQL RPC
          const { data: matchingIds, error: searchError } = await supabase.rpc(
            'search_lancamentos_jsonb',
            { search_term: searchText.trim() } as any
          )

          // Se a função não existe ou deu erro, fazer fallback para busca no cliente
          if (searchError) {
            console.warn('Função RPC não disponível, usando busca no cliente:', searchError.message)
            // Fallback: buscar todos e filtrar no cliente (comportamento anterior)
            return await performClientSideSearch(
              searchText.trim(),
              page,
              pageSize,
              from,
              to,
              baseId,
              equipeId,
              indicadorId,
              dataInicio,
              dataFim
            )
          }

          const ids = ((matchingIds as any[]) || []).map((row: { lancamento_id: string }) => row.lancamento_id)

          if (ids.length === 0) {
            // Nenhum resultado encontrado
            return {
              data: [],
              total: 0,
              page,
              pageSize,
              totalPages: 0,
            }
          }

          // Construir query com filtros + IDs da busca
          // Otimização: buscar apenas colunas necessárias
          let filteredQuery = supabase
            .from('lancamentos')
            .select('id, data_referencia, base_id, equipe_id, indicador_id, conteudo, user_id, created_at', { count: 'exact' })
            .in('id', ids)
            .order('data_referencia', { ascending: false })
            .order('created_at', { ascending: true })

          // Aplicar outros filtros
          if (baseId) {
            filteredQuery = filteredQuery.eq('base_id', baseId)
          }
          if (equipeId) {
            filteredQuery = filteredQuery.eq('equipe_id', equipeId)
          }
          if (indicadorId) {
            filteredQuery = filteredQuery.eq('indicador_id', indicadorId)
          }
          if (dataInicio) {
            filteredQuery = filteredQuery.gte('data_referencia', dataInicio)
          }
          if (dataFim) {
            filteredQuery = filteredQuery.lte('data_referencia', dataFim)
          }

          // Contar total com filtros aplicados
          const countResult = await filteredQuery

          if (countResult.error) throw countResult.error

          const total = countResult.count || 0

          // Buscar dados com paginação
          // Otimização: buscar apenas colunas necessárias
          let dataQuery = supabase
            .from('lancamentos')
            .select('id, data_referencia, base_id, equipe_id, indicador_id, conteudo, user_id, created_at, updated_at')
            .in('id', ids)
            .order('data_referencia', { ascending: false })
            .order('created_at', { ascending: true })
            .range(from, to)

          // Aplicar mesmos filtros
          if (baseId) dataQuery = dataQuery.eq('base_id', baseId)
          if (equipeId) dataQuery = dataQuery.eq('equipe_id', equipeId)
          if (indicadorId) dataQuery = dataQuery.eq('indicador_id', indicadorId)
          if (dataInicio) dataQuery = dataQuery.gte('data_referencia', dataInicio)
          if (dataFim) dataQuery = dataQuery.lte('data_referencia', dataFim)

          const dataResult = await dataQuery

          if (dataResult.error) throw dataResult.error

          const lancamentos = (dataResult.data || []) as Lancamento[]
          const totalPages = Math.ceil(total / pageSize)

          return {
            data: lancamentos,
            total,
            page,
            pageSize,
            totalPages,
          }
        } catch (error) {
          // Se der qualquer erro na busca RPC, fazer fallback
          console.warn('Erro na busca RPC, usando fallback:', error)
          const trimmedSearch = searchText?.trim() || ''
          return await performClientSideSearch(
            trimmedSearch,
            page,
            pageSize,
            from,
            to,
            baseId,
            equipeId,
            indicadorId,
            dataInicio,
            dataFim
          )
        }
      }

      // Sem busca por texto - usar query normal otimizada
      // Aplicar filtros em ambas as queries
      const applyFilters = (query: any) => {
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
        return query
      }

      countQuery = applyFilters(countQuery)
      dataQuery = applyFilters(dataQuery)

      // Executar queries
      const [countResult, dataResult] = await Promise.all([
        countQuery,
        dataQuery,
      ])

      if (countResult.error) throw countResult.error
      if (dataResult.error) throw dataResult.error

      const lancamentos = (dataResult.data || []) as Lancamento[]
      const total = countResult.count || 0
      const totalPages = Math.ceil(total / pageSize)

      return {
        data: lancamentos,
        total,
        page,
        pageSize,
        totalPages,
      }
    },
  })
}
