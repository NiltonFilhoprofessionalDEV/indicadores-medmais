# 🔧 CORREÇÕES DE CÓDIGO - Frontend

## 1. Correção: useLancamento Hook (Remover Parâmetros Opcionais)

**Arquivo:** `src/hooks/useLancamento.ts`

**Alteração:**
```typescript
// ❌ ANTES:
interface SaveLancamentoParams {
  dataReferencia: string
  indicadorId: string
  conteudo: Record<string, unknown>
  baseId?: string  // ❌ REMOVER
  equipeId?: string // ❌ REMOVER
}

// ✅ DEPOIS:
interface SaveLancamentoParams {
  dataReferencia: string
  indicadorId: string
  conteudo: Record<string, unknown>
  // baseId e equipeId removidos - sempre usar do perfil
}

// ❌ ANTES:
const finalBaseId = baseId || authUser.profile.base_id
const finalEquipeId = equipeId || authUser.profile.equipe_id

// ✅ DEPOIS:
const finalBaseId = authUser.profile.base_id
const finalEquipeId = authUser.profile.equipe_id

if (!finalBaseId || !finalEquipeId) {
  throw new Error('Base e Equipe são obrigatórios no perfil do usuário')
}
```

---

## 2. Correção: Dashboard Analytics (Limitar Busca)

**Arquivo:** `src/pages/DashboardAnalytics.tsx`

**Alteração:**
```typescript
// ✅ ADICIONAR import:
import { subMonths } from 'date-fns'

// ❌ ANTES:
const { data: todosLancamentosResult, isLoading: isLoadingTodos } = useQuery({
  queryKey: ['lancamentos-todos', userBaseId, equipeId, dataInicio, dataFim, view],
  enabled: view === 'visao_geral' || view === 'atividades_acessorias',
  queryFn: async () => {
    let query = supabase
      .from('lancamentos')
      .select('*') // ❌ Traz todos os campos
      .order('data_referencia', { ascending: false })
    // ... sem limite de período
  },
})

// ✅ DEPOIS:
const { data: todosLancamentosResult, isLoading: isLoadingTodos } = useQuery({
  queryKey: ['lancamentos-todos', userBaseId, equipeId, dataInicio, dataFim, view],
  enabled: view === 'visao_geral' || view === 'atividades_acessorias',
  queryFn: async () => {
    // ✅ Limitar a 12 meses atrás
    const dataMinima = format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    
    let query = supabase
      .from('lancamentos')
      .select('id, data_referencia, base_id, equipe_id, indicador_id, conteudo') // ✅ Apenas campos necessários
      .gte('data_referencia', dataMinima) // ✅ Limitar período
      .order('data_referencia', { ascending: false })
    
    // ... resto do código
  },
})
```

---

## 3. Correção: Sanitização XSS (Novo Arquivo)

**Arquivo:** `src/lib/sanitize.ts` (CRIAR NOVO)

```typescript
/**
 * Sanitização de strings para prevenir XSS
 * Remove tags HTML e caracteres perigosos
 */

export function sanitizeString(input: string | undefined | null): string {
  if (!input) return ''
  
  // Remove tags HTML
  const withoutTags = input.replace(/<[^>]*>/g, '')
  
  // Remove caracteres de controle e caracteres perigosos
  const sanitized = withoutTags
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove caracteres de controle
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers (onclick, onerror, etc)
    .trim()
  
  return sanitized
}

/**
 * Sanitiza objeto recursivamente (útil para JSONB)
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}
```

**Arquivo:** `src/hooks/useLancamento.ts` (ATUALIZAR)

```typescript
// ✅ ADICIONAR import:
import { sanitizeObject } from '@/lib/sanitize'

// ✅ ALTERAR:
const lancamentoData: LancamentoInsert = {
  data_referencia: normalizedDate,
  base_id: finalBaseId,
  equipe_id: finalEquipeId,
  user_id: authUser.user.id,
  indicador_id: indicadorId,
  conteudo: sanitizeObject(conteudo) as Database['public']['Tables']['lancamentos']['Row']['conteudo'], // ✅ Sanitizar
}
```

---

## 4. Atualizar Chamadas de useLancamento (Remover baseId/equipeId)

**Arquivos:** Todos os formulários em `src/components/forms/*.tsx`

**Alteração:**
```typescript
// ❌ ANTES:
await saveLancamento({
  dataReferencia: dataReferencia,
  indicadorId: indicadorId,
  conteudo: formData,
  baseId: finalBaseId,  // ❌ REMOVER
  equipeId: finalEquipeId, // ❌ REMOVER
})

// ✅ DEPOIS:
await saveLancamento({
  dataReferencia: dataReferencia,
  indicadorId: indicadorId,
  conteudo: formData,
  // baseId e equipeId removidos - sempre usar do perfil
})
```

**Arquivos a atualizar:**
- `src/components/forms/TAFForm.tsx`
- `src/components/forms/ProvaTeoricaForm.tsx`
- `src/components/forms/HorasTreinamentoForm.tsx`
- `src/components/forms/TempoTPEPRForm.tsx`
- `src/components/forms/TempoRespostaForm.tsx`
- `src/components/forms/OcorrenciaAeronauticaForm.tsx`
- `src/components/forms/OcorrenciaNaoAeronauticaForm.tsx`
- `src/components/forms/AtividadesAcessoriasForm.tsx`
- `src/components/forms/InspecaoViaturasForm.tsx`
- `src/components/forms/ControleEPIForm.tsx`
- `src/components/forms/ControleEstoqueForm.tsx`
- `src/components/forms/ControleTrocasForm.tsx`
- `src/components/forms/VerificacaoTPForm.tsx`
- `src/components/forms/HigienizacaoTPForm.tsx`

---

## Checklist de Implementação

- [ ] Criar arquivo `src/lib/sanitize.ts`
- [ ] Atualizar `src/hooks/useLancamento.ts` (remover baseId/equipeId, adicionar sanitização)
- [ ] Atualizar `src/pages/DashboardAnalytics.tsx` (limitar busca a 12 meses)
- [ ] Atualizar todos os 14 formulários (remover baseId/equipeId das chamadas)
- [ ] Testar inserção de lançamento (deve usar base_id do perfil automaticamente)
- [ ] Testar sanitização (inserir `<script>` em textarea e verificar se é removido)
