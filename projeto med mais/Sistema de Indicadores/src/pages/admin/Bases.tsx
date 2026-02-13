import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppShell } from '@/components/AppShell'
import { formatBaseName } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

type Base = Database['public']['Tables']['bases']['Row']

export function Bases() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { authUser } = useAuth()
  const [showModal, setShowModal] = useState(false)
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
      setShowModal(false)
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
      setShowModal(false)
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
    setShowModal(true)
  }

  const handleEditar = (base: Base) => {
    setEditingBase(base)
    setNome(base.nome)
    createMutation.reset()
    updateMutation.reset()
    setShowModal(true)
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
      extraActions={
        <Button onClick={() => navigate('/dashboard-gerente')} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-0">
          Voltar
        </Button>
      }
    >
      <Card className="shadow-soft dark:bg-slate-800 dark:border-slate-700 max-w-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3 pb-2">
          <CardTitle className="text-lg">Bases cadastradas</CardTitle>
          <Button onClick={handleNovo} size="sm" className="bg-[#fc4d00] hover:bg-[#e04400] text-white">
            + Nova Base
          </Button>
        </CardHeader>
        <CardContent className="pt-0 pb-4">
          {isLoading ? (
            <p className="text-muted-foreground text-sm">Carregando...</p>
          ) : error ? (
            <p className="text-destructive text-sm">{(error as Error).message}</p>
          ) : !bases?.length ? (
            <p className="text-muted-foreground text-sm">Nenhuma base. Use &quot;+ Nova Base&quot; para adicionar.</p>
          ) : (
            <div className="rounded-md border dark:border-slate-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 dark:bg-slate-800">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium">Nome</th>
                    <th className="text-right py-2 px-3 font-medium w-28">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {bases.map((base) => (
                    <tr key={base.id} className="border-t dark:border-slate-700 hover:bg-muted/20">
                      <td className="py-2 px-3">{formatBaseName(base.nome)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => handleEditar(base)} className="h-7 px-2 text-xs">
                            Editar
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleExcluirClick(base)} className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                            Excluir
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

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle>{editingBase ? 'Editar Base' : 'Nova Base'}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => { setShowModal(false); setEditingBase(null); setNome(''); }}>
                ✕
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(createMutation.isError || updateMutation.isError) && (
                  <p className="text-sm text-destructive bg-destructive/10 px-2 py-1.5 rounded">
                    {(() => {
                      const msg = (createMutation.error as Error)?.message ?? (updateMutation.error as Error)?.message ?? ''
                      if (msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('rls')) {
                        return 'Apenas o perfil Gerente Geral pode cadastrar ou editar bases. Faça login com um usuário que tenha esse perfil ou altere o perfil deste usuário para Gerente Geral na Gestão de Usuários.'
                      }
                      return msg
                    })()}
                  </p>
                )}
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Base *</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Nova base"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingBase(null); setNome(''); }}>
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="bg-[#fc4d00] hover:bg-[#e04400] text-white"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingBase ? 'Salvar' : 'Cadastrar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Confirmação Exclusão */}
      {deleteConfirmBase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Excluir base</CardTitle>
              <CardDescription>
                Para confirmar, digite o nome da base: <strong>{formatBaseName(deleteConfirmBase.nome)}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
              <p className="text-xs text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200 px-2 py-1.5 rounded">
                Lançamentos ou usuários vinculados podem bloquear a exclusão (integridade referencial).
              </p>
              {deleteMutation.isError && (
                <p className="text-sm text-destructive">{(deleteMutation.error as Error).message}</p>
              )}
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmBase(null); setDeleteTypedName(''); }}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleExcluirConfirmar}
                  disabled={deleteMutation.isPending || !deleteNameMatches}
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
