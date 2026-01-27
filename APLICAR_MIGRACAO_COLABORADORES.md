# 🔧 Como Aplicar a Migração de Políticas RLS para Colaboradores

## ⚠️ PROBLEMA
Ao tentar criar colaboradores em lote, o erro aparece:
```
"new row violates row-level security policy for table "colaboradores""
```

## ✅ SOLUÇÃO
Aplicar a migração `002_add_colaboradores_write_policies.sql` que adiciona políticas RLS de INSERT, UPDATE e DELETE para role 'geral'.

## 📋 Passo a Passo

### Opção 1: Via Dashboard do Supabase (Mais Fácil)

1. **Acesse o Dashboard do Supabase:**
   - Vá para: https://supabase.com/dashboard
   - Faça login e selecione seu projeto

2. **Abra o SQL Editor:**
   - No menu lateral, clique em **"SQL Editor"**
   - Clique em **"New query"**

3. **Cole o SQL da migração:**
   - Abra o arquivo `supabase/migrations/002_add_colaboradores_write_policies.sql`
   - Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
   - Cole no SQL Editor (Ctrl+V)

4. **Execute:**
   - Clique no botão **"Run"** (ou pressione Ctrl+Enter)
   - Aguarde a confirmação de sucesso

5. **Verifique:**
   - Você deve ver uma mensagem de sucesso
   - As políticas foram criadas

### Opção 2: Via Supabase CLI (Avançado)

Se você tem o Supabase CLI configurado:

```bash
# Aplicar a migração específica
supabase db push

# Ou aplicar todas as migrações pendentes
supabase migration up
```

## ✅ Verificação

Após aplicar a migração:

1. **Teste novamente:**
   - Volte para a página de Colaboradores
   - Tente criar colaboradores em lote novamente
   - O erro não deve mais aparecer

2. **Verifique as políticas no Dashboard:**
   - Vá em **Authentication** > **Policies**
   - Procure por `colaboradores_insert_geral`, `colaboradores_update_geral`, `colaboradores_delete_geral`
   - Elas devem estar listadas

## 📝 O que a migração faz?

A migração cria 3 políticas RLS:

1. **colaboradores_insert_geral**: Permite INSERT para usuários com role = 'geral'
2. **colaboradores_update_geral**: Permite UPDATE para usuários com role = 'geral'
3. **colaboradores_delete_geral**: Permite DELETE para usuários com role = 'geral'

Isso permite que o Gerente Geral (role 'geral') possa criar, editar e excluir colaboradores diretamente pelo frontend.

## 🐛 Se ainda houver erro

1. **Verifique se você está logado como Gerente Geral:**
   - O usuário deve ter `role = 'geral'` na tabela `profiles`

2. **Verifique se as políticas foram criadas:**
   - No SQL Editor, execute:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'colaboradores';
   ```
   - Você deve ver as 4 políticas (1 SELECT + 3 WRITE)

3. **Verifique os logs:**
   - No Dashboard do Supabase > Logs > Postgres Logs
   - Procure por erros relacionados a RLS
