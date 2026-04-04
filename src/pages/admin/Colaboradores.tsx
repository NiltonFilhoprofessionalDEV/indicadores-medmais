import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { AppShell } from '@/components/AppShell'
import { FormDrawer } from '@/components/ui/form-drawer'
import {
  useColaboradores,
  useCreateColaborador,
  useCreateColaboradoresBatch,
  useUpdateColaborador,
  useDeleteColaborador,
} from '@/hooks/useColaboradores'
import { formatBaseName } from '@/lib/utils'
import { Pencil, Trash2, UserPlus, Users, Search } from 'lucide-react'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']
type Colaborador = Database['public']['Tables']['colaboradores']['Row']

export function Colaboradores() {
  const { authUser } = useAuth()
  const isGerenteGeral = authUser?.profile?.role === 'geral'
  const userBaseId = authUser?.profile?.base_id ?? ''
  const isBaseLocked = !isGerenteGeral
  const [selectedBaseId, setSelectedBaseId] = useState<string>('')

  useEffect(() => {
    if (isBaseLocked && userBaseId) {
      setSelectedBaseId(userBaseId)
    }
  }, [isBaseLocked, userBaseId])

  const [showDrawer, setShowDrawer] = useState(false)
  const [activeTab, setActiveTab] = useState<'individual' | 'batch'>('individual')
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null)
  const [nomeIndividual, setNomeIndividual] = useState('')
  const [nomesBatch, setNomesBatch] = useState('')

  const { data: bases } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bases').select('*').order('nome')
      if (error) throw error
      return data || []
    },
  })

  const { data: colaboradores, isLoading } = useColaboradores(selectedBaseId || null)
  const createColaborador = useCreateColaborador()
  const createColaboradoresBatch = useCreateColaboradoresBatch()
  const updateColaborador = useUpdateColaborador()
  const deleteColaborador = useDeleteColaborador()

  const handleNovoColaborador = () => {
    setEditingColaborador(null)
    setNomeIndividual('')
    setNomesBatch('')
    setActiveTab('individual')
    setShowDrawer(true)
  }

  const handleEditar = (colaborador: Colaborador) => {
    setEditingColaborador(colaborador)
    setNomeIndividual(colaborador.nome)
    setNomesBatch('')
    setActiveTab('individual')
    setShowDrawer(true)
  }

  const handleExcluir = async (colaborador: Colaborador) => {
    if (!window.confirm(`Deseja realmente excluir o colaborador "${colaborador.nome}"?`)) return
    try {
      await deleteColaborador.mutateAsync({ id: colaborador.id, baseId: colaborador.base_id })
      alert('Colaborador excluído com sucesso!')
    } catch (error: any) {
      alert(`Erro ao excluir colaborador: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleSalvarIndividual = async () => {
    if (!nomeIndividual.trim()) { alert('Nome é obrigatório'); return }
    if (!selectedBaseId) { alert('Selecione uma base primeiro'); return }
    try {
      if (editingColaborador) {
        await updateColaborador.mutateAsync({ id: editingColaborador.id, updates: { nome: nomeIndividual.trim() } })
        alert('Colaborador atualizado com sucesso!')
      } else {
        await createColaborador.mutateAsync({ nome: nomeIndividual.trim(), base_id: selectedBaseId, ativo: true })
        alert('Colaborador criado com sucesso!')
      }
      setShowDrawer(false)
      setNomeIndividual('')
      setEditingColaborador(null)
    } catch (error: any) {
      alert(`Erro ao salvar colaborador: ${error.message || 'Erro desconhecido'}`)
    }
  }

  const handleSalvarBatch = async () => {
    if (!nomesBatch.trim()) { alert('Cole a lista de nomes'); return }
    if (!selectedBaseId) { alert('Selecione uma base primeiro'); return }
    const nomes = nomesBatch.split('\n').map((n) => n.trim()).filter((n) => n.length > 0)
    if (nomes.length === 0) { alert('Nenhum nome válido encontrado'); return }
    try {
      await createColaboradoresBatch.mutateAsync({
        colaboradores: nomes.map((nome) => ({ nome, base_id: selectedBaseId, ativo: true })),
        baseId: selectedBaseId,
      })
      alert(`${nomes.length} colaborador(es) criado(s) com sucesso!`)
      setShowDrawer(false)
      setNomesBatch('')
    } catch (error: any) {
      alert(`Erro ao criar colaboradores: ${error.message || 'Erro desconhecido'}`)
    }
  }

  return (
    <AppShell
      title="Gestão de Efetivo"
      subtitle={authUser?.profile?.nome}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Colaboradores</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie o efetivo de cada base</p>
          </div>
          {selectedBaseId && (
            <Button onClick={handleNovoColaborador} className="gap-2">
              <UserPlus className="h-4 w-4" /> Novo Colaborador
            </Button>
          )}
        </div>

        {/* Filtro Base */}
        <Card className="border-0 shadow-soft">
          <CardContent className="py-4 px-5">
            <div className="flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Label htmlFor="base" className="text-sm font-medium whitespace-nowrap">Base:</Label>
              <Select
                id="base"
                value={selectedBaseId}
                onChange={(e) => !isBaseLocked && setSelectedBaseId(e.target.value)}
                className="max-w-xs"
                disabled={isBaseLocked}
              >
                {isBaseLocked ? null : <option value="">Selecione uma base</option>}
                {bases?.map((base) => (
                  <option key={base.id} value={base.id}>{formatBaseName(base.nome)}</option>
                ))}
              </Select>
              {isBaseLocked && (
                <span className="text-xs text-muted-foreground">(Sua base)</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card className="border-0 shadow-soft overflow-hidden">
          <CardContent className="p-0">
            {!selectedBaseId ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Selecione uma base para visualizar os colaboradores.</p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : colaboradores && colaboradores.length > 0 ? (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Nome</th>
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {colaboradores.map((colaborador) => (
                      <tr key={colaborador.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{colaborador.nome}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            colaborador.ativo
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                          }`}>
                            {colaborador.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditar(colaborador)}
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleExcluir(colaborador)}
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-destructive"
                              title="Excluir"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum colaborador cadastrado para esta base.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer: Cadastro/Edição */}
      <FormDrawer
        open={showDrawer}
        onClose={() => { setShowDrawer(false); setEditingColaborador(null); setNomeIndividual(''); setNomesBatch('') }}
        title={editingColaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
        subtitle={editingColaborador ? 'Edite as informações' : 'Cadastre individual ou em lote'}
      >
        <div className="space-y-5">
          {/* Tabs */}
          {!editingColaborador && (
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab('individual')}
                className={`px-4 py-2.5 font-medium text-sm transition-colors ${
                  activeTab === 'individual'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Individual
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('batch')}
                className={`px-4 py-2.5 font-medium text-sm transition-colors ${
                  activeTab === 'batch'
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Em Lote
              </button>
            </div>
          )}

          {activeTab === 'individual' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={nomeIndividual}
                  onChange={(e) => setNomeIndividual(e.target.value)}
                  placeholder="Nome do colaborador"
                  disabled={createColaborador.isPending || updateColaborador.isPending}
                />
              </div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => { setShowDrawer(false); setEditingColaborador(null); setNomeIndividual('') }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarIndividual}
                  disabled={createColaborador.isPending || updateColaborador.isPending}
                  className="flex-1"
                >
                  {createColaborador.isPending || updateColaborador.isPending
                    ? 'Salvando...'
                    : editingColaborador ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'batch' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="nomes">Lista de Nomes (um por linha) *</Label>
                <Textarea
                  id="nomes"
                  value={nomesBatch}
                  onChange={(e) => setNomesBatch(e.target.value)}
                  placeholder={"Cole a lista aqui (um por linha)\nExemplo:\nJoão Silva\nMaria Santos\nPedro Oliveira"}
                  rows={10}
                  className="font-mono text-sm"
                  disabled={createColaboradoresBatch.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Cada linha será um nome. Linhas vazias serão ignoradas.
                </p>
              </div>
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => { setShowDrawer(false); setNomesBatch('') }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSalvarBatch}
                  disabled={createColaboradoresBatch.isPending}
                  className="flex-1"
                >
                  {createColaboradoresBatch.isPending
                    ? 'Salvando...'
                    : `Salvar ${nomesBatch.split('\n').filter((n) => n.trim()).length} colaborador(es)`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </FormDrawer>
    </AppShell>
  )
}
