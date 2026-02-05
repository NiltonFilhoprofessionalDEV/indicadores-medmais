import requests

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Authentication tokens (replace with valid tokens for real testing)
BEARER_TOKEN = "your_valid_bearer_token_here"
API_KEY = "your_valid_api_key_here"

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}


def test_colaborador_management_functionality():
    colaborador_id = None
    batch_ids = []
    base_id = None
    equipe_id = None

    try:
        # 1. Create a base to associate colaboradores
        base_payload = {
            "nome": "Base Teste API",
            "localizacao": "Location Teste"
        }
        resp = requests.post(
            f"{BASE_URL}/bases",
            json=base_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp.status_code == 201, f"Base creation failed: {resp.text}"
        base = resp.json()
        base_id = base.get("id")
        assert base_id is not None, "Base ID not returned"
        assert base.get("nome") == base_payload["nome"]

        # 2. Create a team (equipe) to associate colaboradores
        equipe_payload = {
            "nome": "Equipe Teste API",
            "base_id": base_id
        }
        resp = requests.post(
            f"{BASE_URL}/equipes",
            json=equipe_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp.status_code == 201, f"Equipe creation failed: {resp.text}"
        equipe = resp.json()
        equipe_id = equipe.get("id")
        assert equipe_id is not None, "Equipe ID not returned"
        assert equipe.get("nome") == equipe_payload["nome"]
        assert equipe.get("base_id") == base_id

        # 3. Create individual colaborador
        colaborador_payload = {
            "nome": "Colaborador Teste",
            "email": "colaborador.teste@example.com",
            "base_id": base_id,
            "equipe_id": equipe_id,
            "role": "bombeiro"
        }
        resp = requests.post(
            f"{BASE_URL}/colaboradores",
            json=colaborador_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp.status_code == 201, f"Colaborador creation failed: {resp.text}"
        colaborador = resp.json()
        colaborador_id = colaborador.get("id")
        assert colaborador_id is not None, "Colaborador ID not returned"
        assert colaborador.get("nome") == colaborador_payload["nome"]
        assert colaborador.get("email") == colaborador_payload["email"]
        assert colaborador.get("base_id") == base_id
        assert colaborador.get("equipe_id") == equipe_id

        # 4. Edit the colaborador
        update_payload = {
            "nome": "Colaborador Teste Editado",
            "email": "colaborador.editado@example.com"
        }
        resp = requests.put(
            f"{BASE_URL}/colaboradores/{colaborador_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Colaborador update failed: {resp.text}"
        updated = resp.json()
        assert updated.get("nome") == update_payload["nome"]
        assert updated.get("email") == update_payload["email"]

        # 5. Batch add colaboradores (simulate batch addition)
        batch_payload = {
            "colaboradores": [
                {
                    "nome": "Batch Colaborador 1",
                    "email": "batch1@example.com",
                    "base_id": base_id,
                    "equipe_id": equipe_id,
                    "role": "bombeiro"
                },
                {
                    "nome": "Batch Colaborador 2",
                    "email": "batch2@example.com",
                    "base_id": base_id,
                    "equipe_id": equipe_id,
                    "role": "bombeiro"
                }
            ]
        }
        resp = requests.post(
            f"{BASE_URL}/colaboradores/batch",
            json=batch_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp.status_code == 201, f"Batch creation failed: {resp.text}"
        batch_created = resp.json()
        assert isinstance(batch_created, list) and len(batch_created) == 2, "Batch creation returned invalid data"
        for c in batch_created:
            batch_ids.append(c.get("id"))
            assert c.get("base_id") == base_id
            assert c.get("equipe_id") == equipe_id

        # 6. Edit one from batch
        if batch_ids:
            edit_id = batch_ids[0]
            edit_payload = {
                "nome": "Batch Colaborador 1 Editado",
                "email": "batch1.editado@example.com"
            }
            resp = requests.put(
                f"{BASE_URL}/colaboradores/{edit_id}",
                json=edit_payload,
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert resp.status_code == 200, f"Batch colaborador update failed: {resp.text}"
            edited = resp.json()
            assert edited.get("nome") == edit_payload["nome"]
            assert edited.get("email") == edit_payload["email"]

        # 7. List colaboradores filtered by base and equipe
        params = {"base_id": base_id, "equipe_id": equipe_id}
        resp = requests.get(
            f"{BASE_URL}/colaboradores",
            headers=HEADERS,
            params=params,
            timeout=TIMEOUT
        )
        assert resp.status_code == 200, f"Colaboradores listing failed: {resp.text}"
        colaboradores_list = resp.json()
        assert isinstance(colaboradores_list, list)
        ids_listed = [c.get("id") for c in colaboradores_list]
        assert colaborador_id in ids_listed
        for bid in batch_ids:
            assert bid in ids_listed

        # 8. Delete individual colaborador
        resp = requests.delete(
            f"{BASE_URL}/colaboradores/{colaborador_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp.status_code == 204, f"Colaborador deletion failed: {resp.text}"
        colaborador_id = None  # Mark as deleted

        # 9. Batch delete colaboradores
        for bid in batch_ids:
            resp = requests.delete(
                f"{BASE_URL}/colaboradores/{bid}",
                headers=HEADERS,
                timeout=TIMEOUT
            )
            assert resp.status_code == 204, f"Batch colaborador deletion failed for id {bid}: {resp.text}"
        batch_ids = []

    finally:
        # Cleanup in case of failure or partial success
        if colaborador_id:
            try:
                requests.delete(
                    f"{BASE_URL}/colaboradores/{colaborador_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass
        for bid in batch_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/colaboradores/{bid}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass
        if equipe_id:
            try:
                requests.delete(
                    f"{BASE_URL}/equipes/{equipe_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass
        if base_id:
            try:
                requests.delete(
                    f"{BASE_URL}/bases/{base_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass


test_colaborador_management_functionality()
