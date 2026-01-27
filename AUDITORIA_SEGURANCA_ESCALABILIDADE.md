# 🔒 RELATÓRIO DE AUDITORIA: Segurança e Escalabilidade
**Data:** 2025-01-27  
**Sistema:** Indicadores Operacionais MedMais  
**Auditor:** Engenheiro de Segurança (SecOps) & DBA Sênior

---

## 📋 SUMÁRIO EXECUTIVO

### Problemas Críticos Identificados:
1. ⚠️ **VULNERABILIDADE RLS (CRÍTICA)**: Policy INSERT do Chefe permite injetar `base_id` diferente do perfil
2. ⚠️ **EDGE FUNCTIONS SEM AUTENTICAÇÃO**: `create-user` e `update-user` não validam se o chamador é Gerente Geral
3. ⚠️ **ÍNDICES FALTANDO**: Índices compostos para queries frequentes não existem
4. ⚠️ **QUERIES INEFICIENTES**: Dashboard Analytics traz TODOS os dados sem paginação
5. ⚠️ **XSS POTENCIAL**: Zod valida mas não sanitiza strings de Textarea

### Impacto Estimado:
- **Segurança**: ALTO RISCO - Chefe pode inserir dados em outras bases
- **Performance**: MÉDIO RISCO - Queries lentas com milhões de registros
- **Integridade**: BAIXO RISCO - XSS mitigado pelo React, mas não sanitizado

---

## 1. 🔐 AUDITORIA DE SEGURANÇA (RLS & Auth)

### 1.1. VULNERABILIDADE CRÍTICA: Policy INSERT do Chefe

**Problema Identificado:**
A policy `lancamentos_insert_chefe` verifica se `profiles.base_id = lancamentos.base_id` e `profiles.equipe_id = lancamentos.equipe_id`, mas **NÃO valida se o `base_id` enviado no payload corresponde ao `base_id` do perfil do usuário autenticado**.

**Cenário de Ataque:**
```typescript
// Chefe de Equipe da Base "GOIANIA" poderia fazer:
const payload = {
  base_id: "UUID-DA-BASE-BRASILIA", // ⚠️ INJEÇÃO!
  equipe_id: "UUID-EQUIPE-ALFA",
  data_referencia: "2025-01-27",
  indicador_id: "...",
  conteudo: {...}
}
// A policy verifica apenas se o chefe TEM base_id e equipe_id,
// mas não valida se o base_id do payload = base_id do perfil
```

**Solução:**
Adicionar CHECK constraint na policy que força o `base_id` do payload a ser igual ao `base_id` do perfil.

### 1.2. Edge Functions Sem Validação de Role

**Problema Identificado:**
As Edge Functions `create-user` e `update-user` usam `SERVICE_ROLE_KEY`, mas **não validam se o usuário que chamou a função é realmente um Gerente Geral**.

**Cenário de Ataque:**
Qualquer usuário autenticado poderia chamar essas funções diretamente se descobrir a URL da Edge Function.

**Solução:**
Validar o token JWT do chamador e verificar se `role === 'geral'` antes de executar.

---

## 2. 🚀 ESCALABILIDADE DE BANCO DE DADOS

### 2.1. Índices Faltando

**Problema:**
Queries frequentes fazem filtros compostos (ex: `base_id + data_referencia`, `indicador_id + data_referencia`) que não têm índices compostos.

**Impacto:**
Com milhões de registros, essas queries farão Full Table Scan.

**Solução:**
Criar índices compostos B-Tree para combinações frequentes.

### 2.2. Índice GIN no JSONB

**Status:** ✅ JÁ EXISTE (`idx_lancamentos_conteudo`)

**Otimização Sugerida:**
Criar índice GIN específico para campos JSONB frequentemente buscados (ex: `conteudo->>'local'`, `conteudo->>'observacoes'`).

---

## 3. ⚡ OTIMIZAÇÃO DO FRONTEND

### 3.1. Dashboard Analytics Trazendo Todos os Dados

**Problema:**
Em `DashboardAnalytics.tsx`, as views `visao_geral` e `atividades_acessorias` buscam **TODOS** os lançamentos sem paginação.

**Impacto:**
Com milhões de registros, isso pode travar o navegador.

**Solução:**
Implementar agregação no servidor ou limitar a busca a períodos específicos.

### 3.2. Select Sem Filtro de Campos

