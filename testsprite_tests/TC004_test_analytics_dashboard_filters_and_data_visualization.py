import requests
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5174"
API_KEY = "your_api_key_here"
BEARER_TOKEN = "your_bearer_token_here"
TIMEOUT = 30

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

def test_analytics_dashboard_filters_and_data_visualization():
    """
    Test the Dashboard Analytics page with various filters:
    base, equipe, periodo, colaborador, tipos de ocorrencia.
    Validate correct data retrieval, KPIs, charts, and rankings.
    """
    # Prepare filter parameters for testing
    base_id = 1  # Example base id
    equipe_id = 1  # Example equipe id
    colaborador_id = 1  # Example colaborador id
    tipo_ocorrencia_aeronautica = "Aeronáutica"
    tipo_ocorrencia_nao_aeronautica = "Não Aeronáutica"

    # Period filter - last 30 days (within 12 months limit)
    end_date = datetime.utcnow().date()
    start_date = end_date - timedelta(days=30)
    period = f"{start_date.isoformat()}_{end_date.isoformat()}"

    # Define API endpoint for analytics data
    analytics_endpoint = f"{BASE_URL}/api/analytics/dashboard"

    # Define multiple filter sets to test behavior
    filter_sets = [
        {"base": base_id},
        {"equipe": equipe_id},
        {"periodo": period},
        {"colaborador": colaborador_id},
        {"tiposOcorrencia": [tipo_ocorrencia_aeronautica]},
        {"tiposOcorrencia": [tipo_ocorrencia_nao_aeronautica]},
        {
            "base": base_id,
            "equipe": equipe_id,
            "periodo": period,
            "colaborador": colaborador_id,
            "tiposOcorrencia": [tipo_ocorrencia_aeronautica]
        }
    ]

    for filters in filter_sets:
        # For GET params, convert list filters to comma-separated strings
        params = {}
        for k, v in filters.items():
            if isinstance(v, list):
                params[k] = ",".join(v)
            else:
                params[k] = v

        # Send GET request with filters as query params
        response = requests.get(
            analytics_endpoint,
            headers=HEADERS,
            params=params,
            timeout=TIMEOUT
        )

        # Validate HTTP status code
        assert response.status_code == 200, (
            f"Failed for filters {filters}: "
            f"Status code {response.status_code}, Response: {response.text}"
        )

        data = response.json()

        # Validate presence of expected keys in response for dashboard analytics
        assert "kpis" in data, f"KPIs missing in response for filters {filters}"
        assert isinstance(data["kpis"], dict), f"KPIs should be a dict for filters {filters}"

        assert "charts" in data, f"Charts missing in response for filters {filters}"
        assert isinstance(data["charts"], dict), f"Charts should be a dict for filters {filters}"

        assert "ranking" in data, f"Ranking missing in response for filters {filters}"
        assert isinstance(data["ranking"], list), f"Ranking should be a list for filters {filters}"

        # Validate KPIs numeric and non-negative
        for kpi_key, kpi_value in data["kpis"].items():
            assert isinstance(kpi_value, (int, float)), f"KPI {kpi_key} should be numeric"
            assert kpi_value >= 0, f"KPI {kpi_key} should be non-negative"

        # Validate charts contain expected keys and data
        for chart_key, chart_data in data["charts"].items():
            assert isinstance(chart_data, dict), f"Chart {chart_key} should be dict"
            assert "data" in chart_data, f"Chart {chart_key} missing 'data' key"
            assert isinstance(chart_data["data"], list), f"Chart {chart_key} data should be a list"

            # If data points have time-series info, check chronological order if possible
            if len(chart_data["data"]) > 1 and "date" in chart_data["data"][0]:
                dates = [point.get("date") for point in chart_data["data"] if "date" in point]
                assert dates == sorted(dates), f"Chart {chart_key} dates not sorted"

        # Validate ranking list sorted descending by alert count/key metric if present
        if len(data["ranking"]) > 1:
            prev_value = None
            for item in data["ranking"]:
                assert "alertCount" in item or "metric" in item, "Ranking item lacks alertCount or metric"
                current_value = item.get("alertCount", item.get("metric", 0))
                assert isinstance(current_value, (int, float)), "Ranking metric not numeric"
                if prev_value is not None:
                    assert current_value <= prev_value, "Ranking not in descending order"
                prev_value = current_value

test_analytics_dashboard_filters_and_data_visualization()