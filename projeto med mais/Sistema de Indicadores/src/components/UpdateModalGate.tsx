import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UpdateModal, type UpdateInfo } from '@/components/UpdateModal'

const STORAGE_KEY = 'medmais_last_version_seen'

export function UpdateModalGate() {
  const { authUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)

  useEffect(() => {
    if (!authUser?.user?.id) return

    let cancelled = false
    const run = async () => {
      try {
        const data = await import('@/data/updates.json')
        const info = data.default as UpdateInfo
        if (cancelled || !info?.version) return
        const seen = localStorage.getItem(STORAGE_KEY)
        if (seen !== info.version) {
          setUpdate(info)
          setOpen(true)
        }
      } catch {
        // Arquivo não encontrado ou JSON inválido: não exibe modal
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [authUser?.user?.id])

  const handleConfirm = () => {
    if (update?.version) {
      localStorage.setItem(STORAGE_KEY, update.version)
    }
  }

  if (!update) return null

  return (
    <UpdateModal
      open={open}
      onOpenChange={setOpen}
      onConfirm={handleConfirm}
      update={update}
    />
  )
}
