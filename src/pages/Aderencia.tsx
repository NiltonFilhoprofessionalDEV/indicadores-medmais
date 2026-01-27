import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRulesByGrupo, isGrupoA, isGrupoB } from '@/lib/compliance-rules'
import { formatDateForDisplay } from '@/lib/date-utils'
import type { Database } from '@/lib/database.types'
import { format, startOfMonth, endOfMonth, parse, isToday, isYesterday, differenceInDays, startOfDay } from 'date-fns'
import { Info } from 'lucide-react'

type Base = Database['public']['Tables']['bases']['Row']
type Indicador = Database['public']['Tables']['indicadores_config']['Row']
type Lancamento = Database['public']['Tables']['lancamentos']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface BaseComplianceStatus {
  baseId: string
  baseNome: string
  grupoAStatus: {
    atividadesAcessorias: 'ok' | 'pendente' | 'atrasado'
    treinamento: 'ok' | 'pendente' | 'atrasado'
  }
  grupoCCompliant: number // Quantos de 9 estão OK
  grupoCFaltantes: string[] // Nomes dos indicadores que faltam
  ultimaOcorrencia?: string // Data da última ocorrência (Grupo B)
}

export function Aderencia() {
  const { authUser } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  // Estado para filtro de mês/ano
  const [mesAno, setMesAno] = useState<string>(() => {
    const now = new Date()
    return format(now, 'yyyy-MM')
  })

  // Parsear mês/ano selecionado
  const mesAnoDate = useMemo(() => {
    try {
      return parse(mesAno + '-01', 'yyyy-MM-dd', new Date())
    } catch {
      return new Date()
    }
  }, [mesAno])

  const hoje = startOfDay(new Date())
  const ontem = startOfDay(new Date(hoje.getTime() - 24 * 60 * 60 * 1000))
  const dataInicio = format(startOfMonth(mesAnoDate), 'yyyy-MM-dd')
  const dataFim = format(endOfMonth(mesAnoDate), 'yyyy-MM-dd')
  const mesAtual = format(new Date(), 'yyyy-MM')
  const mesSelecionado = format(mesAnoDate, 'yyyy-MM')
  const mesFechado = mesSelecionado < mesAtual

  // Buscar bases (excluindo ADMINISTRATIVO)
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bases')
        .select('*')
        .neq('nome', 'ADMINISTRATIVO')
        .order('nome')
      if (error) throw error
      return (data || []) as Base[]
    },
  })

  // Buscar indicadores
  const { data: indicadores } = useQuery<Indicador[]>({
    queryKey: ['indicadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('indicadores_config').select('*').order('nome')
      if (error) throw error
      return (data || []) as Indicador[]
    },
  })

  // Buscar todos os lançamentos do período (últimos 30 dias para Grupo A, mês selecionado para Grupo C)
  const { data: lancamentos, isLoading } = useQuery<Lancamento[]>({
    queryKey: ['lancamentos-compliance', dataInicio, dataFim],
    queryFn: async () => {
      // Buscar do início do mês selecionado até hoje (para capturar Grupo A também)
      const dataInicioBusca = format(startOfMonth(mesAnoDate), 'yyyy-MM-dd')
      const dataFimBusca = format(hoje, 'yyyy-MM-dd')
      
      const { data, error } = await supabase
        .from('lancamentos')
        .select('*')
        .gte('data_referencia', dataInicioBusca)
        .lte('data_referencia', dataFimBusca)
        .order('data_referencia', { ascending: false })
      if (error) throw error
      return (data || []) as Lancamento[]
    },
  })

  // Buscar usuários para verificar inatividade
  const { data: usuarios } = useQuery<Profile[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'chefe') // Apenas Chefes de Equipe
      if (error) throw error
      return (data || []) as Profile[]
    },
  })

  // Calcular status de compliance por base
  const compliancePorBase = useMemo<BaseComplianceStatus[]>(() => {
    if (!bases || !indicadores || !lancamentos) return []

    return bases.map((base) => {
      // GRUPO A: Verificar lançamentos de hoje e ontem
      const lancamentosGrupoA = lancamentos.filter((l) => {
        const indicador = indicadores.find((i) => i.id === l.indicador_id)
        return indicador && isGrupoA(indicador.schema_type) && l.base_id === base.id
      })

      const atividadesAcessorias = lancamentosGrupoA.filter((l) => {
        const indicador = indicadores.find((i) => i.id === l.indicador_id)
        return indicador?.schema_type === 'atividades_acessorias'
      })

      const treinamento = lancamentosGrupoA.filter((l) => {
        const indicador = indicadores.find((i) => i.id === l.indicador_id)
        return indicador?.schema_type === 'treinamento'
      })

      const getStatusGrupoA = (lancamentos: Lancamento[]): 'ok' | 'pendente' | 'atrasado' => {
        if (lancamentos.length === 0) return 'atrasado'
        
        const lancamentoHoje = lancamentos.find((l) => {
          try {
            const dataLanc = parse(l.data_referencia, 'yyyy-MM-dd', new Date())
            return isToday(dataLanc)
          } catch {
            return false
          }
        })

        if (lancamentoHoje) return 'ok'

        const lancamentoOntem = lancamentos.find((l) => {
          try {
            const dataLanc = parse(l.data_referencia, 'yyyy-MM-dd', new Date())
            return isYesterday(dataLanc)
          } catch {
            return false
          }
        })

        if (lancamentoOntem) return 'pendente'

        // Verificar quantos dias desde o último lançamento
        const ultimoLancamento = lancamentos[0]
        if (ultimoLancamento) {
          try {
            const dataUltimo = parse(ultimoLancamento.data_referencia, 'yyyy-MM-dd', new Date())
            const diasDesdeUltimo = differenceInDays(hoje, dataUltimo)
            return diasDesdeUltimo >= 2 ? 'atrasado' : 'pendente'
          } catch {
            return 'atrasado'
          }
        }

        return 'atrasado'
      }

      // GRUPO C: Verificar compliance mensal
      const grupoCRules = getRulesByGrupo('C')
      let grupoCCompliant = 0
      const grupoCFaltantes: string[] = []

      grupoCRules.forEach((rule) => {
        const indicador = indicadores.find((i) => i.schema_type === rule.schema_type)
        if (!indicador) return

        const temLancamentoMes = lancamentos.some((l) => {
          try {
            const dataLanc = parse(l.data_referencia, 'yyyy-MM-dd', new Date())
            const mesLanc = format(dataLanc, 'yyyy-MM')
            return (
              l.base_id === base.id &&
              l.indicador_id === indicador.id &&
              mesLanc === mesSelecionado
            )
          } catch {
            return false
          }
        })

        if (temLancamentoMes) {
          grupoCCompliant++
        } else {
          grupoCFaltantes.push(rule.nome)
        }
      })

      // GRUPO B: Última ocorrência
      const lancamentosGrupoB = lancamentos.filter((l) => {
        const indicador = indicadores.find((i) => i.id === l.indicador_id)
        return indicador && isGrupoB(indicador.schema_type) && l.base_id === base.id
      })

      const ultimaOcorrencia = lancamentosGrupoB[0]?.data_referencia

      return {
        baseId: base.id,
        baseNome: base.nome,
        grupoAStatus: {
          atividadesAcessorias: getStatusGrupoA(atividadesAcessorias),
          treinamento: getStatusGrupoA(treinamento),
        },
        grupoCCompliant,
        grupoCFaltantes,
        ultimaOcorrencia,
      }
    })
  }, [bases, indicadores, lancamentos, mesSelecionado, hoje, ontem])

  // Calcular usuários inativos (sem acesso há > 30 dias)
  const usuariosInativos = useMemo(() => {
    if (!usuarios || !lancamentos) return []

    const limite30Dias = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000)

    return usuarios.filter((usuario) => {
      // Verificar se fez algum lançamento nos últimos 30 dias
      const temLancamentoRecente = lancamentos.some((l) => {
        try {
          const dataLanc = parse(l.data_referencia, 'yyyy-MM-dd', new Date())
          return l.user_id === usuario.id && dataLanc >= limite30Dias
        } catch {
          return false
        }
      })

      return !temLancamentoRecente
    })
  }, [usuarios, lancamentos, hoje])

  const handleLogout = async () => {
    try {
      // Limpar cache do React Query
      queryClient.clear()
      
      // Limpar localStorage do Supabase antes do signOut
      localStorage.removeItem('supabase.auth.token')
      
      // Fazer logout no Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Erro ao fazer logout:', error)
      } else {
        console.log('✅ Logout realizado com sucesso')
      }
      
      // Limpar qualquer estado restante no localStorage
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('supabase.') || key.startsWith('sb-'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
      // Aguardar um momento para o contexto ser atualizado
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Forçar reload completo da página para garantir limpeza total
      window.location.href = '/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      // Mesmo com erro, forçar navegação para login
      window.location.href = '/login'
    }
  }

  // Componente de Tooltip para pendências mensais
  function PendenciasTooltip({ faltantes }: { faltantes: string[] }) {
    if (faltantes.length === 0) return null

    return (
      <div className="group relative inline-block">
        <Info className="h-4 w-4 text-gray-400 cursor-help hover:text-gray-600 transition-colors ml-1" />
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
          <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-4 w-64 shadow-lg">
            <div className="font-semibold mb-1">Indicadores Pendentes:</div>
            <ul className="list-disc list-inside space-y-1">
              {faltantes.map((nome, idx) => (
                <li key={idx}>{nome}</li>
              ))}
            </ul>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b">
        <div className="max-w-7xl mx-auto pr-4 sm:pr-6 lg:pr-8 pl-0 py-4">
          <div className="flex justify-between items-center min-h-[80px]">
            <div className="flex items-center gap-4 pl-4 sm:pl-6 lg:pl-8">
              <img 
                src="/logo-medmais.png" 
                alt="MedMais Logo" 
                className="h-10 w-auto brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Monitoramento de Aderência</h1>
                <p className="text-sm text-white/90">
                  {authUser?.profile?.nome} - {authUser?.profile?.role}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => navigate('/dashboard-gerente')} className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200">
                Voltar
              </Button>
              <Button onClick={handleLogout} className="bg-white text-[#fc4d00] hover:bg-white/90 border-white transition-all duration-200">
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtro de Mês/Ano */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="mes-ano">Mês/Ano de Referência</Label>
                <Input
                  id="mes-ano"
                  type="month"
                  value={mesAno}
                  onChange={(e) => setMesAno(e.target.value)}
                  className="w-48"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Widget: Usuários Inativos */}
        {usuariosInativos.length > 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="text-orange-700 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Usuários Cadastrados sem Acesso há &gt; 30 dias
              </CardTitle>
              <CardDescription className="text-orange-600">
                {usuariosInativos.length} usuário(s) sem lançamentos nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {usuariosInativos.map((usuario) => (
                  <span
                    key={usuario.id}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-md text-sm font-medium"
                  >
                    {usuario.nome}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Aderência */}
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Aderência por Base</CardTitle>
            <CardDescription>
              Período: {format(mesAnoDate, 'MMMM/yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 bg-gray-100 text-left font-semibold sticky left-0 z-10">
                        Base
                      </th>
                      <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-center font-semibold min-w-[200px]">
                        Rotina Diária (Grupo A)
                      </th>
                      <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-center font-semibold min-w-[150px]">
                        Pendências Mensais (Grupo C)
                      </th>
                      <th className="border border-gray-300 px-3 py-2 bg-gray-100 text-center font-semibold min-w-[150px]">
                        Última Ocorrência (Grupo B)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {compliancePorBase.map((baseStatus) => {
                      // Calcular status visual do Grupo C
                      const grupoCStatus = baseStatus.grupoCCompliant === 9 
                        ? 'compliant' 
                        : mesFechado 
                        ? 'non-compliant' 
                        : 'pending'

                      return (
                        <tr key={baseStatus.baseId} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium sticky left-0 bg-white z-10">
                            {baseStatus.baseNome}
                          </td>
                          
                          {/* Coluna 2: Rotina Diária (Grupo A) */}
                          <td className="border border-gray-300 px-2 py-2">
                            <div className="flex flex-col gap-2 items-center">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Ativ. Acessórias:</span>
                                {baseStatus.grupoAStatus.atividadesAcessorias === 'ok' && (
                                  <span className="text-green-700 text-lg" title="Hoje OK">✅</span>
                                )}
                                {baseStatus.grupoAStatus.atividadesAcessorias === 'pendente' && (
                                  <span className="text-yellow-700 text-lg" title="Ontem Pendente">⚠️</span>
                                )}
                                {baseStatus.grupoAStatus.atividadesAcessorias === 'atrasado' && (
                                  <span className="text-red-700 text-lg" title="Sem lançamentos há 2+ dias">❌</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">Treinamento:</span>
                                {baseStatus.grupoAStatus.treinamento === 'ok' && (
                                  <span className="text-green-700 text-lg" title="Hoje OK">✅</span>
                                )}
                                {baseStatus.grupoAStatus.treinamento === 'pendente' && (
                                  <span className="text-yellow-700 text-lg" title="Ontem Pendente">⚠️</span>
                                )}
                                {baseStatus.grupoAStatus.treinamento === 'atrasado' && (
                                  <span className="text-red-700 text-lg" title="Sem lançamentos há 2+ dias">❌</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Coluna 3: Pendências Mensais (Grupo C) */}
                          <td className={`border border-gray-300 px-2 py-2 text-center ${
                            grupoCStatus === 'compliant' 
                              ? 'bg-green-100' 
                              : grupoCStatus === 'pending' 
                              ? 'bg-yellow-100' 
                              : 'bg-red-100'
                          }`}>
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-sm font-medium ${
                                grupoCStatus === 'compliant' 
                                  ? 'text-green-700' 
                                  : grupoCStatus === 'pending' 
                                  ? 'text-yellow-700' 
                                  : 'text-red-700'
                              }`}>
                                {baseStatus.grupoCCompliant} de 9 entregues
                              </span>
                              {baseStatus.grupoCFaltantes.length > 0 && (
                                <PendenciasTooltip faltantes={baseStatus.grupoCFaltantes} />
                              )}
                            </div>
                            {grupoCStatus === 'compliant' && (
                              <span className="text-green-700 text-lg">✅</span>
                            )}
                            {grupoCStatus === 'pending' && (
                              <span className="text-yellow-700 text-lg">🟡</span>
                            )}
                            {grupoCStatus === 'non-compliant' && (
                              <span className="text-red-700 text-lg">🔴</span>
                            )}
                          </td>

                          {/* Coluna 4: Última Ocorrência (Grupo B) */}
                          <td className="border border-gray-300 px-2 py-2 text-center bg-gray-50">
                            {baseStatus.ultimaOcorrencia ? (
                              <span className="text-sm text-gray-600">
                                Último: {formatDateForDisplay(baseStatus.ultimaOcorrencia)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Legenda */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Legenda</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Grupo A - Rotina Diária:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✅</span>
                    <span>Hoje OK (lançamento hoje)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <span>Ontem Pendente (último lançamento ontem)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">❌</span>
                    <span>Sem lançamentos há 2+ dias</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Grupo C - Obrigação Mensal:</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">✅</span>
                    <span>Compliance (9 de 9 entregues)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🟡</span>
                    <span>Pendente (mês aberto, faltam indicadores)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔴</span>
                    <span>Não Conforme (mês fechado sem completar)</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Grupo B - Eventuais:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Mostra apenas a data do último registro</div>
                  <div>Sem alerta de atraso</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
