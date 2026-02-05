# Relatório de Auditoria de Segurança – Projeto Indicadores

**Data:** 2026-01-27  
**Escopo:** Código-fonte (frontend, backend, testes, configs)  
**Objetivo:** Identificar chaves expostas, segredos em repositório e vulnerabilidades que possam causar problemas futuros.

---

## 1. Resumo executivo

| Severidade | Quantidade | Status após correções |
|------------|------------|------------------------|
| Crítica    | 2          | Mitigado              |
| Alta       | 2          | Mitigado              |
| Média      | 2          | Documentado           |
| Baixa      | 2          | Documentado           |

---

## 2. Vulnerabilidades identificadas

### 2.1 Crítica: Service Role Key em código versionado

**Arquivo:** `testsprite_tests/backend_config.py`  
**Problema:** A chave `SUPABASE_SERVICE_ROLE_KEY` (JWT do Supabase) estava hardcoded no arquivo. Essa chave bypassa RLS e tem acesso total ao projeto. Se o repositório for público ou vazado, um atacante pode ler/alterar todos os dados e criar usuários admin.  
**Correção aplicada:** O arquivo passou a ler `SUPABASE_SERVICE_ROLE_KEY` apenas de variável de ambiente (`os.environ.get('SUPABASE_SERVICE_ROLE_KEY')`). Foi criado `backend_config.example.py` como referência sem segredos. Recomenda-se adicionar `backend_config.py` ao `.gitignore` se você mantiver uma cópia local com a chave, ou usar sempre env.

---

### 2.2 Crítica: Credenciais no config do TestSprite

**Arquivo:** `testsprite_tests/tmp/config.json`  
**Problema:** Contém (1) `API_KEY` do TestSprite (token tipo `sk-user-...`) e (2) URL de proxy com credenciais em texto (`http://uuid:senha@tun.testsprite.com:8080`). Se commitado, essas credenciais permitem uso indevido da sua conta TestSprite e do túnel.  
**Correção aplicada:** `testsprite_tests/tmp/config.json` foi adicionado ao `.gitignore` para não ser versionado. Foi criado `testsprite_tests/tmp/config.example.json` com placeholders, sem segredos.

---

### 2.3 Alta: Arquivo `.env` com chaves

**Arquivo:** `.env` (raiz do projeto)  
**Problema:** Contém `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. A anon key é destinada ao frontend (uso em cliente é esperado), mas o `.env` não deve ser commitado para evitar vazamento em clones e histórico.  
**Status:** `.env` já está no `.gitignore` — correto. Foi criado `.env.example` com variáveis sem valores reais para documentar o que é necessário.

---

### 2.4 Alta: Possível commit acidental de `backend_config.py` com chave

**Problema:** Se alguém voltar a colocar a Service Role Key em `backend_config.py` e der commit, o segredo entra no histórico do Git.  
**Correção aplicada:** `backend_config.py` agora não contém segredos (lê só de env). Foi adicionada a regra opcional no `.gitignore` para um eventual `backend_config.local.py` com chave, caso a equipe prefira arquivo local. O relatório recomenda usar sempre variáveis de ambiente.

---

### 2.5 Média: Tokens placeholder em testes

**Arquivos:** Vários `TC00*_test_*.py` em `testsprite_tests/`  
**Problema:** Strings como `BEARER_TOKEN = "your_valid_bearer_token_here"` e `API_KEY = "your_api_key_here"`. Em ambiente de CI, se alguém substituir por valores reais e commitar, os segredos vão para o repositório.  
**Recomendação:** Manter placeholders no código e injetar valores reais apenas por variáveis de ambiente ou secrets do CI (ex.: `BEARER_TOKEN = os.environ.get('TEST_BEARER_TOKEN', '')`).

---

### 2.6 Média: Frontend expõe Anon Key (comportamento esperado)

**Arquivos:** `src/lib/supabase.ts`, uso de `import.meta.env.VITE_SUPABASE_ANON_KEY`  
**Problema:** A anon key é embutida no bundle do frontend e fica visível no navegador. No Supabase isso é esperado: a proteção é feita por RLS.  
**Recomendação:** Garantir que (1) RLS está bem configurado em todas as tabelas e (2) a **Service Role Key** nunca seja usada no frontend. Auditoria confirmou: apenas anon key e URL no cliente — OK.

---

### 2.7 Baixa: Edge Functions usam variáveis de ambiente

**Arquivos:** `supabase/functions/create-user/index.ts`, `update-user/index.ts`, `delete-user/index.ts`  
**Status:** Todas usam `Deno.env.get('SUPABASE_URL')` e `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` — sem segredos no código. Configurar essas variáveis no painel do Supabase (Edge Function secrets). **Nenhuma alteração necessária.**

---

### 2.8 Baixa: Uso de `exec()` em relatórios de teste

**Arquivos:** `testsprite_tests/tmp/raw_report.md`, `test_results.json`  
**Problema:** Os textos mencionam `exec(code, exec_env)` — isso ocorre no ambiente de execução remoto do TestSprite (execução de código dos testes), não no seu repositório.  
**Recomendação:** Nenhuma ação no código do projeto; apenas não executar código arbitrário gerado por terceiros fora do sandbox do TestSprite.

---

## 3. Boas práticas verificadas (já atendidas)

- **Frontend:** Apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`; nenhuma Service Role Key no cliente.
- **Edge Functions:** Segredos apenas via `Deno.env.get(...)`.
- **.gitignore:** `.env`, `.env.local`, `.env.production` já ignorados.
- **XSS:** Nenhum uso de `dangerouslySetInnerHTML` ou `innerHTML` com conteúdo dinâmico não sanitizado no `src/`.
- **SQL:** Uso de Supabase client (queries parametrizadas); não foi encontrada concatenação direta de SQL.

---

## 4. Ações realizadas nesta auditoria

1. **backend_config.py:** Passou a ler `SUPABASE_SERVICE_ROLE_KEY` e opcionalmente `SUPABASE_URL` de variáveis de ambiente; removida chave hardcoded.
2. **.gitignore:** Incluídos `testsprite_tests/tmp/config.json` e, opcionalmente, `backend_config.local.py` para evitar commit de segredos.
3. **.env.example:** Criado na raiz com as variáveis necessárias (sem valores).
4. **backend_config.example.py:** Criado em `testsprite_tests/` com placeholders para URL e key.
5. **config.example.json:** Criado em `testsprite_tests/tmp/` com estrutura do config do TestSprite sem API_KEY nem proxy com senha.

---

## 5. Recomendações futuras

1. **Rotação de chaves:** Se houver suspeita de vazamento da Service Role Key ou do token TestSprite, rotacione-as no painel do Supabase e do TestSprite e atualize apenas em variáveis de ambiente / secrets.
2. **CI/CD:** Nunca commitar segredos. Usar secrets do GitHub Actions / Vercel / outro CI para `SUPABASE_SERVICE_ROLE_KEY`, `API_KEY` do TestSprite, etc.
3. **Pre-commit:** Considerar uso de `detect-secrets` ou `gitleaks` no pre-commit para alertar sobre possíveis segredos antes do commit.
4. **RLS:** Revisar políticas RLS no Supabase periodicamente para garantir que anon key não acesse dados além do desejado.

---

*Relatório gerado no âmbito da varredura de segurança do projeto.*
