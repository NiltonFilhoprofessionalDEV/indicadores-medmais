import { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FormDrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  subtitle?: string
  children: React.ReactNode
  className?: string
}

export function FormDrawer({ open, onClose, title, subtitle, children, className }: FormDrawerProps) {
  const [visible, setVisible] = useState(false)
  const [animating, setAnimating] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setVisible(true)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setAnimating(true))
      })
    } else {
      setAnimating(false)
      const timer = setTimeout(() => setVisible(false), 300)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = ''
      }
    }
  }, [open, handleKeyDown])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div
        className={cn(
          'absolute inset-0 bg-black/30 transition-opacity duration-300',
          animating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'absolute top-0 right-0 h-full w-full sm:w-[70%] md:w-[60%] lg:w-[55%] sm:max-w-4xl bg-card border-l border-border shadow-2xl',
          'flex flex-col transition-transform duration-300 ease-drawer',
          animating ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0 bg-card">
          <div className="min-w-0 flex-1">
            {title && <h2 className="text-lg font-semibold text-foreground truncate">{title}</h2>}
            {subtitle && <p className="text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground shrink-0 ml-3"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 sm:px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  )
}
