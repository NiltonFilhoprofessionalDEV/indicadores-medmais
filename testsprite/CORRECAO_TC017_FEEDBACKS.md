# ✅ Correção TC017: Tabela Feedbacks

## 🐛 Problema Identificado

**Erro:** Teste de envio de feedback falhou porque a tabela `feedbacks` não existe no banco de dados.

**Teste Afetado:** TC017 - Envio de feedback

## ✅ Solução

Script SQL completo para criar a tabela `feedbacks` com todas as políticas RLS necessárias.

## 📋 Estrutura da Tabela

### Campos

- `id` (UUID, PK) - Chave primária gerada automaticamente
- `created_at` (TIMESTAMP WITH TIME ZONE) - Data de criação (UTC)
- `user_id` (UUID, FK) - Referência ao usuário (profiles.id)
- `tipo` (TEXT) - Tipo do feedback: 'bug', 'sugestao' ou 'outros'
- `mensagem` (TEXT) - Conteúdo da mensagem
- `status` (TEXT, DEFAULT 'pendente') - Status: 'pendente', 'em_andamento', 'resolvido' ou 'fechado'

### Constraints

- `tipo` deve ser um dos valores: 'bug', 'sugestao', 'outros'
- `status` deve ser um dos valores: 'pendente', 'em_andamento', 'resolvido', 'fechado'
- `user_id` referencia `profiles.id` com `ON DELETE CASCADE`

## 🔒 Políticas RLS (Row Level Security)

### 1. INSERT - Criar Feedbacks
- **Permissão:** Usuários autenticados podem criar feedbacks
- **Política:** `WITH CHECK (true)` para todos os authenticated

### 2. SELECT - Ver Feedbacks
- **Política 1:** Usuários podem ver seus próprios feedbacks
  - Condição: `auth.uid() = user_id`
- **Política 2:** Gerentes Gerais podem ver todos os feedbacks
  - Condição: `profiles.role = 'geral'`

## 📊 Índices Criados

Para melhorar performance:

1. `idx_feedbacks_user_id` - Índice em `user_id`
2. `idx_feedbacks_status` - Índice em `status`
3. `idx_feedbacks_created_at` - Índice em `created_at` (DESC)

## 🚀 Como Executar

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o **Supabase Dashboard**
2. Vá em **SQL Editor**
3. Abra o arquivo: `supabase/SCRIPTS_EXECUTAR_AGORA/create_feedbacks_table.sql`
4. Cole o conteúdo completo
5. Clique em **Run** (ou pressione Ctrl+Enter)

### Opção 2: Via Supabase CLI

```bash
supabase db reset
# ou
supabase migration up
```

### Opção 3: Executar Migração Específica

```bash
psql -h [seu-host] -U postgres -d postgres -f supabase/migrations/008_create_feedbacks_table_fix.sql
```

## ✅ Verificação Pós-Execução

Após executar o script, verifique se a tabela foi criada:

```sql
-- Verificar se a tabela existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'feedbacks';

-- Verificar estrutura da tabela
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'feedbacks'
ORDER BY ordinal_position;

-- Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'feedbacks';
```

## 🧪 Teste Manual

Após criar a tabela, teste criando um feedback:

```sql
-- Inserir um feedback de teste (substitua o user_id)
INSERT INTO public.feedbacks (user_id, tipo, mensagem)
VALUES (
  'seu-user-id-aqui'::uuid,
  'bug',
  'Este é um teste de feedback'
);

-- Verificar se foi criado
SELECT * FROM public.feedbacks;
```

## 📝 Arquivos Criados

1. ✅ `supabase/migrations/008_create_feedbacks_table_fix.sql` - Migração completa
2. ✅ `supabase/SCRIPTS_EXECUTAR_AGORA/create_feedbacks_table.sql` - Script pronto para executar

## ⚠️ Observações Importantes

- O script usa `CREATE TABLE IF NOT EXISTS` para evitar erros se a tabela já existir
- As políticas RLS são removidas e recriadas para garantir que estão corretas
- O script é idempotente (pode ser executado múltiplas vezes sem problemas)

## 🔗 Referências

- PRD: Seção 4.B - Tabela `feedbacks`
- Teste: TC017 - Envio de feedback
- Código: `src/pages/Settings.tsx` - Aba de Feedback

## ✅ Status

**Status:** ✅ **Script SQL pronto para execução**

Execute o script no Supabase e o teste TC017 deve passar.
