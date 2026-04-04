# Segurança – Testes de Backend (TestSprite)

## Variáveis de ambiente obrigatórias para rodar os testes

Os testes em `TC00*_test_*.py` usam `backend_config.py`, que **não contém chaves no código**. É necessário definir:

- **`SUPABASE_SERVICE_ROLE_KEY`** – Service Role Key do seu projeto Supabase (obtida em Settings → API no painel do Supabase).

Opcional:

- **`SUPABASE_URL`** – URL do projeto (ex.: `https://eanobeiqmpymrdbvdnnr.supabase.co`). Se não definir, será usado o valor padrão do projeto.

### Exemplo (Windows PowerShell)

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "sua_service_role_key_aqui"
python TC005_test_user_management_crud_operations.py
```

### Exemplo (Linux/macOS)

```bash
export SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key_aqui"
python TC005_test_user_management_crud_operations.py
```

**Nunca** commite a Service Role Key no repositório. Use apenas variáveis de ambiente ou arquivos locais não versionados (ex.: `.env` na raiz, que já está no `.gitignore`).
