# Como Fazer Deploy da Edge Function create-user

## ⚠️ IMPORTANTE
A Edge Function `create-user` é **obrigatória** para cadastrar novos usuários no sistema. Sem ela, não será possível criar usuários.

## Opção 1: Usando Supabase CLI (Recomendado)

### 1. Instalar Supabase CLI
```bash
npm install -g supabase
```

### 2. Fazer login
```bash
supabase login
```

### 3. Linkar com seu projeto
```bash
supabase link --project-ref seu-project-ref
```
*Você encontra o `project-ref` no Dashboard do Supabase > Settings > General*

### 4. Fazer deploy
```bash
supabase functions deploy create-user
```

## Opção 2: Usando o Dashboard do Supabase

### 1. Acesse o Dashboard
- Vá para: https://supabase.com/dashboard
- Selecione seu projeto

### 2. Navegue até Edge Functions
- No menu lateral, clique em **"Edge Functions"**
- Clique em **"Create a new function"**

### 3. Configure a função
- **Nome da função**: `create-user`
- **Código**: Cole o conteúdo do arquivo `supabase/functions/create-user/index.ts`

### 4. Salve e faça deploy
- Clique em **"Deploy"**

## Verificar se está funcionando

Após o deploy, tente cadastrar um usuário novamente. Se ainda houver erro, verifique:

1. **Variáveis de ambiente**: A Edge Function usa automaticamente:
   - `SUPABASE_URL` (já configurado)
   - `SUPABASE_SERVICE_ROLE_KEY` (já configurado)

2. **Logs**: No Dashboard do Supabase > Edge Functions > create-user > Logs

3. **Permissões**: Certifique-se de que a função tem acesso ao banco de dados

## Solução de Problemas

### Erro: "Function not found"
- A função não foi deployada ou o nome está incorreto
- Verifique se o nome é exatamente `create-user` (com hífen)

### Erro: "Failed to send request"
- Verifique sua conexão com a internet
- Verifique se o Supabase está acessível
- Verifique os logs da Edge Function no Dashboard

### Erro: "Configuração do Supabase não encontrada"
- As variáveis de ambiente não estão configuradas na Edge Function
- Isso geralmente é automático, mas verifique no Dashboard > Edge Functions > Settings
