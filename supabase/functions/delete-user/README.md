# Edge Function: delete-user

Esta função remove usuários do sistema usando a Service Role Key do Supabase, permitindo que administradores removam usuários de forma segura.

## Deploy

### Opção 1: Usando Supabase CLI

```bash
# Certifique-se de estar logado no Supabase
supabase login

# Faça o link com seu projeto
supabase link --project-ref seu-project-ref

# Faça o deploy da função
supabase functions deploy delete-user
```

### Opção 2: Usando o Dashboard do Supabase

1. Acesse o Dashboard do Supabase
2. Vá em "Edge Functions"
3. Clique em "Create a new function"
4. Nomeie como "delete-user"
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
  "userId": "uuid-do-usuario"
}
```

## Resposta de Sucesso

```json
{
  "success": true,
  "message": "Usuário removido com sucesso"
}
```

## Resposta de Erro

```json
{
  "error": "Mensagem de erro"
}
```

## Segurança

⚠️ **ATENÇÃO**: Esta função remove permanentemente:
- O perfil do usuário da tabela `profiles`
- O usuário do sistema de autenticação

Esta ação não pode ser desfeita. Certifique-se de ter uma confirmação adequada no frontend antes de chamar esta função.
