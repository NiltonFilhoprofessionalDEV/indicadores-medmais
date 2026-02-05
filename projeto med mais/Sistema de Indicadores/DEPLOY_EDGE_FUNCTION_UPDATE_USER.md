# Deploy da Edge Function: update-user

Esta função permite que o Gerente Geral edite usuários existentes no sistema.

## Pré-requisitos

- Supabase CLI instalado
- Projeto Supabase linkado

## Deploy via Supabase CLI

```bash
# Certifique-se de estar logado
supabase login

# Faça o link com seu projeto (se ainda não fez)
supabase link --project-ref seu-project-ref

# Faça o deploy da função
supabase functions deploy update-user
```

## Deploy via Dashboard do Supabase

1. Acesse o Dashboard do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Edge Functions** (menu lateral)
4. Clique em **Create a new function**
5. Nomeie como **update-user**
6. Cole o conteúdo do arquivo `supabase/functions/update-user/index.ts`
7. Clique em **Deploy**

## Verificar se funcionou

Após o deploy, você pode testar a função:

1. Vá em **Edge Functions** > **update-user**
2. Clique em **Invoke function**
3. Use este payload de teste (substitua os valores pelos reais):

```json
{
  "id": "uuid-do-usuario",
  "nome": "Nome Atualizado",
  "role": "chefe",
  "base_id": "uuid-da-base",
  "equipe_id": "uuid-da-equipe"
}
```

## Variáveis de Ambiente

A função usa automaticamente as seguintes variáveis (já configuradas pelo Supabase):
- `SUPABASE_URL` - URL do seu projeto
- `SUPABASE_SERVICE_ROLE_KEY` - Chave de serviço (acesso admin)

## Funcionalidades

A função `update-user` permite:
- ✅ Atualizar nome do usuário
- ✅ Alterar role (geral/chefe)
- ✅ Mudar base_id e equipe_id
- ✅ Atualizar email (opcional)
- ✅ Atualizar senha (opcional)

**Importante**: Se email ou password não forem fornecidos (ou estiverem vazios), apenas o perfil é atualizado, mantendo as credenciais atuais.

## Uso no Frontend

A função é chamada automaticamente quando o Gerente Geral clica em "Editar" na tela de Gestão de Usuários e salva as alterações.

## Troubleshooting

Se a função não estiver funcionando:

1. Verifique se o deploy foi concluído com sucesso
2. Verifique os logs em **Edge Functions** > **update-user** > **Logs**
3. Certifique-se de que as variáveis de ambiente estão configuradas
4. Verifique se o usuário que está sendo editado existe no sistema
