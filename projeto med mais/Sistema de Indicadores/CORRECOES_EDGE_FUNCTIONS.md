# 🔧 CORREÇÕES DE CÓDIGO - Edge Functions

## 1. Correção: create-user (Validação de Role)

**Arquivo:** `supabase/functions/create-user/index.ts`

**Alteração Completa:**

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

    // ✅ CORREÇÃO: Criar cliente com anon key para validar token do usuário
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

    // Validação básica
    if (!email || !password || !nome || !role) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: email, password, nome, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validar se chefe precisa de base e equipe
    if (role === 'chefe' && (!base_id || !equipe_id)) {
      return new Response(
        JSON.stringify({ error: 'Chefe de Equipe precisa de base_id e equipe_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar cliente com Service Role Key (acesso admin)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Criar usuário no auth
    const { data: authData, error: authError: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createAuthError) {
      return new Response(
        JSON.stringify({ error: createAuthError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Inserir perfil na tabela profiles
    const { error: profileInsertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        nome,
        role,
        base_id: role === 'chefe' ? base_id : null,
        equipe_id: role === 'chefe' ? equipe_id : null,
      })

    if (profileInsertError) {
      // Se der erro ao criar perfil, deleta o usuário criado
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return new Response(
        JSON.stringify({ error: profileInsertError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, userId: authData.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
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

---

## 2. Correção: update-user (Validação de Role)

**Arquivo:** `supabase/functions/update-user/index.ts`

**Alteração (adicionar no início da função, antes de processar):**

```typescript
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

    // ✅ CORREÇÃO: Criar cliente com anon key para validar token do usuário
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
        JSON.stringify({ error: 'Acesso negado. Apenas Gerente Geral pode editar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Agora sim, processar atualização do usuário...
    const { id, nome, role, base_id, equipe_id, email, password } = await req.json()

    // ... resto do código permanece igual ...
```

---

## 3. Variáveis de Ambiente Necessárias

**Arquivo:** `.env` ou configuração do Supabase

Certifique-se de que as Edge Functions tenham acesso a:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (✅ NOVO - necessário para validar token)
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Checklist de Implementação

- [ ] Atualizar `supabase/functions/create-user/index.ts` com validação de role
- [ ] Atualizar `supabase/functions/update-user/index.ts` com validação de role
- [ ] Verificar se `SUPABASE_ANON_KEY` está configurada nas variáveis de ambiente das Edge Functions
- [ ] Testar chamada de `create-user` sem token (deve retornar 401)
- [ ] Testar chamada de `create-user` com token de Chefe (deve retornar 403)
- [ ] Testar chamada de `create-user` com token de Gerente Geral (deve funcionar)
- [ ] Testar chamada de `update-user` sem token (deve retornar 401)
- [ ] Testar chamada de `update-user` com token de Chefe (deve retornar 403)
- [ ] Testar chamada de `update-user` com token de Gerente Geral (deve funcionar)

---

## Notas Importantes

1. **SUPABASE_ANON_KEY**: Esta variável é necessária para validar o token JWT do usuário. Ela deve estar disponível nas Edge Functions.

2. **Performance**: A validação adiciona uma query extra (`SELECT role FROM profiles`), mas é necessária para segurança. Considere cachear o resultado se necessário.

3. **Backward Compatibility**: Após aplicar essas correções, usuários não-autorizados não conseguirão mais chamar as Edge Functions. Isso é esperado e desejado.
