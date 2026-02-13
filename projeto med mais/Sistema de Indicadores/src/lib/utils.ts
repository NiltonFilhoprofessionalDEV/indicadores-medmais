import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Primeira letra maiúscula e o resto minúsculo (para nomes de bases, etc.). */
export function formatBaseName(name: string): string {
  const t = name.trim().toLowerCase()
  if (!t) return ''
  return t.charAt(0).toUpperCase() + t.slice(1)
}
