import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# These should be replaced with valid tokens for a user with Gerente Geral role and a valid API key for the service.
BEARER_TOKEN = "your_valid_gerente_geral_bearer_token"
API_KEY = "your_valid_api_key"

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Accept": "application/json",
}

def test_gerente_geral_dashboard_access_and_functionality():
    try:
        # Access Dashboard Gerente main page data endpoint
        dashboard_url = f"{BASE_URL}/api/dashboard/gerente"
        resp = requests.get(dashboard_url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        dashboard_data = resp.json()

        # Check response basic structure and keys expected for Gerente Geral dashboard
        assert isinstance(dashboard_data, dict), "Dashboard data should be a JSON object"
        # Expect keys indicating administrative panels and stats are present
        expected_keys = [
            "userRole", "panels", "analyticsSummary", "userManagementAccess", 
            "colaboradoresManagementAccess", "complianceAlerts", "historicalLaunches"
        ]
        for key in expected_keys:
            assert key in dashboard_data, f"Expected key '{key}' in dashboard data"

        # Validate user role is "Gerente Geral"
        assert dashboard_data.get("userRole") == "Gerente Geral", "User role should be Gerente Geral"

        # Check administrative functionalities accessibility flags are True
        assert dashboard_data.get("userManagementAccess") is True, "User management access must be granted"
        assert dashboard_data.get("colaboradoresManagementAccess") is True, "Colaboradores management access must be granted"

        # Check analyticsSummary has expected sub-keys generally present
        analytics_keys = ["kpis", "charts", "alerts"]
        analytics_summary = dashboard_data.get("analyticsSummary", {})
        for key in analytics_keys:
            assert key in analytics_summary, f"Analytics summary missing '{key}'"

        # Check compliance alerts structure if present
        compliance_alerts = dashboard_data.get("complianceAlerts", [])
        assert isinstance(compliance_alerts, list), "Compliance alerts should be a list"

        # Verify historicalLaunches pagination info or list
        historical = dashboard_data.get("historicalLaunches")
        assert historical is not None, "Historical launches section must be present"

        # Optionally, test an admin operation endpoint access (like listing users)
        users_url = f"{BASE_URL}/api/admin/users"
        users_resp = requests.get(users_url, headers=HEADERS, timeout=TIMEOUT)
        users_resp.raise_for_status()
        users_data = users_resp.json()
        assert isinstance(users_data, list), "Users data should be a list"
        assert len(users_data) >= 0, "Users list should be present"

    except requests.exceptions.HTTPError as http_err:
        assert False, f"HTTP error occurred: {http_err}"
    except requests.exceptions.RequestException as req_err:
        assert False, f"Request error occurred: {req_err}"
    except AssertionError:
        raise
    except Exception as err:
        assert False, f"Unexpected error occurred: {err}"

test_gerente_geral_dashboard_access_and_functionality()