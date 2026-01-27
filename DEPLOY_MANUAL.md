# 🚀 Deploy Manual da Edge Function - Guia Rápido

## ⚡ Método Mais Rápido: Dashboard do Supabase

### Passo 1: Acesse o Dashboard
1. Vá para: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione seu projeto

### Passo 2: Criar a Edge Function
1. No menu lateral, clique em **"Edge Functions"**
2. Clique no botão **"Create a new function"** (ou "Criar nova função")
3. **Nome da função**: Digite exatamente `create-user` (com hífen, sem espaços)

### Passo 3: Copiar o Código
1. Abra o arquivo `supabase/functions/create-user/index.ts` no seu editor
2. Selecione TODO o conteúdo (Ctrl+A)
3. Copie (Ctrl+C)

### Passo 4: Colar no Dashboard
1. No editor de código do Dashboard, cole o código copiado (Ctrl+V)
2. Clique em **"Deploy"** (ou "Fazer deploy")

### Passo 5: Verificar
1. Aguarde alguns segundos
2. Você verá uma mensagem de sucesso
3. A função aparecerá na lista de Edge Functions

## ✅ Pronto!

Agora você pode testar cadastrando um usuário na aplicação.

---

## 🔧 Método Alternativo: Via CLI (Avançado)

Se preferir usar a linha de comando:

### 1. Obter Access Token
1. Acesse: https://supabase.com/dashboard/account/tokens
2. Clique em "Generate new token"
3. Copie o token gerado

### 2. Obter Project Reference ID
1. No Dashboard do Supabase
2. Vá em **Settings** > **General**
3. Copie o **Reference ID** (algo como: `eanobeiqmpymrdbvdnnr`)

### 3. Executar o Deploy

**No PowerShell:**
```powershell
$env:SUPABASE_ACCESS_TOKEN='seu-token-aqui'
$env:SUPABASE_PROJECT_REF='seu-project-ref-aqui'
npx supabase functions deploy create-user --project-ref $env:SUPABASE_PROJECT_REF
```

**Ou use o script:**
```powershell
# Configure as variáveis primeiro
$env:SUPABASE_ACCESS_TOKEN='seu-token'
$env:SUPABASE_PROJECT_REF='seu-project-ref'

# Execute o script
.\deploy-edge-function.ps1
```

---

## 🐛 Solução de Problemas

### Erro: "Function not found"
- Verifique se o nome da função é exatamente `create-user`
- Certifique-se de que o deploy foi concluído

### Erro: "Failed to send request"
- Verifique sua conexão com a internet
- Verifique se o Supabase está acessível
- Tente novamente após alguns segundos

### A função não aparece na lista
- Recarregue a página do Dashboard
- Verifique se você está no projeto correto

---

## 📝 Notas Importantes

- A Edge Function usa automaticamente as variáveis de ambiente do Supabase
- Não é necessário configurar `SUPABASE_URL` ou `SUPABASE_SERVICE_ROLE_KEY` manualmente
- O deploy pode levar alguns segundos para ficar ativo
