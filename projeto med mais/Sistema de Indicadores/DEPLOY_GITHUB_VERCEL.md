# Guia de Deploy: GitHub e Vercel

## Passo 1: Criar Repositório no GitHub

1. Acesse https://github.com e faça login
2. Clique no botão "+" no canto superior direito
3. Selecione "New repository"
4. Preencha:
   - **Repository name**: `indicadores-medmais` (ou outro nome de sua preferência)
   - **Description**: "Sistema de Indicadores MedMais"
   - **Visibility**: Escolha Public ou Private
   - **NÃO marque** "Initialize this repository with a README" (já temos um)
5. Clique em "Create repository"

## Passo 2: Adicionar Remote e Fazer Push

Após criar o repositório, o GitHub mostrará uma URL. Use os seguintes comandos:

```powershell
# Navegar para o diretório do projeto
cd "C:\Users\sussa\Desktop\indicadores_medmais\Projeto indicadores"

# Adicionar o remote (substitua SEU_USUARIO pelo seu usuário do GitHub)
git remote add origin https://github.com/SEU_USUARIO/indicadores-medmais.git

# Renomear branch para main (se necessário)
git branch -M main

# Fazer push do código
git push -u origin main
```

**Nota**: Se você escolheu HTTPS, o GitHub pode pedir suas credenciais. Se você tiver autenticação de dois fatores habilitada, use um Personal Access Token como senha.

## Passo 3: Deploy na Vercel

### Opção A: Via Interface Web (Recomendado)

1. Acesse https://vercel.com e faça login
2. Clique em "Add New Project"
3. Importe o repositório do GitHub que você acabou de criar
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (ou deixe em branco)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`: https://eanobeiqmpymrdbvdnnr.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbm9iZWlxbXB5bXJkYnZkbm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMTU0MTYsImV4cCI6MjA4NDU5MTQxNn0.jAQNXQr5PciPgobAH0cm0iDOxCBn43mhKIJGPAiOOXk
6. Clique em "Deploy"

### Opção B: Via Vercel CLI

```powershell
# Instalar Vercel CLI (se ainda não tiver)
npm i -g vercel

# Navegar para o diretório do projeto
cd "C:\Users\sussa\Desktop\indicadores_medmais\Projeto indicadores"

# Fazer login na Vercel
vercel login

# Fazer deploy
vercel

# Para produção
vercel --prod
```

## Próximos Passos

Após o deploy:
1. A Vercel fornecerá uma URL (ex: `https://indicadores-medmais.vercel.app`)
2. Configure um domínio personalizado (opcional) nas configurações do projeto na Vercel
3. O sistema fará deploy automático sempre que você fizer push para o repositório GitHub

## Comandos Úteis

```powershell
# Verificar status do git
git status

# Adicionar mudanças
git add .

# Fazer commit
git commit -m "Descrição das mudanças"

# Fazer push
git push origin main

# Ver logs do deploy na Vercel
vercel logs
```
