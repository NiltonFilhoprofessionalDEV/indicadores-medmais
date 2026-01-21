# Sistema de Gestão de Indicadores Operacionais - Medmais

Sistema web para gestão de indicadores de 34 bases aeroportuárias.

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
