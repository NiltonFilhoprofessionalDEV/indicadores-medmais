# Guia de Deploy na Vercel

## Pré-requisitos

1. Conta na Vercel (https://vercel.com)
2. Projeto no GitHub (já configurado ✅)
3. Variáveis de ambiente do Supabase

## Passo a Passo

### 1. Login na Vercel CLI

```bash
vercel login
```

Isso abrirá o navegador para autenticação. Após autenticar, você estará logado.

### 2. Configurar Variáveis de Ambiente

Antes do deploy, configure as variáveis de ambiente na Vercel:

**Opção A: Via Dashboard da Vercel (Recomendado)**
1. Acesse https://vercel.com
2. Vá em Settings > Environment Variables
3. Adicione:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave anônima do Supabase

**Opção B: Via CLI**
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

### 3. Fazer o Deploy

**Deploy de Produção:**
```bash
vercel --prod
```

**Deploy de Preview (para testar):**
```bash
vercel
```

### 4. Deploy Automático via GitHub

Após o primeiro deploy, a Vercel se conecta automaticamente ao GitHub e faz deploy automático a cada push na branch principal.

## Configuração do Projeto

O arquivo `vercel.json` já está configurado com:
- ✅ Build command: `npm run build`
- ✅ Output directory: `dist`
- ✅ Rewrites para SPA (React Router)
- ✅ Cache headers para assets

## Verificação

Após o deploy, verifique:
1. ✅ A aplicação carrega corretamente
2. ✅ As rotas funcionam (React Router)
3. ✅ A conexão com Supabase está funcionando
4. ✅ Login e autenticação funcionam

## Troubleshooting

**Erro de autenticação:**
- Execute `vercel login` novamente

**Erro de build:**
- Verifique se todas as dependências estão no `package.json`
- Execute `npm run build` localmente para testar

**Erro de variáveis de ambiente:**
- Verifique se as variáveis estão configuradas no dashboard da Vercel
- Certifique-se de que estão disponíveis para "Production"
