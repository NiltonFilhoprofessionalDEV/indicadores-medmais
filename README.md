# Indicadores Medmais

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

Aplicação web para gestão de indicadores operacionais em múltiplas bases aeroportuárias, com controle de acesso por perfil e isolamento de dados no banco (Row Level Security no PostgreSQL via Supabase).

**Código-fonte:** [github.com/NiltonFilhoprofessionalDEV/indicadores-medmais](https://github.com/NiltonFilhoprofessionalDEV/indicadores-medmais)

## Sumário

1. [Sobre o projeto](#sobre-o-projeto)
2. [Stack tecnológica](#stack-tecnológica)
3. [Requisitos](#requisitos)
4. [Instalação e execução](#instalação-e-execução)
5. [Configuração](#configuração)
6. [Scripts NPM](#scripts-npm)
7. [Backend (Supabase)](#backend-supabase)
8. [Organização do código](#organização-do-código)
9. [Publicação](#publicação)
10. [Documentação complementar](#documentação-complementar)
11. [Licença](#licença)

## Sobre o projeto

O sistema cobre cadastro e acompanhamento de indicadores por base e equipe, conferência de lançamentos, painéis analíticos, gestão de usuários e colaboradores, exportação de dados e canais de suporte. As regras de negócio e de segurança estão descritas no documento de produto em `docs/PRD.md`.

A branch `main` concentra a versão estável utilizada como referência de integração.

## Stack tecnológica

- **Interface:** React 18, TypeScript, Vite
- **Estilo e componentes:** Tailwind CSS, shadcn/ui (Radix)
- **Dados remotos:** Supabase (Auth, API REST/Realtime, Postgres)
- **Cache e requisições:** TanStack Query
- **Formulários e validação:** React Hook Form, Zod
- **Visualização:** Recharts
- **Hospedagem do frontend:** Vercel (`vercel.json`: SPA, rewrites, headers de segurança)

## Requisitos

- Node.js 18 ou superior (recomendado: 20 LTS)
- npm (conforme `package-lock.json`)
- Instância Supabase com migrations aplicadas e Edge Functions publicadas, quando o fluxo administrativo exigir

## Instalação e execução

```bash
git clone https://github.com/NiltonFilhoprofessionalDEV/indicadores-medmais.git
cd indicadores-medmais
npm ci
```

Para desenvolvimento:

```bash
npm run dev
```

Servidor local padrão do Vite: `http://localhost:5173`.

Build de produção:

```bash
npm run build
npm run preview
```

## Configuração

Crie o arquivo `.env` na raiz (pode partir de `.env.example`):

| Variável | Obrigatório | Uso |
|----------|-------------|-----|
| `VITE_SUPABASE_URL` | Sim | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sim | Chave pública anon (exposta ao cliente; proteção via RLS) |

A chave **service role** não deve ser referenciada em variáveis `VITE_*` nem versionada no repositório. Utilize-a apenas em contexto server-side (CLI, funções edge, scripts locais isolados).

## Scripts NPM

| Script | Função |
|--------|--------|
| `dev` | Servidor de desenvolvimento |
| `build` | Verificação TypeScript e build de produção |
| `preview` | Servir artefatos de `dist` |
| `lint` | Análise estática com ESLint |
| `security-audit` | Rotinas de auditoria de segurança (`scripts/security-audit.ts`) |
| `deploy:functions` | Deploy das funções `create-user` e `update-user` (Supabase CLI) |
| `deploy:create-user` | Deploy apenas de `create-user` |
| `deploy:update-user` | Deploy apenas de `update-user` |

Os scripts de teste com Cypress pressupõem configuração E2E adequada no ambiente local.

## Backend (Supabase)

- **Migrações:** diretório `supabase/migrations/` — aplicar em ordem no ambiente alvo.
- **Edge Functions:** diretório `supabase/functions/` (incluindo `create-user`, `update-user`, `delete-user`, `get-profile`).
- **Referência de esquema:** `supabase/schema.sql` (o estado efetivo do banco deve refletir migrations e ajustes operacionais no painel).

## Organização do código

```
docs/PRD.md          Especificação funcional e técnica
public/              Assets estáticos
scripts/             Utilitários de automação e auditoria
src/
  components/        Componentes de UI, formulários e gráficos
  contexts/          Contextos (autenticação, tema)
  hooks/             Hooks de dados e comportamento
  lib/               Cliente Supabase, tipos, utilitários
  pages/             Páginas e rotas
supabase/
  functions/         Edge Functions
  migrations/        SQL versionado
```

## Publicação

**Vercel (recomendado):** importar o repositório, framework Vite, comando de build `npm run build`, diretório de saída `dist`. Definir `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nos ambientes Production e Preview.

**CLI:** `vercel login` seguido de `vercel --prod` (com CLI instalada globalmente).

## Documentação complementar

- Especificação detalhada: [`docs/PRD.md`](docs/PRD.md)
- Variáveis adicionais (quando aplicável): [`.env.example`](.env.example)
- Não commitar arquivos `.env` nem credenciais

## Licença

Distribuído sob a licença MIT. Consulte o arquivo [`LICENSE`](LICENSE).
