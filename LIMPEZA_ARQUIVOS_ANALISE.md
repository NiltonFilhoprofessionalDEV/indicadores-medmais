# Análise: arquivos não necessários para o sistema

**Objetivo:** Identificar arquivos que não são essenciais para build, execução ou deploy do sistema (indicadores MedMais).

---

## 1. Essenciais – não remover

| Pasta/Arquivo | Motivo |
|---------------|--------|
| `src/`, `public/`, `index.html` | Código da aplicação |
| `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.*`, `tailwind.config.js`, `postcss.config.js`, `.eslintrc.cjs` | Build e tooling |
| `vercel.json`, `.vercelignore` | Deploy Vercel |
| `.env.example`, `.gitignore`, `LICENSE`, `README.md` | Config e documentação base |
| `docs/PRD.md` | Especificação do produto |
| `supabase/` (migrations, functions) | Backend e banco |
| `testsprite/tests/*.test.ts`, `testsprite/cypress.config.ts`, `testsprite/support/` | Testes E2E usados por `npm run test:e2e` |
| `testsprite_tests/backend_config.py`, `backend_config.example.py`, `TC00*_test_*.py`, planos JSON | Testes de backend (TestSprite MCP) |
| `SECURITY_AUDIT.md`, `testsprite_tests/README_SEGURANCA.md` | Segurança e uso de env |

---

## 2. Úteis mas opcionais – manter ou consolidar

| Arquivo | Uso | Sugestão |
|---------|-----|----------|
| `CONFIGURAR_VARIAVEIS_VERCEL.md`, `DEPLOY_VERCEL.md`, `DEPLOY_GITHUB_VERCEL.md`, `DEPLOY_EDGE_FUNCTION.md`, `DEPLOY_EDGE_FUNCTION_UPDATE_USER.md`, `DEPLOY_COMPLETO.md`, `DEPLOY_MANUAL.md` | Documentação de deploy | Manter; depois pode consolidar em um único guia |
| `APLICAR_MIGRACAO_*.md`, `TROUBLESHOOTING_*.md`, `DIAGNOSTICO_LOGIN.md`, `AUDITORIA_SEGURANCA_ESCALABILIDADE.md`, `CORRECOES_*.md`, `OTIMIZACAO_CARREGAMENTO.md` | Operação e troubleshooting | Manter para referência |
| `deploy-edge-function.ps1`, `deploy-vercel.ps1`, `setup-github-vercel.ps1`, `push-to-github.ps1` | Scripts de deploy/CI | Manter se você os usa |
| `testsprite/README.md`, `testsprite/TESTSPRITE_SETUP.md`, `testsprite/GUIA_MCP_COMPLETO.md` | Uso do TestSprite/Cypress | Manter; são referência principal |
| `testsprite/BACKEND_INFO.md`, `testsprite/PROJECT_INFO.md`, `testsprite/QUICK_START.md` | Resumo do projeto para MCP | Manter ou fundir num só |
| `testsprite/COMANDO_MCP.md`, `testsprite/INSTRUCOES_MCP.md`, `testsprite/INSTRUCOES_USO_MCP.md`, `testsprite/MCP_USAGE.md` | Instruções MCP | Redundantes; manter 1 (ex.: GUIA_MCP_COMPLETO) e remover o resto se quiser enxugar |
| `public/README.md` | Como colocar o logo | Útil; manter |
| `supabase/functions/*/README.md` | Documentação das Edge Functions | Manter |

---

## 3. Removidos nesta limpeza (obsoletos / só status pontual)

| Arquivo | Motivo |
|---------|--------|
| `testsprite/EXECUCAO_EM_ANDAMENTO.md` | Status “execução em andamento” de uma rodada antiga; não é mais válido |
| `testsprite/STATUS_MCP.md` | Status pontual “MCP funcionando”; informação já coberta pelo setup/guia |
| `testsprite/VERIFICACAO_STATUS.md` | Verificação pontual de status; redundante |
| `testsprite/RESULTADO_GERACAO_TESTES.md` | Resultado de uma geração específica; obsoleto |
| `testsprite/DIAGNOSTICO_MCP.md` | Diagnóstico pontual; não é documentação de referência |
| `testsprite/COMANDO_RAPIDO.txt` | Comando rápido; conteúdo pode ir para README ou GUIA_MCP_COMPLETO |

---

## 4. Saídas de teste (opcional)

| Pasta/Arquivo | Motivo |
|---------------|--------|
| `testsprite_tests/tmp/raw_report.md` | Relatório bruto da última execução TestSprite; regerado a cada run |
| `testsprite_tests/tmp/test_results.json` | Resultados da última execução; regerado a cada run |

**Sugestão:** Se não precisar versionar relatórios de teste, adicionar ao `.gitignore`:

- `testsprite_tests/tmp/raw_report.md`
- `testsprite_tests/tmp/test_results.json`

Assim `tmp/` continua com `config.example.json`, `backend_code_summary.json`, `code_summary.json` e `prd_files/` (úteis para o MCP), e os relatórios gerados ficam só locais.

---

## 5. Duplicidade de documentação

- **PRD:** `docs/PRD.md` é a fonte; `testsprite_tests/standard_prd.json` e `testsprite_tests/tmp/prd_files/` são usados pelo TestSprite MCP. Manter ambos.
- **Config TestSprite:** `testsprite.config.json` (raiz) e `testsprite/testsprite-backend.config.json` têm papéis diferentes (frontend vs backend). Manter ambos.

---

## 6. Resumo

- **Removidos:** 6 arquivos em `testsprite/` (status/diagnóstico/comando rápido obsoletos).
- **Opcional:** Colocar `raw_report.md` e `test_results.json` no `.gitignore` se não quiser versionar relatórios.
- **Restante:** Mantido; documentação e scripts podem ser consolidados depois se quiser reduzir mais.
