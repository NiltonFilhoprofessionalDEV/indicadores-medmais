import requests
import base64

BASE_URL = "http://localhost:5174"

API_KEY = "your-api-key"  # Replace with valid API key
TIMEOUT = 30

# Supabase Auth endpoints assumed:
AUTH_URL = f"{BASE_URL}/auth/v1"
LOGIN_ENDPOINT = f"{AUTH_URL}/token"
USER_ENDPOINT = f"{AUTH_URL}/user"

headers_api_key = {
    "apikey": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_user_authentication_and_role_based_route_protection():
    # Test users with roles: Gerente Geral and Chefe de Equipe
    # For testing, use two users credentials (assumed available for test environment)
    USERS = {
        "gerente_geral": {
            "email": "gerente.geral@example.com",
            "password": "TestPass123!"
        },
        "chefe_de_equipe": {
            "email": "chefe.equipe@example.com",
            "password": "TestPass123!"
        }
    }

    session_tokens = {}

    try:
        # 1. Login each user and check access to dashboard routes based on roles
        for role, creds in USERS.items():
            # Login request to Supabase Auth (POST /token with grant_type=password)
            login_payload = {
                "grant_type": "password",
                "email": creds["email"],
                "password": creds["password"]
            }
            # Correct Authorization header with Basic base64 encoded anon key (Supabase expects this for /token)
            basic_auth = base64.b64encode(f"{API_KEY}:".encode()).decode()
            login_headers = {
                "Authorization": f"Basic {basic_auth}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
            }

            response = requests.post(
                LOGIN_ENDPOINT,
                data=login_payload,
                headers=login_headers,
                timeout=TIMEOUT
            )

            assert response.status_code == 200, f"Login failed for {role}"
            login_data = response.json()
            assert "access_token" in login_data, f"access_token missing for {role}"
            access_token = login_data["access_token"]
            session_tokens[role] = access_token

            # Validate user metadata role by fetching user info
            user_headers = {
                "Authorization": f"Bearer {access_token}",
                "apikey": API_KEY,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            user_response = requests.get(USER_ENDPOINT, headers=user_headers, timeout=TIMEOUT)
            assert user_response.status_code == 200, f"User info fetch failed for {role}"
            user_info = user_response.json()
            # Check role presence (assuming role stored in user_metadata with key 'role')
            assert "user_metadata" in user_info, f"user_metadata missing for {role}"
            user_role = user_info["user_metadata"].get("role")
            assert user_role in ["Gerente Geral", "Chefe de Equipe"], f"Unexpected role for {role}: {user_role}"
            # Role must match expected role for test user
            expected_role_name = "Gerente Geral" if role == "gerente_geral" else "Chefe de Equipe"
            assert user_role == expected_role_name, f"Role mismatch for {role} user"

        # 2. Role-based route protection access check
        # Gerente Geral should access /dashboard-gerente and /user-management (admin functions)
        gerente_headers = {
            "Authorization": f"Bearer {session_tokens['gerente_geral']}",
            "apikey": API_KEY
        }
        gerente_dashboard_resp = requests.get(f"{BASE_URL}/dashboard-gerente", headers=gerente_headers, timeout=TIMEOUT)
        assert gerente_dashboard_resp.status_code == 200, "Gerente Geral cannot access /dashboard-gerente"

        user_management_resp = requests.get(f"{BASE_URL}/usuarios", headers=gerente_headers, timeout=TIMEOUT)
        assert user_management_resp.status_code == 200, "Gerente Geral cannot access /usuarios (user management)"

        # Gerente Geral should also be able to logout
        logout_resp_gerente = requests.post(f"{AUTH_URL}/logout", headers={"Authorization": f"Bearer {session_tokens['gerente_geral']}", "apikey": API_KEY}, timeout=TIMEOUT)
        assert logout_resp_gerente.status_code in [200, 204], "Gerente Geral logout failed"

        # Chefe de Equipe should access only /dashboard-chefe and restricted areas
        chefe_headers = {
            "Authorization": f"Bearer {session_tokens['chefe_de_equipe']}",
            "apikey": API_KEY
        }
        chefe_dashboard_resp = requests.get(f"{BASE_URL}/dashboard-chefe", headers=chefe_headers, timeout=TIMEOUT)
        assert chefe_dashboard_resp.status_code == 200, "Chefe de Equipe cannot access /dashboard-chefe"

        # Attempting to access admin/user management should be forbidden or unauthorized
        chefe_user_management_resp = requests.get(f"{BASE_URL}/usuarios", headers=chefe_headers, timeout=TIMEOUT)
        assert chefe_user_management_resp.status_code in [401, 403], "Chefe de Equipe improperly accessed /usuarios"

        # Chefe de Equipe logout
        logout_resp_chefe = requests.post(f"{AUTH_URL}/logout", headers={"Authorization": f"Bearer {session_tokens['chefe_de_equipe']}", "apikey": API_KEY}, timeout=TIMEOUT)
        assert logout_resp_chefe.status_code in [200, 204], "Chefe de Equipe logout failed"

    except requests.RequestException as e:
        assert False, f"RequestException during test: {e}"


test_user_authentication_and_role_based_route_protection()
