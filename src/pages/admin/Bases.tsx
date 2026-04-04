import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/AppShell'
import { FormDrawer } from '@/components/ui/form-drawer'
import { Pencil, Trash2, Plus, Building2 } from 'lucide-react'
import { formatBaseName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']

export function Bases() {
  const queryClient = useQueryClient()
  const { authUser } = useAuth()
  const [showDrawer, setShowDrawer] = useState(false)
  const [editingBase, setEditingBase] = useState<Base | null>(null)
  const [nome, setNome] = useState('')
  const [deleteConfirmBase, setDeleteConfirmBase] = useState<Base | null>(null)
  const [deleteTypedName, setDeleteTypedName] = useState('')

  const { data: bases, isLoading, error } = useQuery<Base[]>({
    queryKey: ['bases'],
    queryFn: async () => {
      const { data, error: err } = await supabase.from('bases').select('*').order('nome')
      if (err) throw err
      return data || []
    },
  })

  const createMutation = useMutation({
    mutationFn: async (nomeBase: string) => {
      const nomeFormatado = formatBaseName(nomeBase)
      if (!nomeFormatado) throw new Error('Nome da base é obrigatório.')
      const { data, error: err } = await supabase
        .from('bases')
        .insert({ nome: nomeFormatado } as never)
        .select('id')
        .single()
      if (err) throw err
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] })
      setShowDrawer(false)
      setNome('')
      setEditingBase(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, nomeBase }: { id: string; nomeBase: string }) => {
      const nomeFormatado = formatBaseName(nomeBase)
      if (!nomeFormatado) throw new Error('Nome da base é obrigatório.')
      const { error: err } = await supabase
        .from('bases')
        .update({ nome: nomeFormatado } as never)
        .eq('id', id)
      if (err) throw err
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] })
      setShowDrawer(false)
      setNome('')
      setEditingBase(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: err } = await supabase.from('bases').delete().eq('id', id)
      if (err) throw err
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bases'] })
      setDeleteConfirmBase(null)
      setDeleteTypedName('')
    },
  })

  const handleNovo = () => {
    setEditingBase(null)
    setNome('')
    createMutation.reset()
    updateMutation.reset()
    setShowDrawer(true)
  }

  const handleEditar = (base: Base) => {
    setEditingBase(base)
    setNome(base.nome)
    createMutation.reset()
    updateMutation.reset()
    setShowDrawer(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const nomeTrim = nome.trim()
    if (!nomeTrim) return
    const nomeFormatado = formatBaseName(nomeTrim)
    if (!nomeFormatado) return
    if (editingBase) {
      updateMutation.mutate({ id: editingBase.id, nomeBase: nomeFormatado })
    } else {
      createMutation.mutate(nomeFormatado)
    }
  }

  const handleExcluirClick = (base: Base) => {
    setDeleteConfirmBase(base)
    setDeleteTypedName('')
  }

  const handleExcluirConfirmar = () => {
    if (!deleteConfirmBase || deleteTypedName.trim() !== deleteConfirmBase.nome) return
    deleteMutation.mutate(deleteConfirmBase.id)
  }

  const deleteNameMatches = deleteConfirmBase
    ? deleteTypedName.trim().toLowerCase() === deleteConfirmBase.nome.trim().toLowerCase()
    : false

  return (
    <AppShell
      title="Gestão de Bases"
      subtitle={authUser?.profile?.nome}
    >
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">Bases Cadastradas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Cadastre e gerencie as unidades aeroportuárias</p>
          </div>
          <Button onClick={handleNovo} className="gap-2">
            <Plus className="h-4 w-4" /> Nova Base
          </Button>
        </div>

        {/* Tabela */}
        <Card className="border-0 shadow-soft overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Carregando...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <p className="text-sm text-destructive">{(error as Error).message}</p>
              </div>
            ) : !bases?.length ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6">
                <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma base cadastrada. Use "Nova Base" para adicionar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">Nome</th>
                      <th className="text-right py-3 px-4 font-medium text-xs text-muted-foreground uppercase tracking-wider w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {bases.map((base) => (
                      <tr key={base.id} className="group hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 font-medium">{formatBaseName(base.nome)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEditar(base)}
                              className="h-8 w-8 rounded-md text-muted-foreground hover:text-primary"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleExcluirClick(base)}
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
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drawer: Cadastro/Edição */}
      <FormDrawer
        open={showDrawer}
        onClose={() => { setShowDrawer(false); setEditingBase(null); setNome('') }}
        title={editingBase ? 'Editar Base' : 'Nova Base'}
        subtitle={editingBase ? 'Altere o nome da base' : 'Cadastre uma nova unidade'}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {(createMutation.isError || updateMutation.isError) && (
            <div className="p-3 text-sm text-destructive bg-destructive/5 border border-destructive/15 rounded-lg">
              {(() => {
                const msg = (createMutation.error as Error)?.message ?? (updateMutation.error as Error)?.message ?? ''
                if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('rls')) {
                  return 'Apenas o perfil Gerente Geral pode cadastrar ou editar bases.'
                }
                return msg
              })()}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome da Base *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Nova base"
              required
            />
          </div>
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => { setShowDrawer(false); setEditingBase(null); setNome('') }} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingBase ? 'Salvar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </FormDrawer>

      {/* Modal Confirmação Exclusão */}
      {deleteConfirmBase && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md shadow-2xl">
            <CardHeader>
              <CardTitle className="text-destructive">Excluir Base</CardTitle>
              <CardDescription>
                Para confirmar, digite o nome: <strong>{formatBaseName(deleteConfirmBase.nome)}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="delete-confirm">Nome da base</Label>
                <Input
                  id="delete-confirm"
                  value={deleteTypedName}
                  onChange={(e) => setDeleteTypedName(e.target.value)}
                  placeholder={formatBaseName(deleteConfirmBase.nome)}
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 px-3 py-2 rounded-lg">
                Lançamentos ou usuários vinculados podem bloquear a exclusão.
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">{(deleteMutation.error as Error).message}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setDeleteConfirmBase(null); setDeleteTypedName('') }} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleExcluirConfirmar}
                  disabled={deleteMutation.isPending || !deleteNameMatches}
                  className="flex-1"
                >
                  {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
