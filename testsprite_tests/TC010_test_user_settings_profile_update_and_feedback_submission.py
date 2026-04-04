import requests
import uuid

BASE_URL = "http://localhost:5174"
TIMEOUT = 30

# Replace these with valid tokens/keys for authentication
BEARER_TOKEN = "your_valid_bearer_token_here"
API_KEY = "your_valid_api_key_here"

HEADERS = {
    "Authorization": f"Bearer {BEARER_TOKEN}",
    "x-api-key": API_KEY,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_user_settings_profile_update_and_feedback_submission():
    session = requests.Session()
    session.headers.update(HEADERS)

    # Helper function: create a test feedback to be deleted after test
    def create_feedback(feedback_payload):
        response = session.post(f"{BASE_URL}/user/settings/feedback", json=feedback_payload, timeout=TIMEOUT)
        response.raise_for_status()
        return response.json().get("id")

    # Helper function: delete feedback by id
    def delete_feedback(feedback_id):
        if feedback_id:
            resp = session.delete(f"{BASE_URL}/user/settings/feedback/{feedback_id}", timeout=TIMEOUT)
            if resp.status_code not in [200, 204]:
                raise Exception(f"Failed to delete feedback id {feedback_id}: {resp.status_code} {resp.text}")

    # Helper function: retrieve current user profile info
    def get_profile():
        r = session.get(f"{BASE_URL}/user/settings/profile", timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()

    # Helper function: update user profile
    def update_profile(payload):
        r = session.put(f"{BASE_URL}/user/settings/profile", json=payload, timeout=TIMEOUT)
        return r

    # Helper function: change password
    def change_password(payload):
        r = session.post(f"{BASE_URL}/user/settings/change-password", json=payload, timeout=TIMEOUT)
        return r

    # Step 1: Get current profile data
    profile = get_profile()
    assert "id" in profile and "email" in profile, "Profile retrieval failed or missing keys"
    user_id = profile["id"]

    # Prepare new profile data for update, toggle a field or change name temporarily
    new_name = f"Test User {uuid.uuid4().hex[:6]}"
    profile_update_payload = {
        "name": new_name,
        # Include other updatable fields as needed, assuming name is updatable
    }

    # Step 2: Update profile with valid data
    response = update_profile(profile_update_payload)
    assert response.status_code == 200, f"Failed to update profile: {response.status_code} {response.text}"
    updated_profile = response.json()
    assert updated_profile.get("name") == new_name, "Profile name not updated correctly"

    # Step 3: Attempt invalid profile update (e.g. invalid email format if email is updatable)
    invalid_profile_payload = {
        "email": "invalid-email-format"
    }
    response_invalid = update_profile(invalid_profile_payload)
    # Expect validation error (likely 400 or 422)
    assert response_invalid.status_code in [400,422], "Invalid profile update was not rejected"

    # Step 4: Change password with valid data
    # Assuming API requires old_password, new_password fields
    valid_password_payload = {
        "old_password": "current_password_here",
        "new_password": "NewP@ssw0rd2026"
    }
    response_pass = change_password(valid_password_payload)
    if response_pass.status_code == 403:
        # Possibly old password invalid for this token; skip password change
        pass
    else:
        assert response_pass.status_code == 200, f"Password change failed: {response_pass.status_code} {response_pass.text}"

    # Step 5: Change password with invalid data (e.g. weak new password)
    invalid_password_payload = {
        "old_password": "current_password_here",
        "new_password": "short"
    }
    response_pass_invalid = change_password(invalid_password_payload)
    assert response_pass_invalid.status_code in [400,422], "Weak password change was not rejected"

    # Step 6: Submit feedback with valid data and then delete it
    feedback_payload = {
        "type": "suggestion",
        "message": f"Automated test feedback message {uuid.uuid4()}",
        "status": "new"
    }
    feedback_id = None
    try:
        feedback_id = create_feedback(feedback_payload)
        assert feedback_id is not None, "Feedback creation did not return an ID"

        # Verify feedback retrieval (assuming feedback list endpoint)
        r_feedbacks = session.get(f"{BASE_URL}/user/settings/feedback", timeout=TIMEOUT)
        r_feedbacks.raise_for_status()
        feedback_list = r_feedbacks.json()
        assert any(f.get("id") == feedback_id for f in feedback_list), "Created feedback not found in feedback list"

        # Attempt invalid feedback submission (missing required fields)
        invalid_feedback_payload = {
            "type": "",  # invalid type empty
            # missing message
        }
        resp_invalid_fb = session.post(f"{BASE_URL}/user/settings/feedback", json=invalid_feedback_payload, timeout=TIMEOUT)
        assert resp_invalid_fb.status_code in [400,422], "Invalid feedback submission was not rejected"
    finally:
        # Clean up created feedback
        delete_feedback(feedback_id)

    # Step 7: Role-based access control check for profile update feedback endpoints
    # Here assume that token belongs to authorized user; test forbidden update/delete for invalid id or forbidden resource.
    forbidden_update_payload = { "name": "Hacker Name" }
    # Attempt to update another user profile (simulate with made-up user ID)
    forbidden_profile_update_resp = session.put(f"{BASE_URL}/user/settings/profile/invalid-or-other-user-id", json=forbidden_update_payload, timeout=TIMEOUT)
    # Depending on API design, could be 404 or 403
    assert forbidden_profile_update_resp.status_code in [403,404], "Unauthorized profile update was not blocked"

    # Attempt to delete feedback without permission (simulate with invalid feedback id)
    forbidden_delete_response = session.delete(f"{BASE_URL}/user/settings/feedback/invalid-or-other-feedback-id", timeout=TIMEOUT)
    assert forbidden_delete_response.status_code in [403,404], "Unauthorized feedback deletion was not blocked"


test_user_settings_profile_update_and_feedback_submission()