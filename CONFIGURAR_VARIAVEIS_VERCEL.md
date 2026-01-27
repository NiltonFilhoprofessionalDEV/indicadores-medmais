# Como Configurar Variáveis de Ambiente na Vercel

## ⚠️ PROBLEMA IDENTIFICADO

As variáveis de ambiente **NÃO estão configuradas** na Vercel. Isso é necessário para o login funcionar.

## Solução: Configurar via Dashboard da Vercel

### Passo 1: Acessar as Configurações

1. Acesse: https://vercel.com/niltonsouzas-projects/indicadores-medmais/settings/environment-variables
2. Ou acesse: https://vercel.com/dashboard → Seu Projeto → Settings → Environment Variables

### Passo 2: Adicionar Variáveis

Adicione as seguintes variáveis para **Production** (e opcionalmente para Preview e Development):

#### Variável 1: VITE_SUPABASE_URL
- **Nome:** `VITE_SUPABASE_URL`
- **Valor:** Sua URL do Supabase (ex: `https://xxxxx.supabase.co`)
- **Ambientes:** Marque pelo menos **Production**

#### Variável 2: VITE_SUPABASE_ANON_KEY
- **Nome:** `VITE_SUPABASE_ANON_KEY`
- **Valor:** Sua chave anônima do Supabase
- **Ambientes:** Marque pelo menos **Production**

### Passo 3: Onde Encontrar os Valores

1. **Acesse o Supabase Dashboard:** https://supabase.com/dashboard
2. **Selecione seu projeto**
3. **Vá em Settings → API**
4. Você encontrará:
   - **Project URL** → Use para `VITE_SUPABASE_URL`
   - **anon public** key → Use para `VITE_SUPABASE_ANON_KEY`

### Passo 4: Fazer Novo Deploy

Após adicionar as variáveis, você precisa fazer um novo deploy:

**Opção 1: Via Dashboard**
- Vá em Deployments
- Clique nos três pontos do último deploy
- Selecione "Redeploy"

**Opção 2: Via CLI**
```bash
vercel --prod
```

## ⚠️ IMPORTANTE

- As variáveis só estarão disponíveis **após um novo deploy**
- Certifique-se de que a URL do Supabase começa com `https://`
- Use a chave **anon/public**, NÃO a service_role

## Verificar se Funcionou

Após o deploy:
1. Acesse sua aplicação na Vercel
2. Abra o console do navegador (F12)
3. Verifique se não há erros sobre variáveis não configuradas
4. Tente fazer login novamente

## Comandos Úteis (Alternativa via CLI)

Se preferir usar a CLI:

```bash
# Adicionar VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_URL production
# (Cole a URL quando solicitado)

# Adicionar VITE_SUPABASE_ANON_KEY
vercel env add VITE_SUPABASE_ANON_KEY production
# (Cole a chave quando solicitado)

# Verificar variáveis configuradas
vercel env ls

# Fazer novo deploy
vercel --prod
```
