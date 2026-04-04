# Sistema de Gestão de Indicadores Operacionais - Medmais

Sistema web para gestão de indicadores de 34 bases aeroportuárias.

## Repositório

- **GitHub:** [github.com/NiltonFilhoprofessionalDEV/indicadores-medmais](https://github.com/NiltonFilhoprofessionalDEV/indicadores-medmais)
- **Clone:** `git clone https://github.com/NiltonFilhoprofessionalDEV/indicadores-medmais.git`

Ramas remotas comuns: `main`, `desenvolvimento`, `feature/responsive-mobile`, etc.

**Sincronizar uma pasta local já existente com o remoto:** com `origin` configurado, faça o primeiro commit desta cópia (`git add -A`, `git commit`), depois `git pull origin main --allow-unrelated-histories` se o histórico local e o do GitHub forem independentes — podem surgir conflitos; em dúvida, mantenha os arquivos da raiz (`src/`, `supabase/`, `package.json`, `docs/PRD.md`) deste projeto e remova duplicatas antigas como pastas `Projeto indicadores/` ou `projeto med mais/` se não forem mais usadas.

## Stack Tecnológica

- **Frontend**: React (Vite) + TypeScript
- **UI**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Data**: TanStack Query + Supabase
- **Forms**: React Hook Form + Zod

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com:

```
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
```

### 3. Executar o projeto

```bash
npm run dev
```

## Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
│   ├── ui/        # Componentes shadcn/ui
│   └── ...
├── hooks/         # Custom hooks
├── lib/           # Utilitários e configurações
├── pages/         # Páginas da aplicação
└── App.tsx        # Componente principal com rotas
```

## Scripts

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Gera build de produção
- `npm run preview` - Preview do build de produção
- `npm run lint` - Executa o linter

## Deploy na Vercel

### Opção 1: Via CLI (Recomendado)

1. **Instalar Vercel CLI** (se ainda não tiver):
   ```bash
   npm i -g vercel
   ```

2. **Fazer login**:
   ```bash
   vercel login
   ```

3. **Configurar variáveis de ambiente**:
   - Acesse https://vercel.com/dashboard
   - Vá em Settings > Environment Variables
   - Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

4. **Fazer deploy**:
   ```bash
   vercel --prod
   ```

### Opção 2: Via Dashboard da Vercel

1. Acesse https://vercel.com
2. Clique em "Add New Project"
3. Conecte seu repositório do GitHub
4. Configure as variáveis de ambiente
5. Clique em "Deploy"

O arquivo `vercel.json` já está configurado para SPA com React Router (headers de segurança e rewrites). Variáveis `VITE_*` devem estar definidas no painel da Vercel para cada ambiente (Production / Preview).