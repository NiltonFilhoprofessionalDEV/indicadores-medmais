# Informações de Backend para TestSprite

## Edge Functions do Supabase

Este projeto possui 3 Edge Functions que funcionam como APIs de backend:

### 1. create-user
**Endpoint:** `POST /functions/v1/create-user`
**Descrição:** Cria um novo usuário no sistema (auth + profile)
**Parâmetros:**
- `email` (string, obrigatório)
- `password` (string, obrigatório)
- `nome` (string, obrigatório)
- `role` (string, obrigatório) - 'geral' ou 'chefe'
- `base_id` (string, opcional) - obrigatório se role='chefe'
- `equipe_id` (string, opcional) - obrigatório se role='chefe'

**Resposta de Sucesso:**
```json
{
  "success": true,
  "userId": "uuid-do-usuario"
}
```

**Resposta de Erro:**
```json
{
  "error": "mensagem de erro"
}
```

### 2. update-user
**Endpoint:** `POST /functions/v1/update-user`
**Descrição:** Atualiza um usuário existente (profile + opcionalmente auth)
**Parâmetros:**
- `id` (string, obrigatório) - UUID do usuário
- `nome` (string, obrigatório)
- `role` (string, obrigatório) - 'geral' ou 'chefe'
- `base_id` (string, opcional) - obrigatório se role='chefe'
- `equipe_id` (string, opcional) - obrigatório se role='chefe'
- `email` (string, opcional) - para atualizar email
- `password` (string, opcional) - para atualizar senha

**Resposta de Sucesso:**
```json
{
  "success": true,
  "userId": "uuid-do-usuario"
}
```

### 3. delete-user
**Endpoint:** `POST /functions/v1/delete-user`
**Descrição:** Remove um usuário do sistema (auth + profile + lançamentos via CASCADE)
**Parâmetros:**
- `userId` (string, obrigatório) - UUID do usuário

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Usuário removido com sucesso"
}
```

## Autenticação

Todas as Edge Functions requerem:
- Header: `Authorization: Bearer [SUPABASE_ANON_KEY]` ou `apikey: [SUPABASE_ANON_KEY]`
- Header: `Content-Type: application/json`

## CORS

Todas as funções suportam CORS com:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type`

## Validações Importantes

### create-user
- Campos obrigatórios: email, password, nome, role
- Se role='chefe': base_id e equipe_id são obrigatórios
- Email deve ser único
- Se falhar ao criar profile, o usuário auth é deletado automaticamente

### update-user
- Campos obrigatórios: id, nome, role
- Se role='chefe': base_id e equipe_id são obrigatórios
- Usuário deve existir (404 se não encontrado)
- Email só atualiza se diferente do atual

### delete-user
- userId é obrigatório
- Deleta usuário do auth (profile e lançamentos são deletados via CASCADE)

## Casos de Teste Sugeridos

### create-user
1. ✅ Criar usuário Gerente Geral com sucesso
2. ✅ Criar usuário Chefe de Equipe com sucesso (com base_id e equipe_id)
3. ❌ Falhar ao criar sem campos obrigatórios
4. ❌ Falhar ao criar Chefe sem base_id
5. ❌ Falhar ao criar Chefe sem equipe_id
6. ❌ Falhar ao criar com email duplicado
7. ❌ Falhar com role inválido

### update-user
1. ✅ Atualizar nome e role com sucesso
2. ✅ Atualizar Chefe mudando base_id e equipe_id
3. ✅ Atualizar email com sucesso
4. ✅ Atualizar senha com sucesso
5. ❌ Falhar ao atualizar usuário inexistente
6. ❌ Falhar sem campos obrigatórios
7. ❌ Falhar ao atualizar Chefe sem base_id

### delete-user
1. ✅ Deletar usuário com sucesso
2. ❌ Falhar sem userId
3. ❌ Falhar com userId inválido
4. ❌ Falhar com usuário inexistente

## Variáveis de Ambiente Necessárias

As Edge Functions precisam de:
- `SUPABASE_URL` - URL do projeto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service Role Key para acesso admin

## Estrutura de Arquivos

```
supabase/functions/
├── create-user/
│   ├── index.ts
│   └── README.md
├── update-user/
│   ├── index.ts
│   └── README.md
└── delete-user/
    ├── index.ts
    └── README.md
```

## Tecnologia

- **Runtime:** Deno
- **Framework:** Supabase Edge Functions
- **HTTP Server:** Deno std/http
- **Cliente Supabase:** @supabase/supabase-js@2
