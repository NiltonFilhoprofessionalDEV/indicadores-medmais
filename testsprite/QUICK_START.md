# TestSprite - Quick Start Guide

## 🚀 Início Rápido

### 1. Instalar Dependências
```bash
cd "Projeto indicadores"
npm install --save-dev cypress
```

### 2. Iniciar Aplicação
```bash
npm run dev
```
A aplicação deve estar rodando em `http://localhost:5173`

### 3. Executar Testes

**Opção A: Interface Gráfica (Recomendado para iniciantes)**
```bash
npm run test:open
```
Isso abrirá a interface do Cypress onde você pode:
- Ver todos os testes
- Executar testes individualmente
- Ver resultados em tempo real

**Opção B: Linha de Comando (Headless)**
```bash
npm run test
```

## 📝 Testes Disponíveis

### ✅ Login (`login.test.ts`)
- Validação de formulário
- Testes de autenticação
- Redirecionamento por role

### 📊 Dashboard Analytics (`dashboard-analytics.test.ts`)
- Filtros de data e base
- Validação de intervalo máximo
- Navegação entre views
- Visualização de gráficos

### 👤 Dashboard Gerente (`dashboard-gerente.test.ts`)
- Navegação entre páginas
- Menu de configurações
- Logout

### 📈 Aderência (`aderencia.test.ts`)
- Filtro de mês/ano
- Tabela de compliance
- Indicadores de status

## ⚙️ Configuração Necessária

### Credenciais de Teste

Antes de executar os testes, você precisa ter usuários de teste no banco:

1. **Gerente Geral:**
   - Email: `gerente@test.com`
   - Senha: `password123`
   - Role: `geral`

2. **Chefe de Equipe:**
   - Email: `chefe@test.com`
   - Senha: `password123`
   - Role: `chefe`

**OU** ajuste as credenciais nos arquivos de teste para usar usuários existentes.

## 🔧 Comandos Úteis

```bash
# Executar apenas testes de login
npx cypress run --spec "testsprite/tests/login.test.ts"

# Executar apenas testes de analytics
npx cypress run --spec "testsprite/tests/dashboard-analytics.test.ts"

# Executar em modo headless com relatório
npx cypress run --reporter json --output-file results.json
```

## 🐛 Troubleshooting

### Aplicação não está rodando
```bash
# Certifique-se de que a aplicação está rodando
npm run dev
```

### Erro de autenticação
- Verifique se os usuários de teste existem
- Verifique as credenciais nos arquivos de teste
- Verifique a configuração do Supabase

### Timeouts
- Aumente o timeout em `cypress.config.ts` se necessário
- Verifique a velocidade da conexão com o banco

## 📚 Próximos Passos

1. Execute os testes básicos para verificar se tudo está funcionando
2. Ajuste as credenciais conforme necessário
3. Adicione mais testes conforme suas necessidades
4. Configure CI/CD para executar testes automaticamente

## 💡 Dicas

- Use `npm run test:open` para debug visual
- Os screenshots são salvos automaticamente em caso de falha
- Você pode pausar testes e inspecionar o estado da aplicação
