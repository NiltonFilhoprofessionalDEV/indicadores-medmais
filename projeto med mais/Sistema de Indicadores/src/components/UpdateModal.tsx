import * as React from 'react'
import { motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'

/** Converte **texto** em <strong> no conteúdo. Seguro: só renderiza texto e strong. Exportado para uso na aba Atualizações. */
export function renderTextWithBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, idx) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={`${keyPrefix}-${idx}`}>{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={`${keyPrefix}-${idx}`}>{part}</React.Fragment>
  })
}

export interface UpdateInfo {
  version: string
  data: string
  titulo: string
  novidades: string[]
}

interface UpdateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  update: UpdateInfo
}

export function UpdateModal({ open, onOpenChange, onConfirm, update }: UpdateModalProps) {
  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showClose={true}
        className="w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] sm:w-full sm:max-w-md md:max-w-lg border-primary/30 bg-background text-foreground"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 380,
            damping: 26,
          }}
          className="min-h-0 flex flex-col"
        >
          <DialogHeader className="space-y-2 sm:space-y-3 flex-shrink-0">
            <div className="flex items-center justify-center gap-2 text-[#fc4d00]">
              <span className="text-2xl sm:text-3xl" aria-hidden>
                ✨
              </span>
            </div>
            <DialogTitle className="text-lg sm:text-xl text-center text-foreground break-words pr-8">
              {renderTextWithBold(update.titulo, 'titulo')}
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground text-xs sm:text-sm">
              Versão {update.version} · {update.data}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 py-2 flex-1 min-h-0 overflow-y-auto overscroll-contain max-h-[50vh] sm:max-h-[55vh] -mx-1 px-1">
            {update.novidades.map((item, i) => (
              <motion.li
                key={item}
                className="flex items-start gap-2 text-sm text-foreground"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/20 text-green-600 dark:bg-green-500/30 dark:text-green-400 mt-0.5"
                  aria-hidden
                >
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
                <span className="break-words min-w-0 whitespace-pre-line">
                  {renderTextWithBold(item, `nov-${i}`)}
                </span>
              </motion.li>
            ))}
          </ul>
          <DialogFooter className="mt-4 flex-shrink-0 sm:justify-center">
            <Button
              type="button"
              onClick={handleConfirm}
              className="bg-[#fc4d00] hover:bg-[#e04400] text-white shadow-orange-sm w-full sm:w-auto min-h-11 touch-manipulation"
            >
              Entendi, vamos lá!
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
