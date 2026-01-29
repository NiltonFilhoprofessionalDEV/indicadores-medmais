# Instruções para Usar TestSprite MCP no Cursor

## ⚠️ Importante: Configuração do TestSprite MCP

O TestSprite MCP precisa estar configurado no Cursor para funcionar. Se você receber erros de "tool not found", siga estes passos:

### 1. Verificar Instalação do TestSprite MCP

O TestSprite MCP deve estar instalado e configurado. Siga a documentação oficial:
https://docs.testsprite.com/mcp/getting-started/installation

### 2. Configuração no Cursor

1. Abra as configurações do Cursor (Ctrl+,)
2. Procure por "MCP" ou "Model Context Protocol"
3. Verifique se o TestSprite está listado como servidor MCP
4. Se não estiver, adicione seguindo a documentação

### 3. Verificar Nome do Servidor

O nome do servidor MCP pode variar. Tente:
- `TestSprite`
- `testsprite`
- `user-TestSprite`
- `testsprite-mcp`

## 🚀 Como Usar (Quando Configurado)

Uma vez configurado, você pode pedir ao assistente:

```
Use o TestSprite MCP para criar testes E2E completos para este projeto React/Vite.

projectPath: C:/Users/sussa/Desktop/indicadores_medmais/Projeto indicadores
localPort: 5173
type: frontend
testScope: codebase
prdPath: docs/PRD.md
```

## 📋 Informações do Projeto Preparadas

Todas as informações necessárias estão em:
- `testsprite/PROJECT_INFO.md` - Informações técnicas completas
- `testsprite.config.json` - Configuração do projeto
- `docs/PRD.md` - Product Requirements Document

## 🔄 Alternativa: Testes Cypress Manuais

Se o TestSprite MCP não estiver disponível, você pode usar os testes Cypress já criados:

```bash
# Instalar Cypress
npm install --save-dev cypress

# Executar testes
npm run test:open
```

Os testes estão em `testsprite/tests/` e incluem:
- ✅ Login
- ✅ Dashboard Gerente
- ✅ Dashboard Analytics
- ✅ Aderência

## 📞 Suporte

Se precisar de ajuda com a configuração do TestSprite MCP:
- Documentação: https://docs.testsprite.com/mcp
- Comunidade: https://discord.gg/QQB9tJ973e
- Contato: https://calendly.com/contact-hmul/schedule
