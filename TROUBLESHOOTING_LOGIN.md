# Troubleshooting - Problemas de Login na Vercel

## Problemas Comuns e Soluções

### 1. Variáveis de Ambiente Não Configuradas

**Sintoma:** Erro ao fazer login, mensagem genérica de erro.

**Solução:**
1. Acesse: https://vercel.com/niltonsouzas-projects/indicadores-medmais/settings/environment-variables
2. Verifique se as seguintes variáveis estão configuradas para **Production**:
   - `VITE_SUPABASE_URL` = sua URL completa do Supabase (ex: https://xxxxx.supabase.co)
   - `VITE_SUPABASE_ANON_KEY` = sua chave anônima do Supabase

3. **IMPORTANTE:** Após adicionar/alterar variáveis, faça um novo deploy:
   ```bash
   vercel --prod
   ```

### 2. Verificar se as Variáveis Estão Sendo Carregadas

Abra o console do navegador (F12) na aplicação em produção e verifique:
- Se aparecer mensagens de erro sobre variáveis não configuradas
- Se a URL do Supabase está correta

### 3. Verificar Configuração do Supabase

1. **URL do Supabase:**
   - Deve começar com `https://`
   - Formato: `https://xxxxx.supabase.co`
   - Não deve ter barra no final

2. **Chave Anônima (anon key):**
   - Deve ser a chave `anon` ou `public`, não a `service_role`
   - Pode ser encontrada em: Supabase Dashboard > Settings > API

### 4. Verificar CORS no Supabase

1. Acesse o Supabase Dashboard
2. Vá em Settings > API
3. Verifique se a URL da Vercel está na lista de URLs permitidas
4. Adicione: `https://indicadores-medmais-*.vercel.app` ou a URL específica

### 5. Verificar se o Usuário Existe

1. Acesse o Supabase Dashboard
2. Vá em Authentication > Users
3. Verifique se o usuário existe e está ativo
4. Se necessário, crie um novo usuário ou redefina a senha

### 6. Verificar Logs da Vercel

1. Acesse: https://vercel.com/niltonsouzas-projects/indicadores-medmais
2. Vá em "Deployments"
3. Clique no último deploy
4. Veja os logs para identificar erros

### 7. Testar Localmente

Para verificar se o problema é específico da Vercel:

```bash
# Configure as variáveis localmente
# Crie um arquivo .env.local com:
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave

# Execute localmente
npm run dev
```

Se funcionar localmente mas não na Vercel, o problema é nas variáveis de ambiente da Vercel.

## Comandos Úteis

```bash
# Ver variáveis de ambiente configuradas na Vercel
vercel env ls

# Adicionar variável de ambiente
vercel env add VITE_SUPABASE_URL production

# Fazer novo deploy após alterar variáveis
vercel --prod
```