**Problema:**
Queries usam `select('*')` trazendo todos os campos, incluindo `conteudo` JSONB completo.

**Solução:**
Usar `select()` com campos específicos quando possível.

---

## 4. 🛡️ INTEGRIDADE DE DADOS (XSS)

### 4.1. Zod Não Sanitiza Strings

**Problema:**
Zod valida formato mas não sanitiza conteúdo malicioso em Textareas.

**Exemplo:**
```typescript
observacoes: z.string().optional() // ✅ Valida, mas ❌ não sanitiza
// Usuário pode inserir: <script>alert('XSS')</script>
```

**Mitigação Atual:**
React escapa HTML por padrão, mas dados podem ser salvos no banco e exibidos em outros contextos.

**Solução:**
Adicionar sanitização com `DOMPurify` ou função customizada antes de salvar.

---

## 📝 SCRIPTS SQL DE CORREÇÃO

### Script 1: Correção de RLS Policy (CRÍTICO)

```sql
-- ============================================
-- CORREÇÃO CRÍTICA: Policy INSERT do Chefe
-- ============================================
-- Remove a policy vulnerável
DROP POLICY IF EXISTS "lancamentos_insert_chefe" ON public.lancamentos;

-- Cria nova policy com validação explícita de base_id
CREATE POLICY "lancamentos_insert_chefe" ON public.lancamentos
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'chefe'
            -- VALIDAÇÃO CRÍTICA: base_id do payload DEVE ser igual ao base_id do perfil
            AND profiles.base_id = lancamentos.base_id
            AND profiles.equipe_id = lancamentos.equipe_id
            -- GARANTIA ADICIONAL: user_id do payload DEVE ser o próprio usuário
            AND profiles.id = lancamentos.user_id
        )
    );

-- Comentário explicativo
COMMENT ON POLICY "lancamentos_insert_chefe" ON public.lancamentos IS 
    'Chefe de Equipe pode inserir apenas para sua própria base e equipe. Valida explicitamente que base_id do payload = base_id do perfil.';
```

### Script 2: Índices Compostos para Performance

```sql
-- ============================================
-- ÍNDICES COMPOSTOS PARA QUERIES FREQUENTES
-- ============================================

-- Índice composto: base_id + data_referencia (usado em Analytics e History)
CREATE INDEX IF NOT EXISTS idx_lancamentos_base_data 
ON public.lancamentos(base_id, data_referencia DESC);

-- Índice composto: indicador_id + data_referencia (usado em Analytics por indicador)
CREATE INDEX IF NOT EXISTS idx_lancamentos_indicador_data 
ON public.lancamentos(indicador_id, data_referencia DESC);

-- Índice composto: base_id + indicador_id + data_referencia (usado em Analytics filtrado)
CREATE INDEX IF NOT EXISTS idx_lancamentos_base_indicador_data 
ON public.lancamentos(base_id, indicador_id, data_referencia DESC);

-- Índice composto: equipe_id + data_referencia (usado em History do Chefe)
CREATE INDEX IF NOT EXISTS idx_lancamentos_equipe_data 
ON public.lancamentos(equipe_id, data_referencia DESC);

-- Índice composto: user_id + data_referencia (usado em Compliance/Aderência)
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_data 
ON public.lancamentos(user_id, data_referencia DESC);

-- Índice GIN específico para campos JSONB frequentemente buscados
-- (otimiza busca por 'local' e 'observacoes' dentro do JSONB)
CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_local 
ON public.lancamentos USING GIN ((conteudo->>'local'));

CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_observacoes 
ON public.lancamentos USING GIN ((conteudo->>'observacoes'));

-- Índice GIN para busca full-text em JSONB (se usar função RPC search_lancamentos_jsonb)
-- Nota: Requer extensão pg_trgm se ainda não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_lancamentos_conteudo_gin_trgm 
ON public.lancamentos USING GIN (conteudo gin_trgm_ops);

-- Comentários explicativos
COMMENT ON INDEX idx_lancamentos_base_data IS 
    'Índice composto para queries filtradas por base e data (usado em Analytics e History)';
COMMENT ON INDEX idx_lancamentos_indicador_data IS 
    'Índice composto para queries filtradas por indicador e data (usado em Analytics por indicador)';
COMMENT ON INDEX idx_lancamentos_base_indicador_data IS 
    'Índice composto para queries filtradas por base, indicador e data (otimização máxima)';
```

