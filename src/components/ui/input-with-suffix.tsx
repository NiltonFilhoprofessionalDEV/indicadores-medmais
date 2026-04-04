import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

export interface InputWithSuffixProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  suffix: string
}

const InputWithSuffix = React.forwardRef<HTMLInputElement, InputWithSuffixProps>(
  ({ className, suffix, ...props }, ref) => {
    return (
      <div className="relative">
        <Input
          type="number"
          className={cn("pr-12", className)}
          ref={ref}
          {...props}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {suffix}
        </span>
      </div>
    )
  }
)
InputWithSuffix.displayName = "InputWithSuffix"

export { InputWithSuffix }
