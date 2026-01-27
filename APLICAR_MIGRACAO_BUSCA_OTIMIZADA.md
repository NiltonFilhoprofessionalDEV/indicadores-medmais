# Aplicar Migration: Busca Otimizada em JSONB

Esta migration adiciona uma função PostgreSQL otimizada para buscar texto dentro do campo JSONB `conteudo`, resolvendo problemas de performance quando há muitos registros.

## O que esta migration faz?

1. **Cria função PostgreSQL `search_lancamentos_jsonb`**: Busca texto em campos específicos do JSONB (`local`, `observacoes`, `tipo_ocorrencia`, `tipo_atividade`) usando operadores nativos do PostgreSQL.

2. **Otimiza performance**: A busca agora é feita no servidor usando índices GIN, em vez de buscar todos os registros e filtrar no cliente.

## Como aplicar?

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse o Dashboard do Supabase
2. Vá em **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo do arquivo `supabase/migrations/003_add_jsonb_search_function.sql`
5. Clique em **Run** ou pressione `Ctrl+Enter`
6. Verifique se a função foi criada com sucesso

### Opção 2: Via Supabase CLI

```bash
# Certifique-se de estar logado
supabase login

# Faça o link com seu projeto
supabase link --project-ref seu-project-ref

# Aplique a migration
supabase db push
```

## Verificar se funcionou

Execute esta query no SQL Editor do Supabase:

```sql
-- Verificar se a função existe
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'search_lancamentos_jsonb';

-- Testar a função (substitua 'termo' por um termo de busca real)
SELECT * FROM search_lancamentos_jsonb('termo');
```

## Benefícios

✅ **Performance**: Busca otimizada no servidor usando índices  
✅ **Escalabilidade**: Funciona bem mesmo com milhares de registros  
✅ **Menos tráfego**: Não precisa buscar todos os registros no cliente  
✅ **Paginação**: Funciona corretamente com paginação server-side  

## Mudanças no código

- **Hook `useLancamentos`**: Agora usa RPC para buscar quando há texto de busca
- **Componente `HistoryTable`**: Adicionado debounce de 500ms e validação mínima de 2 caracteres
- **Frontend**: Busca só é executada após 500ms de inatividade e com mínimo de 2 caracteres

## Notas importantes

- A busca é case-insensitive (não diferencia maiúsculas/minúsculas)
- Busca nos campos: `local`, `observacoes`, `tipo_ocorrencia`, `tipo_atividade`
- Mínimo de 2 caracteres para buscar (validação no frontend)
- Debounce de 500ms para evitar muitas requisições