### Script 3: Análise de Performance (Opcional - Para Monitoramento)

```sql
-- ============================================
-- QUERIES DE ANÁLISE DE PERFORMANCE
-- ============================================

-- Verificar tamanho da tabela lancamentos
SELECT 
    pg_size_pretty(pg_total_relation_size('public.lancamentos')) AS tamanho_total,
    pg_size_pretty(pg_relation_size('public.lancamentos')) AS tamanho_tabela,
    pg_size_pretty(pg_indexes_size('public.lancamentos')) AS tamanho_indices,
    (SELECT COUNT(*) FROM public.lancamentos) AS total_registros;

-- Verificar uso de índices (requer pg_stat_statements)
-- SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'public' AND tablename = 'lancamentos';

-- Verificar queries lentas (requer extensão pg_stat_statements)
-- SELECT query, calls, total_time, mean_time 
-- FROM pg_stat_statements 
-- WHERE query LIKE '%lancamentos%' 
-- ORDER BY mean_time DESC LIMIT 10;
```

---

## 💻 CORREÇÕES DE CÓDIGO

### Correção 1: Edge Function create-user (Validação de Role)

**Arquivo:** `supabase/functions/create-user/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ✅ CORREÇÃO: Validar token do chamador antes de processar
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Configuração do Supabase não encontrada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente com anon key para validar token do usuário
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // ✅ CORREÇÃO: Verificar se o usuário autenticado é Gerente Geral
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar perfil do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil do usuário não encontrado' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ✅ CORREÇÃO: Validar se é Gerente Geral
    if (profile.role !== 'geral') {
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas Gerente Geral pode criar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Agora sim, processar criação do usuário...
    const { email, password, nome, role, base_id, equipe_id } = await req.json()

    // ... resto do código permanece igual ...
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // ... resto do código permanece igual ...
  } catch (error: any) {
    const errorMessage = error?.message || error?.toString() || 'Erro desconhecido'
    console.error('Erro na Edge Function:', error)
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Correção 2: Edge Function update-user (Validação de Role)

**Arquivo:** `supabase/functions/update-user/index.ts`

```typescript
// ✅ ADICIONAR NO INÍCIO DA FUNÇÃO (antes de processar):
const authHeader = req.headers.get('Authorization')
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: 'Token de autenticação não fornecido' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: { headers: { Authorization: authHeader } },
})

const { data: { user }, error: authError } = await supabaseClient.auth.getUser()

