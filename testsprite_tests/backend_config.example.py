# Exemplo de configuração para testes do backend (Supabase Edge Functions).
# Copie para backend_config.py NÃO é necessário se você usar apenas variáveis de ambiente.
# Ou defina no ambiente:
#   export SUPABASE_URL="https://SEU_PROJETO.supabase.co"
#   export SUPABASE_SERVICE_ROLE_KEY="sua_service_role_key_do_supabase"

import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://SEU_PROJETO.supabase.co").rstrip("/")
BASE_SUPABASE_FUNCTIONS_URL = f"{SUPABASE_URL}/functions/v1"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

HEADERS = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

TIMEOUT = 30
