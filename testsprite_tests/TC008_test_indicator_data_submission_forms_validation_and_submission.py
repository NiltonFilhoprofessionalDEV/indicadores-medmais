import requests
import datetime

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Authentication tokens (to be replaced with valid tokens for the test environment)
BEARER_TOKEN = "your_bearer_token_here"
API_KEY = "your_api_key_here"

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}


def test_indicator_data_submission_forms_validation_and_submission():
    """
    Test all indicator data submission forms for correct validation using Zod schemas,
    proper handling of date and time masks, and successful data submission to the backend.
    """

    # Define example valid payloads for indicators submitted via forms
    # Assuming typical fields common to indicator submission forms:
    # - date fields in ISO format
    # - time fields in HH:mm format or combined with date
    # - numeric or string fields validated by Zod schemas in backend

    # For demonstration, we create sample payloads for some common indicators.
    # These payloads must be adapted based on actual schema definitions.

    indicator_forms_payloads = [
        # Example: TAF indicator form submission payload
        {
            "endpoint": "/api/lancamentos/taf",
            "payload": {
                "data": datetime.date.today().isoformat(),  # date field
                "hora_inicio": "08:00",                     # time mask as string HH:mm
                "hora_fim": "12:00",
                "quantidade": 5,                            # numeric field
                "obs": "Teste de submissao TAF"
            }
        },
        # Example: Prova Teórica indicator form payload
        {
            "endpoint": "/api/lancamentos/prova-teorica",
            "payload": {
                "data": datetime.date.today().isoformat(),
                "num_aprovados": 10,
                "num_reprovados": 2,
                "observacoes": "Submissao teste Prova Teorica"
            }
        },
        # Example: Ocorrência Aeronáutica indicator form payload
        {
            "endpoint": "/api/lancamentos/ocorrencia-aeronautica",
            "payload": {
                "data": datetime.date.today().isoformat(),
                "tipo_ocorrencia": "Incidente",
                "descricao": "Teste Ocorrencia Aeronautica",
                "horario": "14:30"
            }
        },
        # Example: PTR-BA - Horas treinamento diário indicator form payload
        {
            "endpoint": "/api/lancamentos/horas-treinamento",
            "payload": {
                "data": datetime.date.today().isoformat(),
                "horas": 3.5,
                "instrutor": "Instrutor Teste",
                "descricao": "Teste Horas Treinamento"
            }
        }
        # Add more form payloads as needed to cover all indicators...
    ]

    created_ids = []  # To store IDs for cleanup

    try:
        for form in indicator_forms_payloads:
            url = BASE_URL + form["endpoint"]
            payload = form["payload"]

            # Step 1: Test server-side validation by sending wrong format and expect 400 or specific validation error
            # For example, sending wrong date format and invalid time format

            invalid_payload = payload.copy()

            # Inject date error (invalid date)
            invalid_payload["data"] = "2023-02-30"  # Invalid date

            # Inject invalid time mask if field present (looks for keys containing "hora" or "horario")
            for k in payload.keys():
                if "hora" in k or "horario" in k:
                    invalid_payload[k] = "25:61"

            response_invalid = requests.post(url, json=invalid_payload, headers=HEADERS, timeout=TIMEOUT)
            assert response_invalid.status_code == 400 or response_invalid.status_code == 422, (
                f"Expected validation error for invalid payload at {url}, got {response_invalid.status_code}"
            )
            assert "validation" in response_invalid.text.lower() or "error" in response_invalid.text.lower()

            # Step 2: Test successful submission with valid payload
            response = requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
            assert response.status_code == 201 or response.status_code == 200, (
                f"Expected success status on valid submission at {url}, got {response.status_code}"
            )
            data = response.json()
            assert "id" in data, "Response missing 'id' field on successful creation"
            created_ids.append((url, data["id"]))

        # Additional validations

        # Test that multiple submissions on the same day for a given indicator are allowed (idempotent inserts)
        # Using the first form as example
        test_form = indicator_forms_payloads[0]
        url = BASE_URL + test_form["endpoint"]
        payload = test_form["payload"]
        response_repeat = requests.post(url, json=payload, headers=HEADERS, timeout=TIMEOUT)
        assert response_repeat.status_code in (200, 201), "Multiple submissions on same day should be allowed"
        repeat_data = response_repeat.json()
        assert "id" in repeat_data
        created_ids.append((url, repeat_data["id"]))

    finally:
        # Cleanup: delete created resources to keep test environment clean
        for url_base, resource_id in created_ids:
            try:
                delete_url = f"{url_base}/{resource_id}"
                del_response = requests.delete(delete_url, headers=HEADERS, timeout=TIMEOUT)
                assert del_response.status_code == 200 or del_response.status_code == 204, (
                    f"Failed to delete resource {resource_id} at {delete_url}"
                )
            except Exception as e:
                # Log but do not fail cleanup if deletion fails
                print(f"Warning: could not delete resource {resource_id} at {delete_url}. Exception: {e}")


test_indicator_data_submission_forms_validation_and_submission()