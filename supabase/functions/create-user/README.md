# Edge Function: create-user

Esta função cria usuários no sistema usando a Service Role Key do Supabase, permitindo que administradores criem usuários sem perder a sessão atual.

## Deploy

### Opção 1: Usando Supabase CLI

```bash
# Certifique-se de estar logado no Supabase
supabase login

# Faça o link com seu projeto
supabase link --project-ref seu-project-ref

# Faça o deploy da função
supabase functions deploy create-user
```

### Opção 2: Usando o Dashboard do Supabase

1. Acesse o Dashboard do Supabase
2. Vá em "Edge Functions"
3. Clique em "Create a new function"
4. Nomeie como "create-user"
5. Cole o conteúdo do arquivo `index.ts`
6. Salve e faça o deploy

## Variáveis de Ambiente

A função usa as seguintes variáveis de ambiente (já configuradas automaticamente pelo Supabase):
- `SUPABASE_URL` - URL do seu projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (acesso admin)

## Uso

A função recebe um payload JSON:

```json
{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "nome": "Nome do Usuário",
  "role": "chefe",
  "base_id": "uuid-da-base",
  "equipe_id": "uuid-da-equipe"
}
```

Para Gerente Geral, `base_id` e `equipe_id` devem ser `null` ou omitidos.

## Resposta de Sucesso

```json
{
  "success": true,
  "userId": "uuid-do-usuario-criado"
}
```

## Resposta de Erro

```json
{
  "error": "Mensagem de erro"
}
```
