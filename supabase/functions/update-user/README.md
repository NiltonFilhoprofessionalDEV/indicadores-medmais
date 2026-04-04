# Edge Function: update-user

Esta função atualiza usuários existentes no sistema usando a Service Role Key do Supabase, permitindo que administradores alterem dados de usuários sem perder a sessão atual.

## Deploy

### Opção 1: Usando Supabase CLI

```bash
# Certifique-se de estar logado no Supabase
supabase login

# Faça o link com seu projeto
supabase link --project-ref seu-project-ref

# Faça o deploy da função
supabase functions deploy update-user
```

### Opção 2: Usando o Dashboard do Supabase

1. Acesse o Dashboard do Supabase
2. Vá em "Edge Functions"
3. Clique em "Create a new function"
4. Nomeie como "update-user"
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
  "id": "uuid-do-usuario",
  "nome": "Nome do Usuário",
  "role": "chefe",
  "base_id": "uuid-da-base",
  "equipe_id": "uuid-da-equipe",
  "email": "novo@email.com",
  "password": "novaSenha123"
}
```

**Campos obrigatórios:**
- `id`: UUID do usuário a ser atualizado
- `nome`: Nome completo do usuário
- `role`: Role do usuário ('geral' ou 'chefe')

**Campos opcionais:**
- `base_id`: UUID da base (obrigatório se role = 'chefe')
- `equipe_id`: UUID da equipe (obrigatório se role = 'chefe')
- `email`: Novo email (opcional, só atualiza se fornecido e diferente do atual)
- `password`: Nova senha (opcional, só atualiza se fornecido)

## Resposta de Sucesso

```json
{
  "success": true,
  "userId": "uuid-do-usuario"
}
```

## Resposta de Erro

```json
{
  "error": "Mensagem de erro"
}
```

## Segurança

⚠️ **ATENÇÃO**: Esta função permite alterar dados de usuários, incluindo credenciais de login. Use apenas em contextos administrativos seguros.
