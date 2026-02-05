import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Replace these with valid credentials or tokens for a user with Chefe de Equipe role
BEARER_TOKEN = "your_valid_chefe_de_equipe_bearer_token_here"
API_KEY = "your_valid_api_key_here"

def test_chefe_de_equipe_dashboard_access_and_restrictions():
    headers = {
        "Authorization": f"Bearer {BEARER_TOKEN}",
        "x-api-key": API_KEY,
        "Accept": "application/json"
    }

    try:
        # Access Dashboard Chefe page endpoint (assuming /dashboard/chefe as standard REST endpoint)
        response = requests.get(f"{BASE_URL}/dashboard/chefe", headers=headers, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}"

        data = response.json()

        # Validate dashboard keys that should be present for Chefe de Equipe role
        required_keys = [
            "operational_view",
            "launch_history",
            "analytics_module_link",
            "restricted_access_confirmed"
        ]

        for key in required_keys:
            assert key in data, f"Missing required dashboard key: {key}"

        # Check that restricted functionalities are not accessible
        # For example, no 'user_management' or 'full_admin_controls' keys
        forbidden_keys = [
            "user_management",
            "full_admin_controls",
            "gerente_features"
        ]

        for key in forbidden_keys:
            assert key not in data, f"Restricted functionality '{key}' should not be accessible by Chefe de Equipe"

        # Additionally, verify role in response if available
        role = data.get("user_role")
        assert role == "Chefe de Equipe", f"Expected role 'Chefe de Equipe', got '{role}'"

    except requests.RequestException as e:
        assert False, f"Request failed: {e}"
    except ValueError as ve:
        assert False, f"Invalid JSON response: {ve}"

test_chefe_de_equipe_dashboard_access_and_restrictions()