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

/** Primeira letra de cada palavra maiúscula e demais minúsculas (para nomes de equipes). */
export function formatEquipeName(name: string): string {
  const t = name.trim().toLowerCase()
  if (!t) return ''
  return t.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Lê JSON de uma Response sem lançar "Unexpected end of JSON input" em corpo vazio
 * (ex.: 204, 502 sem body, HTML de erro).
 */
export async function parseResponseJson<T = Record<string, unknown>>(response: Response): Promise<T | null> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as T
  } catch {
    const preview = trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed
    throw new Error(`Resposta não é JSON válido (HTTP ${response.status}): ${preview}`)
  }
}
