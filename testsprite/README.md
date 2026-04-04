# TestSprite - Testes E2E para Sistema de Indicadores MedMais

## Configuração

### Pré-requisitos
- Node.js >= 22
- Aplicação rodando em `http://localhost:5173`

### Instalação

1. Instalar dependências de teste:
```bash
npm install --save-dev cypress @types/node
```

2. Iniciar a aplicação:
```bash
npm run dev
```

3. Executar testes:
```bash
npx cypress open
# ou
npx cypress run
```

## Estrutura de Testes

```
testsprite/
├── tests/
│   ├── login.test.ts          # Testes de autenticação
│   ├── dashboard-gerente.test.ts  # Testes do dashboard gerente
│   ├── dashboard-analytics.test.ts # Testes de analytics
│   └── aderencia.test.ts      # Testes de compliance
├── support/
│   ├── commands.ts            # Comandos customizados
│   └── e2e.ts                 # Configuração global
└── cypress.config.ts          # Configuração do Cypress
```

## Comandos Customizados

### `cy.login(email, password)`
Faz login no sistema com as credenciais fornecidas.

### `cy.logout()`
Faz logout do sistema.

### `cy.visitAuthenticated(path)`
Visita uma página autenticada, fazendo login se necessário.

## Executando Testes Específicos

```bash
# Executar apenas testes de login
npx cypress run --spec "testsprite/tests/login.test.ts"

# Executar apenas testes de analytics
npx cypress run --spec "testsprite/tests/dashboard-analytics.test.ts"
```

## Variáveis de Ambiente

Criar arquivo `.env.test` com credenciais de teste:
```
CYPRESS_TEST_EMAIL_GERENTE=gerente@test.com
CYPRESS_TEST_PASSWORD_GERENTE=password123
CYPRESS_TEST_EMAIL_CHEFE=chefe@test.com
CYPRESS_TEST_PASSWORD_CHEFE=password123
```

## Notas Importantes

1. **Credenciais de Teste**: Os testes assumem que existem usuários de teste no banco. Ajustar conforme necessário.

2. **Porta**: A aplicação deve estar rodando na porta 5173 (padrão do Vite).

3. **Dados de Teste**: Certifique-se de que há dados de teste no banco para os testes funcionarem corretamente.

4. **Timeouts**: Os testes têm timeouts configurados para aguardar carregamento de dados.
