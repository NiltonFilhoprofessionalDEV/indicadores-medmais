import requests

BASE_URL = "http://localhost:5174"
API_KEY = "your_api_key_here"  # Replace with a valid API key
BEARER_TOKEN = "your_bearer_token_here"  # Replace with a valid Bearer token

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

def test_compliance_monitoring_and_adherence_alerts():
    """
    Check the compliance and adherence monitoring system for bases and indicators,
    ensuring that visual alerts for non-compliance and inactive users are displayed correctly.
    """
    compliance_endpoint = f"{BASE_URL}/monitoramento/aderencia"  # assumed endpoint for adherence monitoring
    
    try:
        response = requests.get(compliance_endpoint, headers=HEADERS, timeout=30)
    except requests.RequestException as e:
        assert False, f"Request to compliance monitoring endpoint failed: {e}"

    # Validate response status code
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"

    content_type = response.headers.get("Content-Type", "")
    assert "application/json" in content_type.lower(), f"Expected 'application/json' content type, got '{content_type}'"

    content_text = response.text.strip()
    assert content_text != "", "Response content is empty"

    try:
        data = response.json()
    except ValueError as e:
        assert False, f"Response is not valid JSON: {e}"

    assert isinstance(data, (dict, list)), "Response JSON root should be dict or list"

    alert_keys = {"baseId", "baseName", "complianceStatus", "alerts", "inactiveUsers"}

    if isinstance(data, dict):
        present_keys = set(data.keys())
        assert alert_keys.intersection(present_keys), f"Expected keys {alert_keys} not found in response"
        alerts = data.get("alerts")
        inactive_users = data.get("inactiveUsers")
        assert alerts is not None, "Expected 'alerts' in response"
        assert inactive_users is not None, "Expected 'inactiveUsers' in response"
    elif isinstance(data, list):
        assert len(data) > 0, "Compliance data list is empty"
        for entry in data:
            assert isinstance(entry, dict), "Each compliance entry must be a dict"
            present_keys = set(entry.keys())
            assert alert_keys.intersection(present_keys), f"Expected keys {alert_keys} not found in entry"
            alerts = entry.get("alerts")
            inactive_users = entry.get("inactiveUsers")
            assert alerts is not None, "'alerts' field missing in compliance entry"
            assert inactive_users is not None, "'inactiveUsers' field missing in compliance entry"
            assert isinstance(alerts, (list, dict)), "'alerts' should be list or dict"
            assert isinstance(inactive_users, (int, list, dict)), "'inactiveUsers' should be int, list or dict"
    else:
        assert False, "Unexpected response format for compliance data"

    non_compliant_found = False
    if isinstance(data, dict):
        if data.get("complianceStatus") and data["complianceStatus"].lower() == "non-compliant":
            non_compliant_found = True
    else:
        for entry in data:
            status = entry.get("complianceStatus", "").lower()
            if status == "non-compliant":
                non_compliant_found = True
                break


test_compliance_monitoring_and_adherence_alerts()
