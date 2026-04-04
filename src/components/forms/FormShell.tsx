import { Button } from '@/components/ui/button'
import { Loader2, Save } from 'lucide-react'

interface FormShellProps {
  title: string
  description: string
  children: React.ReactNode
  onSubmit: (e: React.FormEvent) => void
  isLoading?: boolean
  readOnly?: boolean
  submitLabel?: string
}

export function FormShell({
  title,
  description,
  children,
  onSubmit,
  isLoading = false,
  readOnly = false,
  submitLabel = 'Salvar',
}: FormShellProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-0">
      {/* Header */}
      <div className="pb-4 mb-5 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>

      {/* Corpo */}
      <div className="space-y-6">
        {children}
      </div>

      {/* Footer / Submit */}
      {!readOnly && (
        <div className="pt-6 mt-6 border-t border-border">
          <Button type="submit" disabled={isLoading} className="w-full h-11">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" /> {submitLabel}
              </span>
            )}
          </Button>
        </div>
      )}
    </form>
  )
}

interface FormSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function FormSection({ title, children, className = '' }: FormSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
        {title}
      </h3>
      {children}
    </div>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, required, error, children, className = '' }: FormFieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-sm font-medium text-muted-foreground">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  )
}
