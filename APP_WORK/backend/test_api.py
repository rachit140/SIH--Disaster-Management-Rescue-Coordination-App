import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_root():
    response = client.get("/api/")
    assert response.status_code == 200
    assert response.json()["status"] == "online"

def test_sos_flow():
    response = client.post("/api/sos", json={
        "survivor_name": "Test Survivor",
        "status": "Need Urgent Help",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "details": "Trapped on roof"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["survivor_name"] == "Test Survivor"
    assert data["status"] == "Need Urgent Help"

    get_resp = client.get("/api/sos")
    assert get_resp.status_code == 200
    assert len(get_resp.json()) > 0

def test_announcements():
    response = client.get("/api/announcements")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_inventory():
    response = client.get("/api/inventory")
    assert response.status_code == 200
    assert len(response.json()) > 0
