# 🔍 Troubleshooting - Problema de Login

## Possíveis Causas

### 1. Variáveis de Ambiente Não Configuradas na Vercel

**Sintoma:** Página fica carregando ou mostra erro "Variáveis de ambiente não configuradas"

**Solução:**
1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Verifique se existem:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Se não existirem, adicione-as
6. Faça um novo deploy

### 2. Timeout na Conexão com Supabase

**Sintoma:** Página fica carregando por muito tempo

**Solução:**
- As otimizações já implementadas reduziram o timeout para 3-5 segundos
- Se ainda demorar, pode ser problema de rede ou Supabase lento
- Verifique o console do navegador (F12) para ver erros específicos

### 3. Erro de CORS ou Content Security Policy

**Sintoma:** Erro no console sobre CORS ou CSP

**Solução:**
- Verifique se a URL do Supabase está correta na Vercel
- Verifique se não há bloqueios de firewall

### 4. Problema com Lazy Loading

**Sintoma:** Erro ao tentar navegar após login

**Solução:**
- Limpe o cache do navegador (Ctrl+Shift+R)
- Verifique o console para erros específicos

## 🔧 Como Diagnosticar

### Passo 1: Abrir Console do Navegador

1. Abra o sistema na Vercel
2. Pressione **F12** (ou Ctrl+Shift+I)
3. Vá na aba **Console**
4. Tente fazer login
5. Anote qualquer erro que aparecer

### Passo 2: Verificar Network

1. Na aba **Network** do DevTools
2. Tente fazer login
3. Procure por requisições para `supabase.co`
4. Veja se há erros (status 4xx ou 5xx)

### Passo 3: Verificar Variáveis de Ambiente

No console do navegador, execute:

```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'Não configurada')
```

Se aparecer `undefined`, as variáveis não estão configuradas na Vercel.

## 🚨 Erros Comuns e Soluções

### Erro: "Invalid login credentials"
- **Causa:** Email ou senha incorretos
- **Solução:** Verifique suas credenciais

### Erro: "Email not confirmed"
- **Causa:** Email não foi confirmado no Supabase
- **Solução:** Verifique sua caixa de entrada ou confirme manualmente no Supabase Dashboard

### Erro: "Network error" ou "Failed to fetch"
- **Causa:** Problema de conexão ou Supabase offline
- **Solução:** Verifique sua internet e o status do Supabase

### Erro: "Timeout"
- **Causa:** Supabase demorando muito para responder
- **Solução:** As otimizações já reduziram o timeout. Se persistir, pode ser problema do Supabase.

## 📋 Checklist de Verificação

- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Deploy feito após configurar variáveis
- [ ] Console do navegador sem erros críticos
- [ ] Internet funcionando
- [ ] Supabase Dashboard acessível
- [ ] Credenciais de login corretas

## 🆘 Se Nada Funcionar

1. **Tire um print** do erro no console
2. **Anote** a mensagem de erro exata
3. **Verifique** se as variáveis de ambiente estão corretas na Vercel
4. **Me envie** essas informações para eu ajudar melhor

## 💡 Dica Rápida

Se o problema for apenas lentidão:
- As otimizações já implementadas devem melhorar
- Após o deploy, limpe o cache (Ctrl+Shift+R)
- Teste em modo anônimo para garantir que não é cache
