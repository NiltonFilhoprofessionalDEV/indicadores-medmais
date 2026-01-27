# Aplicar Migration: Base ADMINISTRATIVO

## Objetivo
Adicionar a base 'ADMINISTRATIVO' ao banco de dados para organizar usuários com perfil de Gerente Geral.

## Arquivo de Migration
`supabase/migrations/004_add_base_administrativo.sql`

## Como Aplicar

### Opção 1: Via Dashboard do Supabase (Recomendado)

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)
4. Clique em **New Query**
5. Cole o conteúdo do arquivo `supabase/migrations/004_add_base_administrativo.sql`:

```sql
-- ============================================
-- MIGRATION: Adicionar Base ADMINISTRATIVO
-- ============================================
-- Esta migration adiciona a base 'ADMINISTRATIVO' para organizar
-- usuários com perfil de Gerente Geral.

INSERT INTO public.bases (nome)
VALUES ('ADMINISTRATIVO')
ON CONFLICT (nome) DO NOTHING;

COMMENT ON TABLE public.bases IS 'Catálogo das bases aeroportuárias + base ADMINISTRATIVO para Gerentes Gerais';
```

6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Verifique se a mensagem de sucesso apareceu

### Opção 2: Via Supabase CLI

```bash
# Navegue até a pasta do projeto
cd indicadores_medmais

# Aplique a migration
supabase db push
```

## Verificação

Após aplicar a migration, verifique se a base foi criada:

1. No Dashboard do Supabase, vá em **Table Editor**
2. Selecione a tabela `bases`
3. Verifique se existe uma linha com `nome = 'ADMINISTRATIVO'`

Ou execute uma query SQL:

```sql
SELECT * FROM public.bases WHERE nome = 'ADMINISTRATIVO';
```

## Importante

- A migration usa `ON CONFLICT (nome) DO NOTHING`, então é seguro executá-la múltiplas vezes
- Se a base já existir, nada acontecerá
- A base 'ADMINISTRATIVO' aparecerá automaticamente no filtro de usuários após a migration ser aplicada
