import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  useColaboradores,
  useCreateColaborador,
  useCreateColaboradoresBatch,
  useUpdateColaborador,
  useDeleteColaborador,
} from '@/hooks/useColaboradores'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']
type Colaborador = Database['public']['Tables']['colaboradores']['Row']

export function Colaboradores() {
  const navigate = useNavigate()
  const { authUser } = useAuth()
  const [selectedBaseId, setSelectedBaseId] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'individual' | 'batch'>('individual')
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null)
  const [nomeIndividual, setNomeIndividual] = useState('')
  const [nomesBatch, setNomesBatch] = useState('')

  // Buscar bases
  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  // Buscar colaboradores da base selecionada
  const { data: colaboradores, isLoading } = useColaboradores(selectedBaseId || null)

  // Mutations
  const createColaborador = useCreateColaborador()
  const createColaboradoresBatch = useCreateColaboradoresBatch()
  const updateColaborador = useUpdateColaborador()
  const deleteColaborador = useDeleteColaborador()

  const handleNovoColaborador = () => {
    setEditingColaborador(null)
    setNomeIndividual('')
    setNomesBatch('')
    setActiveTab('individual')
    setShowModal(true)
  }

  const handleEditar = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador)
    setNomeIndividual(colaborador.nome)
    setNomesBatch('')
    setActiveTab('individual')
    setShowModal(true)
  }

  const handleExcluir = async (colaborador: Colaborador) => {
    if (!window.confirm(`Deseja realmente excluir o colaborador "${colaborador.nome}"?`)) {
      return
    }

    try {
      await deleteColaborador.mutateAsync({
        id: colaborador.id,
        baseId: colaborador.base_id,
      })
      alert('Colaborador excluído com sucesso!')
    } catch (error: any) {
      console.error('Erro ao excluir colaborador:', error)
      alert(`Erro ao excluir colaborador: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleSalvarIndividual = async () => {
    if (!nomeIndividual.trim()) {
      alert('Nome é obrigatório')
      return
    }

    if (!selectedBaseId) {
      alert('Selecione uma base primeiro')
      return
    }

    try {
      if (editingColaborador) {
        // Atualizar
        await updateColaborador.mutateAsync({
          id: editingColaborador.id,
          updates: { nome: nomeIndividual.trim() },
        })
        alert('Colaborador atualizado com sucesso!')
      } else {
        // Criar
        await createColaborador.mutateAsync({
          nome: nomeIndividual.trim(),
          base_id: selectedBaseId,
          ativo: true,
        })
        alert('Colaborador criado com sucesso!')
      }
      setShowModal(false)
      setNomeIndividual('')
      setEditingColaborador(null)
    } catch (error: any) {
      console.error('Erro ao salvar colaborador:', error)
      alert(`Erro ao salvar colaborador: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleSalvarBatch = async () => {
    if (!nomesBatch.trim()) {
      alert('Cole a lista de nomes')
      return
    }

    if (!selectedBaseId) {
      alert('Selecione uma base primeiro')
      return
    }

    // Processar nomes: quebrar por linha, limpar espaços e filtrar vazios
    const nomes = nomesBatch
      .split('\n')
      .map((nome) => nome.trim())
      .filter((nome) => nome.length > 0)

    if (nomes.length === 0) {
      alert('Nenhum nome válido encontrado')
      return
    }

    try {
      // Criar array de colaboradores para inserção em lote
      const colaboradoresToInsert = nomes.map((nome) => ({
        nome,
        base_id: selectedBaseId,
        ativo: true,
      }))

      await createColaboradoresBatch.mutateAsync({
        colaboradores: colaboradoresToInsert,
        baseId: selectedBaseId,
      })

      alert(`${nomes.length} colaborador(es) criado(s) com sucesso!`)
      setShowModal(false)
      setNomesBatch('')
    } catch (error: any) {
      console.error('Erro ao criar colaboradores em lote:', error)
      alert(`Erro ao criar colaboradores: ${error.message || 'Erro desconhecido'}`)
    }
  }

  return (
    <div className="min-h-screen bg-background transition-all duration-300 ease-in-out page-transition">
      <header className="bg-[#fc4d00] shadow-sm border-b border-border transition-colors duration-300 shadow-orange-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center min-h-[80px]">
            <div className="flex items-center gap-4 flex-shrink-0">
              <img 
                src="/logo-medmais.png" 
                alt="MedMais Logo" 
                className="h-10 w-auto brightness-0 invert"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <h1 className="text-2xl font-bold text-white">Gestão de Efetivo (Colaboradores)</h1>
                <p className="text-sm text-white/90">
                  {authUser?.profile?.nome} - {authUser?.profile?.role}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 ml-4">
              <Button onClick={() => navigate('/dashboard-gerente')} className="bg-white text-[#fc4d00] hover:bg-orange-50 hover:text-[#fc4d00] border-white transition-all duration-200 shadow-orange-sm">
                Voltar ao Dashboard
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Colaboradores</CardTitle>
            <CardDescription>
              Selecione uma base para visualizar e gerenciar os colaboradores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Select de Base */}
            <div className="space-y-2">
              <Label htmlFor="base">Base</Label>
              <Select
                id="base"
                value={selectedBaseId}
                onChange={(e) => setSelectedBaseId(e.target.value)}
                className="w-full"
              >
                <option value="">Selecione uma base</option>
                {bases?.map((base) => (
                  <option key={base.id} value={base.id}>
                    {base.nome}
                  </option>
                ))}
              </Select>
            </div>

            {/* Botão Novo Colaborador */}
            {selectedBaseId && (
              <div className="flex justify-end">
                <Button onClick={handleNovoColaborador} className="bg-[#fc4d00] hover:bg-[#e04400] text-white">
                  Novo Colaborador
                </Button>
              </div>
            )}

            {/* Tabela de Colaboradores */}
            {selectedBaseId && (
              <div className="border rounded-lg overflow-hidden">
                {isLoading ? (
                  <div className="p-8 text-center text-gray-500">Carregando...</div>
                ) : colaboradores && colaboradores.length > 0 ? (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-semibold text-sm">Nome</th>
                        <th className="text-left p-3 font-semibold text-sm">Status</th>
                        <th className="text-left p-3 font-semibold text-sm">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {colaboradores.map((colaborador) => (
                        <tr key={colaborador.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{colaborador.nome}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                colaborador.ativo
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {colaborador.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditar(colaborador)}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExcluir(colaborador)}
                                className="text-red-600 hover:text-red-700"
                              >
                                Excluir
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    Nenhum colaborador cadastrado para esta base.
                  </div>
                )}
              </div>
            )}

            {!selectedBaseId && (
              <div className="p-8 text-center text-gray-500">
                Selecione uma base para visualizar os colaboradores.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Cadastro/Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl">
              <CardHeader className="relative">
                <CardTitle>
                  {editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
                </CardTitle>
                <CardDescription>
                  {editingColaborador
                    ? 'Edite as informações do colaborador'
                    : 'Cadastre um colaborador individual ou em lote'}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowModal(false)
                    setEditingColaborador(null)
                    setNomeIndividual('')
                    setNomesBatch('')
                  }}
                  className="absolute top-4 right-4"
                  title="Fechar"
                >
                  ✕
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Tabs */}
                {!editingColaborador && (
                  <div className="flex border-b">
                    <button
                      type="button"
                      onClick={() => setActiveTab('individual')}
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'individual'
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('batch')}
                      className={`px-4 py-2 font-medium text-sm ${
                        activeTab === 'batch'
                          ? 'border-b-2 border-blue-500 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Em Lote
                    </button>
                  </div>
                )}

                {/* Conteúdo da Aba Individual */}
                {activeTab === 'individual' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input
                        id="nome"
                        value={nomeIndividual}
                        onChange={(e) => setNomeIndividual(e.target.value)}
                        placeholder="Digite o nome do colaborador"
                        disabled={createColaborador.isPending || updateColaborador.isPending}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowModal(false)
                          setEditingColaborador(null)
                          setNomeIndividual('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSalvarIndividual}
                        disabled={createColaborador.isPending || updateColaborador.isPending}
                        className="bg-[#fc4d00] hover:bg-[#e04400]hover:bg-[#c93d00] text-white shadow-orange-sm"
                      >
                        {createColaborador.isPending || updateColaborador.isPending
                          ? 'Salvando...'
                          : editingColaborador
                          ? 'Atualizar'
                          : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Conteúdo da Aba Em Lote */}
                {activeTab === 'batch' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nomes">Lista de Nomes (um por linha) *</Label>
                      <Textarea
                        id="nomes"
                        value={nomesBatch}
                        onChange={(e) => setNomesBatch(e.target.value)}
                        placeholder="Cole a lista de nomes aqui (um por linha)&#10;Exemplo:&#10;João Silva&#10;Maria Santos&#10;Pedro Oliveira"
                        rows={10}
                        className="font-mono text-sm"
                        disabled={createColaboradoresBatch.isPending}
                      />
                      <p className="text-xs text-gray-500">
                        Cada linha será tratada como um nome. Linhas vazias serão ignoradas.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowModal(false)
                          setNomesBatch('')
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSalvarBatch}
                        disabled={createColaboradoresBatch.isPending}
                        className="bg-[#fc4d00] hover:bg-[#e04400]hover:bg-[#c93d00] text-white shadow-orange-sm"
                      >
                        {createColaboradoresBatch.isPending
                          ? 'Salvando...'
                          : `Salvar ${nomesBatch.split('\n').filter((n) => n.trim()).length} colaborador(es)`}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
