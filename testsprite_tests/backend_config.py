# Configuração central para testes do backend (Supabase Edge Functions).
# NUNCA coloque SERVICE_ROLE_KEY ou outras chaves neste arquivo.
# Use variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
# Ex.: export SUPABASE_SERVICE_ROLE_KEY="sua_chave" ou defina no .env (não commite o .env).

import os

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://eanobeiqmpymrdbvdnnr.supabase.co").rstrip("/")
BASE_SUPABASE_FUNCTIONS_URL = f"{SUPABASE_URL}/functions/v1"
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

if not SERVICE_ROLE_KEY:
    import warnings
    warnings.warn(
        "SUPABASE_SERVICE_ROLE_KEY não definida. Defina a variável de ambiente para os testes de backend funcionarem.",
        UserWarning,
        stacklevel=2,
    )

HEADERS = {
    "Content-Type": "application/json",
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
}

TIMEOUT = 30
