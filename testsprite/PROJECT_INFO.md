# Informações do Projeto para TestSprite MCP

## Informações Básicas

**Nome do Projeto:** Sistema de Gestão de Indicadores Operacionais MedMais

**Caminho Absoluto:**
```
C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
```

**Tipo:** Frontend (React + Vite + TypeScript)

**Porta de Desenvolvimento:** 5173

**URL Base:** `http://localhost:5173`

## Stack Tecnológica

- **Framework:** React 18.3.1
- **Build Tool:** Vite 5.4.2
- **Linguagem:** TypeScript 5.5.4
- **Roteamento:** React Router DOM 6.26.0
- **Autenticação:** Supabase Auth
- **Estado:** TanStack Query 5.59.0
- **Formulários:** React Hook Form + Zod
- **UI:** Tailwind CSS + shadcn/ui
- **Gráficos:** Recharts 2.12.7

## Estrutura de Rotas

### Públicas
- `/login` - Página de login

### Protegidas (requer autenticação)

#### Gerente Geral (`role: 'geral'`)
- `/dashboard-gerente` - Dashboard principal
- `/dashboard-analytics` - Dashboard Analytics
- `/gestao-usuarios` - Gestão de Usuários
- `/colaboradores` - Gestão de Efetivo
- `/aderencia` - Monitoramento de Aderência
- `/settings` - Configurações

#### Chefe de Equipe (`role: 'chefe'`)
- `/dashboard-chefe` - Dashboard principal
- `/dashboard-analytics` - Dashboard Analytics (somente leitura)
- `/settings` - Configurações

## Funcionalidades Principais

### 1. Autenticação
- Login com email/senha via Supabase
- Redirecionamento baseado em role
- Proteção de rotas

### 2. Dashboards
- **Dashboard Gerente:** Cards de navegação, visão geral
- **Dashboard Chefe:** Cards de navegação, visão da equipe
- **Dashboard Analytics:** Múltiplas views de analytics com filtros

### 3. Analytics Views
- Visão Geral (Cockpit Executivo)
- Ocorrência Aeronáutica
- Ocorrência Não Aeronáutica
- Atividades Acessórias
- Teste de Aptidão Física (TAF)
- Prova Teórica
- Horas de Treinamento
- Exercício TP/EPR
- Tempo de Resposta
- Inspeção de Viaturas
- Logística (Estoque, EPI, Trocas)

### 4. Gestão
- Gestão de Usuários (apenas Gerente)
- Gestão de Efetivo/Colaboradores (apenas Gerente)
- Monitoramento de Aderência (apenas Gerente)

### 5. Configurações
- Perfil do usuário
- Alteração de senha
- Feedback

## Elementos de UI Importantes

### Seletores Comuns
- Inputs: `input[type="email"]`, `input[type="password"]`, `input[type="date"]`, `input[type="month"]`
- Selects: `select` com opções de base, equipe, colaborador, tipo de ocorrência
- Botões: `button` com texto "Entrar", "Voltar", "Sair", etc.
- Cards: Componentes `Card` do shadcn/ui
- Tabelas: `table` com classes Tailwind

### Classes CSS Importantes
- Header: `bg-[#fc4d00]` (laranja)
- Cards: `Card`, `CardHeader`, `CardContent`, `CardTitle`
- Botões primários: `bg-[#fc4d00]` ou `bg-white text-[#fc4d00]`

## Credenciais de Teste

**IMPORTANTE:** Criar estes usuários no banco antes de executar testes:

### Gerente Geral
- Email: `gerente@test.com`
- Senha: `password123`
- Role: `geral`
- Base: `ADMINISTRATIVO`

### Chefe de Equipe
- Email: `chefe@test.com`
- Senha: `password123`
- Role: `chefe`
- Base: Qualquer base (ex: `BRASILIA`)
- Equipe: Qualquer equipe (ex: `ALFA`)

## Fluxos de Teste Principais

### 1. Fluxo de Login
1. Acessar `/login`
2. Preencher email e senha
3. Clicar em "Entrar"
4. Verificar redirecionamento baseado em role

### 2. Fluxo de Analytics
1. Fazer login como Gerente ou Chefe
2. Navegar para `/dashboard-analytics`
3. Selecionar view (ex: "Visão Geral")
4. Aplicar filtros (base, equipe, data)
5. Verificar KPIs e gráficos

### 3. Fluxo de Aderência
1. Fazer login como Gerente
2. Navegar para `/aderencia`
3. Selecionar mês/ano
4. Verificar tabela de compliance
5. Verificar indicadores de status

### 4. Fluxo de Gestão de Usuários
1. Fazer login como Gerente
2. Navegar para `/gestao-usuarios`
3. Criar novo usuário
4. Editar usuário existente
5. Verificar listagem

## Validações Importantes

### Datas
- Intervalo máximo: 12 meses
- Data padrão: Mês atual (1º dia até hoje)
- Formato: YYYY-MM-DD

### Filtros
- Base: Select com todas as bases
- Equipe: Select com todas as equipes (quando aplicável)
- Colaborador: Select com colaboradores ativos da base (quando aplicável)
- Tipo de Ocorrência: Select com tipos específicos (quando aplicável)

## Dados de Teste Necessários

Para os testes funcionarem completamente, o banco deve ter:
- Pelo menos 2 bases (ex: BRASILIA, ADMINISTRATIVO)
- Pelo menos 2 equipes (ex: ALFA, BRAVO)
- Pelo menos 5 colaboradores ativos
- Alguns lançamentos de indicadores para análise
- Usuários de teste (Gerente e Chefe)

## Comandos para TestSprite MCP

### Bootstrap
```json
{
  "projectPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores",
  "localPort": 5173,
  "type": "frontend",
  "testScope": "codebase"
}
```

### Criar Testes Completos
```json
{
  "projectPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores",
  "localPort": 5173,
  "type": "frontend",
  "prdPath": "docs/PRD.md",
  "testScope": "codebase"
}
```
