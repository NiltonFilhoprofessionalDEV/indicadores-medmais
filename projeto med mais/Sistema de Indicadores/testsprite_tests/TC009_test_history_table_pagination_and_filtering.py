import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

API_KEY = "your_api_key_here"
BEARER_TOKEN = "your_bearer_token_here"

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

def test_history_table_pagination_and_filtering():
    # Prepare filter parameters
    indicator = "TAF"  # Typical indicator example
    today = datetime.utcnow().date()
    period_start = (today - timedelta(days=30)).isoformat()
    period_end = today.isoformat()

    page_size = 20

    try:
        # Step 1: Test pagination with filter indicators and period using GET with query params

        params_page_1 = {
            "indicator": indicator,
            "periodStart": period_start,
            "periodEnd": period_end,
            "page": 1,
            "pageSize": page_size
        }
        response_1 = requests.get(
            f"{BASE_URL}/history",
            headers=HEADERS,
            params=params_page_1,
            timeout=TIMEOUT
        )
        assert response_1.status_code == 200, f"Expected 200 OK, got {response_1.status_code}"
        data_1 = response_1.json()
        assert isinstance(data_1, dict), "Response should be a dict"
        assert "records" in data_1, "'records' key missing in response"
        assert isinstance(data_1["records"], list), "'records' should be a list"
        assert len(data_1["records"]) <= page_size, f"Returned records exceed page size {page_size}"

        # Validate records match filter criteria if any records exist
        for record in data_1["records"]:
            assert "indicator" in record, "Record missing 'indicator' field"
            assert record["indicator"] == indicator, f"Record indicator mismatch: expected {indicator}"
            assert "date" in record, "Record missing 'date' field"
            record_date = record["date"][:10]
            assert period_start <= record_date <= period_end, f"Record date {record_date} outside filter range"

            assert "actions" in record or "canEdit" in record or "canDelete" in record, "Permission-based actions info missing"

        # Step 2: Test pagination page 2 if enough records exist on page 1
        if len(data_1["records"]) == page_size:
            params_page_2 = params_page_1.copy()
            params_page_2["page"] = 2
            response_2 = requests.get(
                f"{BASE_URL}/history",
                headers=HEADERS,
                params=params_page_2,
                timeout=TIMEOUT
            )
            assert response_2.status_code == 200, f"Expected 200 OK on page 2, got {response_2.status_code}"
            data_2 = response_2.json()
            assert isinstance(data_2, dict), "Response on page 2 should be a dict"
            assert "records" in data_2, "'records' key missing in page 2 response"
            assert isinstance(data_2["records"], list), "'records' on page 2 should be a list"

            records_page_1_ids = {r.get("id") for r in data_1["records"] if "id" in r}
            records_page_2_ids = {r.get("id") for r in data_2["records"] if "id" in r}
            assert not records_page_1_ids.intersection(records_page_2_ids), "Records overlap between page 1 and page 2"

        # Step 3: Test filtering by a different indicator or period expecting empty or valid response
        alternative_indicator = "ProvaTeorica"
        alt_params = {
            "indicator": alternative_indicator,
            "periodStart": (today - timedelta(days=15)).isoformat(),
            "periodEnd": today.isoformat(),
            "page": 1,
            "pageSize": page_size
        }
        response_alt = requests.get(
            f"{BASE_URL}/history",
            headers=HEADERS,
            params=alt_params,
            timeout=TIMEOUT
        )
        assert response_alt.status_code == 200, f"Expected 200 OK for alternative filter, got {response_alt.status_code}"
        data_alt = response_alt.json()
        assert "records" in data_alt, "'records' key missing in alternative filter response"
        for record in data_alt["records"]:
            assert record["indicator"] == alternative_indicator, f"Alternative filter record indicator mismatch"
            rec_date = record["date"][:10]
            assert alt_params["periodStart"] <= rec_date <= alt_params["periodEnd"], "Alternative filter record date outside range"

    except requests.RequestException as e:
        assert False, f"HTTP request failed: {e}"
    except AssertionError as ae:
        raise ae

test_history_table_pagination_and_filtering()
