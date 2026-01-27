# 🔍 Diagnóstico de Problema de Login

## ✅ Variáveis de Ambiente Verificadas

As variáveis de ambiente **ESTÃO configuradas** na Vercel:
- ✅ `VITE_SUPABASE_URL` (Production)
- ✅ `VITE_SUPABASE_ANON_KEY` (Production)

## 🔧 Como Diagnosticar o Problema

### Passo 1: Abrir o Console do Navegador

1. Acesse: `https://indicadores-medmais.vercel.app`
2. Pressione **F12** (ou Ctrl+Shift+I)
3. Vá na aba **Console**
4. Tente fazer login
5. **Copie TODOS os logs** que aparecerem (especialmente os que começam com 🔍, ✅, ❌, ⚠️)

### Passo 2: Verificar os Logs Esperados

Quando você tentar fazer login, você deve ver logs como:

```
🔍 Debug Login: { hasUrl: true, hasKey: true, urlPrefix: "https://..." }
✅ Tentando fazer login para: seu@email.com
```

**Se aparecer:**
- `hasUrl: false` ou `hasKey: false` → Variáveis não estão sendo carregadas
- `❌ Erro de autenticação:` → Veja a mensagem de erro específica
- `✅ Login bem-sucedido!` → Login funcionou, mas pode ter problema no redirecionamento

### Passo 3: Verificar a Aba Network

1. Na aba **Network** do DevTools
2. Tente fazer login
3. Procure por requisições para `supabase.co`
4. Clique na requisição e veja:
   - **Status Code**: Deve ser 200 (sucesso) ou 400 (erro de credenciais)
   - **Response**: Veja o que o Supabase retornou

### Passo 4: Verificar Variáveis de Ambiente no Navegador

No console do navegador, execute:

```javascript
console.log('URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'Não configurada')
```

**Se aparecer `undefined`**: As variáveis não estão sendo carregadas no build.

## 🚨 Problemas Comuns e Soluções

### Problema 1: "Variáveis de ambiente não configuradas"
**Solução:**
1. Vá em Vercel Dashboard → Settings → Environment Variables
2. Verifique se as variáveis estão marcadas para **Production**
3. Faça um novo deploy

### Problema 2: "Invalid login credentials"
**Solução:**
- Verifique se o email e senha estão corretos
- Verifique se o usuário existe no Supabase

### Problema 3: "Failed to fetch" ou "Network error"
**Solução:**
- Verifique se o Supabase está online
- Verifique se a URL do Supabase está correta
- Pode ser problema de CORS (verifique no Network tab)

### Problema 4: Login funciona mas não redireciona
**Solução:**
- Veja os logs no console
- Verifique se há erros de lazy loading
- Limpe o cache do navegador (Ctrl+Shift+R)

## 📋 Checklist de Verificação

- [ ] Console do navegador aberto (F12)
- [ ] Logs de debug visíveis ao tentar login
- [ ] Variáveis de ambiente verificadas no console
- [ ] Aba Network verificada para erros
- [ ] Cache do navegador limpo
- [ ] Testado em modo anônimo/incógnito

## 🆘 Enviar Informações para Diagnóstico

Se o problema persistir, envie:

1. **Screenshot do Console** com todos os logs
2. **Screenshot da aba Network** mostrando a requisição ao Supabase
3. **Mensagem de erro exata** que aparece na tela
4. **Status Code** da requisição ao Supabase (da aba Network)

Com essas informações, posso identificar exatamente o que está acontecendo!
