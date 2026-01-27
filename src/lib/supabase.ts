import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''

// Validação mais amigável
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variáveis de ambiente do Supabase não configuradas!')
  console.error('Crie um arquivo .env na raiz do projeto com:')
  console.error('VITE_SUPABASE_URL=sua_url')
  console.error('VITE_SUPABASE_ANON_KEY=sua_chave')
}

// Validação de formato básico
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  console.error('⚠️ VITE_SUPABASE_URL deve começar com http:// ou https://')
}

// Cria cliente com configuração otimizada
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: !!supabaseUrl && !!supabaseAnonKey,
      persistSession: !!supabaseUrl && !!supabaseAnonKey,
      detectSessionInUrl: true,
      // Timeout para evitar travamentos
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      storageKey: 'supabase.auth.token',
    },
    global: {
      // Timeout de 10 segundos para requisições
      fetch: (url, options = {}) => {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 segundos
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId)
        })
      },
    },
  }
)