if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Usuário não autenticado' }),
    { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

const { data: profile } = await supabaseClient
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

if (!profile || profile.role !== 'geral') {
  return new Response(
    JSON.stringify({ error: 'Acesso negado. Apenas Gerente Geral pode editar usuários.' }),
    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ... resto do código permanece igual ...
```

### Correção 3: useLancamento Hook (Garantir base_id do Perfil)

**Arquivo:** `src/hooks/useLancamento.ts`

```typescript
// ✅ CORREÇÃO: Remover parâmetros opcionais baseId e equipeId
// Sempre usar do perfil do usuário autenticado
export function useLancamento() {
  const queryClient = useQueryClient()
  const { authUser } = useAuth()

  const saveMutation = useMutation({
    mutationFn: async ({ dataReferencia, indicadorId, conteudo }: SaveLancamentoParams) => {
      if (!authUser?.user?.id) {
        throw new Error('Usuário não autenticado')
      }

      if (!authUser.profile) {
        throw new Error('Perfil do usuário não encontrado')
      }

      // ✅ CORREÇÃO: SEMPRE usar base_id e equipe_id do perfil (não aceitar do payload)
      const finalBaseId = authUser.profile.base_id
      const finalEquipeId = authUser.profile.equipe_id

      if (!finalBaseId || !finalEquipeId) {
        throw new Error('Base e Equipe são obrigatórios no perfil do usuário')
      }

      // ... resto do código permanece igual ...
    },
  })

  return {
    saveLancamento: saveMutation.mutateAsync,
    isLoading: saveMutation.isPending,
    error: saveMutation.error,
  }
}

// ✅ REMOVER baseId e equipeId da interface SaveLancamentoParams
interface SaveLancamentoParams {
  dataReferencia: string
  indicadorId: string
  conteudo: Record<string, unknown>
  // ❌ REMOVIDO: baseId?: string
  // ❌ REMOVIDO: equipeId?: string
}
```

### Correção 4: Dashboard Analytics (Limitar Busca de Dados)

**Arquivo:** `src/pages/DashboardAnalytics.tsx`

```typescript
// ✅ CORREÇÃO: Limitar busca de "visao_geral" e "atividades_acessorias" a períodos específicos
// Em vez de buscar TODOS os dados, buscar apenas últimos 12 meses

const { data: todosLancamentosResult, isLoading: isLoadingTodos } = useQuery({
  queryKey: ['lancamentos-todos', userBaseId, equipeId, dataInicio, dataFim, view],
  enabled: view === 'visao_geral' || view === 'atividades_acessorias',
  queryFn: async () => {
    // ✅ CORREÇÃO: Calcular data mínima (12 meses atrás)
    const dataMinima = format(subMonths(new Date(), 12), 'yyyy-MM-dd')
    
    let query = supabase
      .from('lancamentos')
      .select('id, data_referencia, base_id, equipe_id, indicador_id, conteudo') // ✅ Selecionar apenas campos necessários
      .gte('data_referencia', dataMinima) // ✅ Limitar a 12 meses
      .order('data_referencia', { ascending: false })

    // ... resto do código permanece igual ...
  },
})

// ✅ ADICIONAR import:
import { subMonths } from 'date-fns'
```

### Correção 5: Sanitização de Strings (XSS Protection)

**Arquivo:** `src/lib/sanitize.ts` (NOVO)

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
import { sanitizeObject } from '@/lib/sanitize'

// ✅ CORREÇÃO: Sanitizar conteúdo antes de salvar
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

## 📊 CHECKLIST DE IMPLEMENTAÇÃO

### Prioridade CRÍTICA (Implementar Imediatamente):
- [ ] Aplicar Script SQL 1 (Correção de RLS Policy)
- [ ] Aplicar Correção 1 (Edge Function create-user)
- [ ] Aplicar Correção 2 (Edge Function update-user)
- [ ] Aplicar Correção 3 (useLancamento Hook)

### Prioridade ALTA (Implementar em 1 semana):
- [ ] Aplicar Script SQL 2 (Índices Compostos)
- [ ] Aplicar Correção 4 (Dashboard Analytics)
- [ ] Aplicar Correção 5 (Sanitização XSS)

### Prioridade MÉDIA (Implementar em 1 mês):
- [ ] Aplicar Script SQL 3 (Análise de Performance)
- [ ] Monitorar uso de índices
- [ ] Otimizar queries lentas identificadas

---

## 🔍 TESTES DE VALIDAÇÃO

### Teste 1: Validação de RLS Policy
```sql
-- Como Chefe de Equipe, tentar inserir com base_id diferente
-- DEVE FALHAR com erro de policy violation
INSERT INTO public.lancamentos (base_id, equipe_id, user_id, indicador_id, data_referencia, conteudo)
VALUES (
  'UUID-BASE-DIFERENTE', -- ⚠️ Tentativa de injeção
  'UUID-EQUIPE-ALFA',
  auth.uid(),
  'UUID-INDICADOR',
  '2025-01-27',
  '{}'::jsonb
);
-- Esperado: ERRO de policy violation
```

### Teste 2: Validação de Edge Function
```bash
# Tentar chamar create-user sem token de Gerente Geral
curl -X POST https://[PROJECT].supabase.co/functions/v1/create-user \
  -H "Authorization: Bearer [TOKEN-CHEFE]" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","nome":"Test","role":"chefe"}'
# Esperado: 403 Forbidden
```

### Teste 3: Validação de Performance
```sql
-- Verificar se índices estão sendo usados
EXPLAIN ANALYZE
SELECT * FROM public.lancamentos
WHERE base_id = '...' AND data_referencia >= '2024-01-01'
ORDER BY data_referencia DESC
LIMIT 20;
-- Esperado: "Index Scan using idx_lancamentos_base_data"
```

---

## 📈 MÉTRICAS DE SUCESSO

### Segurança:
- ✅ 0 violações de RLS policy após correção
- ✅ 0 chamadas não autorizadas às Edge Functions
- ✅ 0 casos de XSS reportados

### Performance:
- ✅ Queries com filtros compostos < 100ms (com índices)
- ✅ Dashboard Analytics carrega em < 2s (com limitação de período)
- ✅ Uso de memória do navegador < 500MB (com select específico)

---

## 📚 REFERÊNCIAS

- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

---

**FIM DO RELATÓRIO**
