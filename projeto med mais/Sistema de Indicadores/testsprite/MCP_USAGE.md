# TestSprite MCP - Guia de Uso

## O que é TestSprite MCP?

TestSprite MCP (Model Context Protocol) permite que você use o TestSprite diretamente do Cursor ou outros IDEs compatíveis através de comandos MCP, sem precisar instalar ferramentas adicionais.

## Como Usar TestSprite MCP no Cursor

### 1. Verificar se o TestSprite MCP está Configurado

O TestSprite MCP deve estar configurado no Cursor. Para verificar, você pode pedir ao assistente:
- "Liste as ferramentas MCP disponíveis"
- "Quais ferramentas do TestSprite estão disponíveis?"

### 2. Comandos MCP Disponíveis

Baseado na documentação do TestSprite, as principais ferramentas MCP são:

#### `testsprite_bootstrap_tests`
Inicializa o ambiente de testes e configuração.

**Parâmetros:**
- `projectPath` (string): Caminho absoluto do projeto
- `localPort` (number): Porta onde a aplicação roda (padrão: 5173)
- `type` (string): Tipo do projeto - "frontend" ou "backend"
- `testScope` (string): Escopo dos testes - "codebase" ou "diff"

**Exemplo de uso via chat:**
```
Use o TestSprite MCP para inicializar testes para este projeto:
- projectPath: C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
- localPort: 5173
- type: frontend
- testScope: codebase
```

#### `testsprite_create_tests_for_new_project`
Cria testes completos para um novo projeto seguindo o workflow completo:
1. Bootstrap do ambiente
2. Leitura do PRD
3. Análise de código
4. Geração de plano de testes
5. Criação de código de teste executável
6. Execução de testes
7. Análise de resultados
8. Correções automáticas de bugs

**Parâmetros:**
- `projectPath` (string): Caminho absoluto do projeto
- `localPort` (number): Porta da aplicação
- `type` (string): "frontend" ou "backend"
- `prdPath` (string, opcional): Caminho para o PRD (Product Requirements Document)

**Exemplo de uso via chat:**
```
Use o TestSprite MCP para criar testes completos para este projeto usando o PRD em docs/PRD.md
```

### 3. Como Executar via Chat no Cursor

Você pode pedir ao assistente para usar o TestSprite MCP diretamente:

**Exemplo 1 - Bootstrap:**
```
Use o TestSprite MCP para fazer bootstrap dos testes deste projeto React/Vite.
O projeto está em: C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
A aplicação roda na porta 5173.
```

**Exemplo 2 - Criar Testes Completos:**
```
Use o TestSprite MCP para criar testes E2E completos para este projeto.
Use o PRD em docs/PRD.md como referência.
O projeto é frontend React com Vite rodando na porta 5173.
```

**Exemplo 3 - Criar Testes para Funcionalidade Específica:**
```
Use o TestSprite MCP para criar testes para a página de Login.
Teste: validação de formulário, autenticação, redirecionamento por role.
```

### 4. Informações do Projeto para TestSprite

**Caminho do Projeto:**
```
C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
```

**Configuração:**
- Tipo: Frontend (React + Vite)
- Porta: 5173
- Framework: React 18 + TypeScript
- Roteamento: React Router
- Autenticação: Supabase Auth
- UI: Tailwind CSS + shadcn/ui

**Rotas Principais:**
- `/login` - Página de login
- `/dashboard-gerente` - Dashboard do Gerente Geral
- `/dashboard-chefe` - Dashboard do Chefe de Equipe
- `/dashboard-analytics` - Dashboard Analytics
- `/gestao-usuarios` - Gestão de Usuários
- `/colaboradores` - Gestão de Efetivo
- `/aderencia` - Monitoramento de Aderência
- `/settings` - Configurações

**Credenciais de Teste (ajustar conforme necessário):**
- Gerente: `gerente@test.com` / `password123`
- Chefe: `chefe@test.com` / `password123`

### 5. Workflow Recomendado

1. **Iniciar a aplicação:**
   ```bash
   npm run dev
   ```

2. **Pedir ao assistente para usar TestSprite MCP:**
   ```
   Use o TestSprite MCP para criar testes E2E para este projeto.
   Foque nas principais funcionalidades: login, dashboards, analytics, aderência.
   ```

3. **O TestSprite irá:**
   - Analisar o código
   - Ler o PRD (se fornecido)
   - Criar plano de testes
   - Gerar código de teste
   - Executar testes
   - Reportar resultados

4. **Revisar e ajustar:**
   - Revisar os testes gerados
   - Ajustar credenciais se necessário
   - Adicionar mais testes conforme necessário

### 6. Troubleshooting

**Se o TestSprite MCP não estiver disponível:**
- Verifique se o TestSprite está instalado e configurado no Cursor
- Verifique as configurações MCP do Cursor
- Consulte a documentação: https://docs.testsprite.com/mcp/getting-started/installation

**Se os testes não executarem:**
- Certifique-se de que a aplicação está rodando em `http://localhost:5173`
- Verifique se há usuários de teste no banco de dados
- Verifique os logs do TestSprite para erros específicos

### 7. Recursos Adicionais

- [Documentação TestSprite MCP](https://docs.testsprite.com/mcp)
- [MCP Tools Reference](https://docs.testsprite.com/mcp/core/tools)
- [First MCP Test Tutorial](https://docs.testsprite.com/mcp/getting-started/first-test)
