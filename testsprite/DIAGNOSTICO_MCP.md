# Diagnóstico: TestSprite MCP

## 🔍 Verificação de Status

### Status Atual: ⚠️ TestSprite MCP não está disponível

O servidor MCP do TestSprite não está configurado ou não está acessível no momento.

## 📋 Checklist de Configuração

### 1. Verificar se TestSprite MCP está Instalado

**No Cursor:**
1. Abra as configurações: `Ctrl+,` (ou `Cmd+,` no Mac)
2. Procure por "MCP" ou "Model Context Protocol"
3. Verifique se "TestSprite" está listado

### 2. Configurar TestSprite MCP (se não estiver)

**Opção A: Via Interface do Cursor**
1. Cursor Settings > Features > MCP
2. Clique em "+ Add New MCP Server"
3. Configure:
   - **Name:** `TestSprite`
   - **Type:** `stdio`
   - **Command:** `npx @testsprite/testsprite-mcp@latest`
   - **Environment Variables:**
     - `API_KEY`: Sua chave API do TestSprite

**Opção B: Via Arquivo de Configuração**

Crie/edite o arquivo: `.cursor/mcp.json` (na raiz do projeto ou em `~/.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "TestSprite": {
      "command": "npx",
      "args": ["@testsprite/testsprite-mcp@latest"],
      "env": {
        "API_KEY": "sua-api-key-aqui"
      }
    }
  }
}
```

### 3. Obter API Key do TestSprite

1. Acesse: https://www.testsprite.com/
2. Crie uma conta (gratuita)
3. Obtenha sua API Key no painel

### 4. Verificar Requisitos

- ✅ Node.js >= 22 instalado
- ⚠️ TestSprite MCP configurado no Cursor
- ⚠️ API Key configurada

## 🧪 Teste Manual

Após configurar, teste com este comando:

```
Use o TestSprite MCP para fazer bootstrap dos testes deste projeto.
```

Se funcionar, você verá:
- ✅ Confirmação de bootstrap
- ✅ Análise de código iniciada
- ✅ Geração de testes

Se não funcionar, você verá:
- ❌ Erro: "Tool not found"
- ❌ Erro: "Server not available"

## 🔄 Alternativa: Testes Cypress

Enquanto o TestSprite MCP não está configurado, você pode usar os testes Cypress já criados:

### Instalação Rápida

```bash
cd "Projeto indicadores"
npm install --save-dev cypress
```

### Executar Testes

```bash
# Modo interativo (recomendado)
npm run test:open

# Modo headless
npm run test
```

### Testes Disponíveis

- ✅ `testsprite/tests/login.test.ts` - Testes de login
- ✅ `testsprite/tests/dashboard-gerente.test.ts` - Dashboard gerente
- ✅ `testsprite/tests/dashboard-analytics.test.ts` - Analytics
- ✅ `testsprite/tests/aderencia.test.ts` - Aderência

## 📝 Próximos Passos

1. **Configurar TestSprite MCP** seguindo os passos acima
2. **Reiniciar o Cursor** após configuração
3. **Testar novamente** com o comando de bootstrap
4. **Ou usar Cypress** como alternativa imediata

## 🔗 Links Úteis

- [Instalação TestSprite MCP](https://docs.testsprite.com/mcp/getting-started/installation)
- [Configuração Cursor](https://cursor.directory/mcp/testsprite-mcp)
- [Troubleshooting](https://docs.testsprite.com/mcp/troubleshooting/ide-configuration-issues)
- [Comunidade Discord](https://discord.gg/QQB9tJ973e)

## ✅ Status dos Testes Cypress

Os testes Cypress estão prontos e funcionais. Você pode usá-los imediatamente enquanto configura o TestSprite MCP.
