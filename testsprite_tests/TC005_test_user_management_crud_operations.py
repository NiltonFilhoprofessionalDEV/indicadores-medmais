import requests
import uuid

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Authentication tokens (these should be valid for the test environment)
BEARER_TOKEN = "your_bearer_token_here"
API_KEY = "your_api_key_here"

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

def test_user_management_crud_operations():
    created_user_ids = []

    def create_user(payload):
        response = requests.post(
            f"{BASE_URL}/api/users",
            headers=HEADERS,
            json=payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        user_data = response.json()
        assert "id" in user_data, "User ID not returned on creation"
        created_user_ids.append(user_data["id"])
        return user_data

    def bulk_create_users(users_payload):
        response = requests.post(
            f"{BASE_URL}/api/users/bulk",
            headers=HEADERS,
            json=users_payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        bulk_data = response.json()
        assert isinstance(bulk_data, list) and len(bulk_data) == len(users_payload), "Bulk creation failed or incomplete"
        ids = [user.get("id") for user in bulk_data if "id" in user]
        created_user_ids.extend(ids)
        return bulk_data

    def list_users():
        response = requests.get(
            f"{BASE_URL}/api/users",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        users_list = response.json()
        assert isinstance(users_list, list), "User listing did not return a list"
        return users_list

    def get_user(user_id):
        response = requests.get(
            f"{BASE_URL}/api/users/{user_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        user = response.json()
        assert user.get("id") == user_id, "Fetched user ID mismatch"
        return user

    def update_user(user_id, update_payload):
        response = requests.put(
            f"{BASE_URL}/api/users/{user_id}",
            headers=HEADERS,
            json=update_payload,
            timeout=TIMEOUT
        )
        response.raise_for_status()
        updated_user = response.json()
        assert updated_user.get("id") == user_id, "Updated user ID mismatch"
        return updated_user

    def delete_user(user_id):
        response = requests.delete(
            f"{BASE_URL}/api/users/{user_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        # For delete, 204 No Content or 200 OK expected
        assert response.status_code in (200, 204), f"Failed to delete user {user_id}"

    def test_form_validation_invalid_user_creation():
        invalid_payloads = [
            {},  # Empty payload
            {"email": "not-an-email", "name": "Test User", "role": "Gerente Geral"},  # Invalid email
            {"email": "valid@example.com", "name": "", "role": "Chefe de Equipe"},  # Empty name
            {"email": "valid@example.com", "name": "Test User", "role": "InvalidRole"}  # Invalid role
        ]
        for payload in invalid_payloads:
            resp = requests.post(
                f"{BASE_URL}/api/users",
                headers=HEADERS,
                json=payload,
                timeout=TIMEOUT
            )
            assert resp.status_code == 400, f"Invalid user payload should return 400, got {resp.status_code}"

    # Begin test logic
    try:
        # 1. Test individual user creation
        user_payload = {
            "email": f"user{str(uuid.uuid4())[:8]}@example.com",
            "name": "User Test",
            "role": "Gerente Geral"
        }
        created_user = create_user(user_payload)
        user_id = created_user["id"]

        # 2. Test fetching the created user
        fetched_user = get_user(user_id)
        assert fetched_user["email"] == user_payload["email"]
        assert fetched_user["name"] == user_payload["name"]
        assert fetched_user["role"] == user_payload["role"]

        # 3. Test update user
        update_payload = {
            "name": "User Test Updated",
            "role": "Chefe de Equipe"
        }
        updated_user = update_user(user_id, update_payload)
        assert updated_user["name"] == update_payload["name"]
        assert updated_user["role"] == update_payload["role"]

        # 4. Test list users includes the created user
        users = list_users()
        assert any(u["id"] == user_id for u in users), "Created user not found in listing"

        # 5. Test bulk user creation
        bulk_users_payload = [
            {
                "email": f"bulkuser{str(uuid.uuid4())[:8]}@example.com",
                "name": "Bulk User One",
                "role": "Gerente Geral"
            },
            {
                "email": f"bulkuser{str(uuid.uuid4())[:8]}@example.com",
                "name": "Bulk User Two",
                "role": "Chefe de Equipe"
            }
        ]
        bulk_created = bulk_create_users(bulk_users_payload)
        assert len(bulk_created) == 2

        # 6. Validate each bulk user data (basic checks)
        for i, user in enumerate(bulk_created):
            assert user["email"] == bulk_users_payload[i]["email"]
            assert user["role"] == bulk_users_payload[i]["role"]

        # 7. Test form validation for creation with invalid data
        test_form_validation_invalid_user_creation()

        # 8. Test role-based access: try to edit user with invalid role or missing permissions
        # For this test, we assume API returns 403 Forbidden if role lacks permission
        # Here we simulate by sending an invalid role in update and expect 400 validation failure already done above
        # So, simulate an unauthorized action by removing / changing token headers would be environment specific
        # Hence only a placeholder check for the purpose of demonstration

        # 9. Clean-up individual and bulk users (done in finally)

    finally:
        # Cleanup created users
        for uid in created_user_ids:
            try:
                delete_user(uid)
            except Exception:
                # If deletion failed, continue cleaning others
                pass

test_user_management_crud_operations()