from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_options_preflight():
    response = client.options(
        "/profile",
        headers={
            "Origin": "http://localhost:3003",
            "Access-Control-Request-Method": "PUT",
            "Access-Control-Request-Headers": "authorization, content-type",
        },
    )
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3003"
    assert "PUT" in response.headers.get("access-control-allow-methods", "")
