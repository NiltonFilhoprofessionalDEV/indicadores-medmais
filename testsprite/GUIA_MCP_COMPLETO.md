# Guia Completo: TestSprite MCP

## 📋 O que é TestSprite MCP?

TestSprite MCP (Model Context Protocol) permite que você use o TestSprite diretamente do Cursor através de comandos MCP, gerando e executando testes automatizados usando IA.

## 🔧 Configuração Inicial

### 1. Verificar se TestSprite MCP está Instalado

O TestSprite MCP deve estar configurado no Cursor. Para verificar:

1. Abra as configurações do Cursor
2. Procure por "MCP" ou "Model Context Protocol"
3. Verifique se "TestSprite" está listado

### 2. Instalar TestSprite MCP (se necessário)

Se não estiver instalado, siga os passos em:
https://docs.testsprite.com/mcp/getting-started/installation

**Requisitos:**
- Node.js >= 22
- Conta TestSprite (gratuita)
- Cursor ou IDE compatível

## 🚀 Como Usar TestSprite MCP

### Método 1: Pedir ao Assistente (Recomendado)

Simplesmente peça ao assistente:

```
Use o TestSprite MCP para criar testes E2E completos para este projeto React.
```

Ou seja mais específico:

```
Use o TestSprite MCP para criar testes para este projeto:
- projectPath: C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
- localPort: 5173
- type: frontend
- testScope: codebase
- prdPath: docs/PRD.md
```

### Método 2: Workflow Completo Manual

O TestSprite MCP segue este workflow automático:

#### Passo 1: Bootstrap
```json
{
  "tool": "testsprite_bootstrap_tests",
  "arguments": {
    "projectPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores",
    "localPort": 5173,
    "type": "frontend",
    "testScope": "codebase"
  }
}
```

#### Passo 2: Análise de Código
```json
{
  "tool": "testsprite_generate_code_summary",
  "arguments": {
    "projectRootPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores"
  }
}
```

#### Passo 3: PRD Padronizado (Opcional)
```json
{
  "tool": "testsprite_generate_standardized_prd",
  "arguments": {
    "projectPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores"
  }
}
```

#### Passo 4: Plano de Testes Frontend
```json
{
  "tool": "testsprite_generate_frontend_test_plan",
  "arguments": {
    "projectPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores",
    "needLogin": true
  }
}
```

#### Passo 5: Gerar e Executar Testes
```json
{
  "tool": "testsprite_generate_code_and_execute",
  "arguments": {
    "projectName": "indicadores-medmais",
    "projectPath": "C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores",
    "testIds": [],
    "additionalInstruction": "Focar em login, dashboards, analytics e aderência"
  }
}
```

## 📝 Comandos Prontos para Copiar e Colar

### Comando Completo (Recomendado)

```
Use o TestSprite MCP para criar testes E2E completos para este projeto React/Vite.

Informações do projeto:
- projectPath: C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
- localPort: 5173
- type: frontend
- testScope: codebase
- prdPath: docs/PRD.md (opcional)

Funcionalidades principais para testar:
1. Login e autenticação (validação, redirecionamento por role)
2. Dashboard Gerente (navegação, cards, menu)
3. Dashboard Chefe (navegação, cards, menu)
4. Dashboard Analytics (filtros, views, gráficos)
5. Monitoramento de Aderência (tabela, filtros, indicadores)
6. Gestão de Usuários (criar, editar, listar)
7. Gestão de Efetivo/Colaboradores

Credenciais de teste:
- Gerente: gerente@test.com / password123
- Chefe: chefe@test.com / password123
```

### Comando para Testes Específicos

```
Use o TestSprite MCP para criar testes apenas para a página de Login.
Teste: validação de formulário, autenticação bem-sucedida, tratamento de erros, redirecionamento por role.
```

### Comando para Analytics

```
Use o TestSprite MCP para criar testes para o Dashboard Analytics.
Foque em: filtros de data (validação de 12 meses), filtros de base/equipe, navegação entre views, visualização de KPIs e gráficos.
```

## 📊 Estrutura de Arquivos Gerados

Após executar o TestSprite MCP, você terá:

```
Projeto indicadores/
├── testsprite_tests/
│   ├── tmp/
│   │   ├── prd_files/          # Arquivos PRD temporários
│   │   ├── config.json         # Configuração do projeto
│   │   ├── code_summary.json   # Análise de código
│   │   ├── report_prompt.json  # Dados para análise IA
│   │   └── test_results.json   # Resultados da execução
│   ├── standard_prd.json       # PRD padronizado
│   ├── TestSprite_MCP_Test_Report.md  # Relatório em Markdown
│   ├── TestSprite_MCP_Test_Report.html # Relatório HTML
│   ├── TC001_Login_Success_with_Valid_Credentials.py
│   ├── TC002_Login_Failure_with_Invalid_Credentials.py
│   ├── TC003_Dashboard_Analytics_Display.py
│   └── ... (mais arquivos de teste)
```

## ✅ Checklist Antes de Executar

- [ ] Aplicação rodando em `http://localhost:5173`
- [ ] Node.js >= 22 instalado
- [ ] TestSprite MCP configurado no Cursor
- [ ] Usuários de teste criados no banco (opcional, mas recomendado)
- [ ] PRD atualizado em `docs/PRD.md` (opcional, mas recomendado)

## 🎯 Exemplos de Uso

### Exemplo 1: Testes Completos
```
Use o TestSprite MCP para criar testes E2E completos para este projeto usando o PRD em docs/PRD.md
```

### Exemplo 2: Testes Incrementais
```
Use o TestSprite MCP para criar testes apenas para as mudanças recentes (testScope: diff)
```

### Exemplo 3: Testes Específicos
```
Use o TestSprite MCP para executar apenas os testes TC001, TC002 e TC003
```

### Exemplo 4: Testes com Instruções Especiais
```
Use o TestSprite MCP para criar testes focando em segurança e validação de dados
```

## 🔄 Reexecutar Testes

Para reexecutar testes já criados:

```
Use o TestSprite MCP para reexecutar os testes existentes deste projeto
```

Isso chamará `testsprite_rerun_tests` automaticamente.

## 📚 Documentação

- [TestSprite MCP Docs](https://docs.testsprite.com/mcp)
- [MCP Tools Reference](https://docs.testsprite.com/mcp/core/tools)
- [First MCP Test](https://docs.testsprite.com/mcp/getting-started/first-test)

## 🆘 Troubleshooting

### TestSprite MCP não está disponível

1. Verifique se está instalado: https://docs.testsprite.com/mcp/getting-started/installation
2. Reinicie o Cursor
3. Verifique as configurações MCP do Cursor

### Aplicação não detectada

1. Certifique-se de que a aplicação está rodando em `http://localhost:5173`
2. Verifique se a porta está correta
3. Tente acessar a URL manualmente no navegador

### Erros de autenticação nos testes

1. Configure credenciais no portal TestSprite
2. Ou ajuste os testes gerados para usar suas credenciais

## 💡 Dicas

1. **Use o PRD**: Fornecer o PRD ajuda o TestSprite a criar testes mais precisos
2. **Seja específico**: Quanto mais detalhes você fornecer, melhores serão os testes
3. **Revise os testes**: Sempre revise os testes gerados antes de confiar 100%
4. **Execute incrementalmente**: Comece com testes básicos e vá expandindo

## 🎉 Próximo Passo

Agora você pode simplesmente pedir ao assistente:

**"Use o TestSprite MCP para criar testes E2E completos para este projeto"**

E o TestSprite fará todo o trabalho automaticamente! 🚀
