# Instruções para Usar TestSprite MCP

## Como Pedir ao Assistente para Usar TestSprite MCP

Você pode pedir ao assistente (eu) para usar o TestSprite MCP diretamente. Aqui estão exemplos de comandos que você pode usar:

### 1. Bootstrap dos Testes

```
Use o TestSprite MCP para fazer bootstrap dos testes deste projeto.
- projectPath: C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
- localPort: 5173
- type: frontend
- testScope: codebase
```

### 2. Criar Testes Completos

```
Use o TestSprite MCP para criar testes E2E completos para este projeto React.
O PRD está em docs/PRD.md.
O projeto roda na porta 5173.
Foque nas principais funcionalidades: login, dashboards, analytics, aderência.
```

### 3. Criar Testes para Funcionalidade Específica

```
Use o TestSprite MCP para criar testes para a página de Login.
Teste: validação de formulário, autenticação bem-sucedida, redirecionamento por role, tratamento de erros.
```

### 4. Criar Testes para Dashboard Analytics

```
Use o TestSprite MCP para criar testes para o Dashboard Analytics.
Teste: filtros de data (com validação de 12 meses), filtros de base/equipe, navegação entre views, visualização de gráficos.
```

## Informações do Projeto para o TestSprite

**Caminho Absoluto:**
```
C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
```

**Configuração:**
- Tipo: Frontend (React + Vite)
- Porta: 5173
- URL: http://localhost:5173
- Framework: React 18 + TypeScript
- Roteamento: React Router
- Autenticação: Supabase Auth

**PRD:**
- Localização: `docs/PRD.md`
- Contém todas as especificações do sistema

**Rotas Principais:**
- `/login` - Login
- `/dashboard-gerente` - Dashboard Gerente
- `/dashboard-chefe` - Dashboard Chefe
- `/dashboard-analytics` - Analytics
- `/gestao-usuarios` - Gestão de Usuários
- `/colaboradores` - Gestão de Efetivo
- `/aderencia` - Aderência
- `/settings` - Configurações

## Próximo Passo

Agora você pode me pedir:

**"Use o TestSprite MCP para criar testes E2E completos para este projeto usando o PRD em docs/PRD.md"**

Ou qualquer variação similar, e eu usarei as ferramentas MCP do TestSprite para criar os testes automaticamente!
