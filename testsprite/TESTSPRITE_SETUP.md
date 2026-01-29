# TestSprite Setup Guide

## O que é TestSprite?

TestSprite é uma ferramenta de teste E2E (End-to-End) que usa AI para gerar e executar testes automatizados. Ele se integra com IDEs através do MCP (Model Context Protocol).

## Configuração Inicial

### Opção 1: Usando TestSprite via MCP (Recomendado)

Se você está usando Cursor ou outro IDE compatível com MCP:

1. **Instalar TestSprite MCP Server** (se ainda não estiver instalado)
2. **Configurar o projeto** usando o comando MCP:
   ```
   testsprite_bootstrap_tests
   ```
   Com os parâmetros:
   - `projectPath`: Caminho absoluto do projeto
   - `localPort`: 5173 (porta padrão do Vite)
   - `type`: "frontend"
   - `testScope`: "codebase"

### Opção 2: Usando Cypress diretamente (Alternativa)

Os testes foram criados usando Cypress como base. Para executar:

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Iniciar a aplicação:**
   ```bash
   npm run dev
   ```

3. **Executar testes:**
   ```bash
   # Modo interativo (abre interface gráfica)
   npm run test:open
   
   # Modo headless (linha de comando)
   npm run test
   
   # Executar testes específicos
   npm run test:e2e
   ```

## Estrutura de Testes Criada

### 1. Login Tests (`login.test.ts`)
- Validação de formulário
- Testes de autenticação
- Redirecionamento por role
- Tratamento de erros

### 2. Dashboard Gerente Tests (`dashboard-gerente.test.ts`)
- Navegação entre páginas
- Verificação de elementos
- Testes de logout
- Menu de configurações

### 3. Dashboard Analytics Tests (`dashboard-analytics.test.ts`)
- Filtros de data e base
- Validação de intervalo máximo (12 meses)
- Navegação entre views
- Visualização de gráficos
- Filtros por colaborador

### 4. Aderência Tests (`aderencia.test.ts`)
- Filtro de mês/ano
- Tabela de compliance
- Indicadores de status
- Widget de usuários inativos

## Comandos Customizados

Os testes incluem comandos customizados em `support/commands.ts`:

- `cy.login(email, password)` - Faz login
- `cy.logout()` - Faz logout
- `cy.visitAuthenticated(path)` - Visita página autenticada

## Configuração de Credenciais de Teste

**IMPORTANTE:** Antes de executar os testes, você precisa:

1. Criar usuários de teste no banco de dados:
   - Gerente: `gerente@test.com` / `password123`
   - Chefe: `chefe@test.com` / `password123`

2. Ou ajustar as credenciais nos arquivos de teste para usar usuários existentes.

## Executando Testes Específicos

```bash
# Apenas testes de login
npx cypress run --spec "testsprite/tests/login.test.ts"

# Apenas testes de analytics
npx cypress run --spec "testsprite/tests/dashboard-analytics.test.ts"

# Apenas testes de aderência
npx cypress run --spec "testsprite/tests/aderencia.test.ts"
```

## Troubleshooting

### Erro: "Cannot find module 'cypress'"
```bash
npm install --save-dev cypress
```

### Erro: "Application not running on port 5173"
Certifique-se de que a aplicação está rodando:
```bash
npm run dev
```

### Erros de autenticação nos testes
- Verifique se os usuários de teste existem no banco
- Verifique as credenciais nos arquivos de teste
- Certifique-se de que o Supabase está configurado corretamente

### Timeouts nos testes
Ajuste os timeouts em `cypress.config.ts` se necessário:
```typescript
defaultCommandTimeout: 15000, // Aumentar se necessário
```

## Próximos Passos

1. **Ajustar credenciais de teste** para seus usuários reais
2. **Adicionar mais testes** conforme necessário
3. **Configurar CI/CD** para executar testes automaticamente
4. **Integrar com TestSprite MCP** para geração automática de testes

## Recursos

- [Documentação TestSprite](https://docs.testsprite.com)
- [Documentação Cypress](https://docs.cypress.io)
- [MCP Tools Reference](https://docs.testsprite.com/mcp/core/tools)
