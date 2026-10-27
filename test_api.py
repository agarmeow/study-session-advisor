"""Tests for FastAPI backend endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_api_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert data["framework"] == "FastAPI"


def test_api_get_data(client):
    res = client.get("/api/data")
    assert res.status_code == 200
    data = res.json()
    assert "tasks" in data
    assert "sessions" in data
    assert "preferences" in data


def test_api_recommendation(client):
    payload = {
        "sleep_hours": 7.0,
        "energy": 5.0,
        "energy_label": "Okay",
        "days_to_deadline": 2.0,
        "deadline_label": "In 2–3 Days (Near)",
        "difficulty": 6.0,
        "difficulty_label": "Medium",
        "task_name": "API Testing Session",
    }
    res = client.post("/api/recommendation", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "fuzzy" in data
    assert "adapted" in data
    assert "explanation" in data
    assert 15 <= data["adapted"]["final_study_minutes"] <= 90
    assert 5 <= data["adapted"]["final_break_minutes"] <= 20
    assert data["task_name"] == "API Testing Session"


def test_api_recommendation_validation_error(client):
    # sleep_hours > 12 should fail validation
    payload = {
        "sleep_hours": 15.0,
        "energy": 5.0,
        "days_to_deadline": 2.0,
        "difficulty": 6.0,
    }
    res = client.post("/api/recommendation", json=payload)
    assert res.status_code == 422


def test_api_tasks_crud(client):
    # Get current tasks
    res = client.get("/api/tasks")
    assert res.status_code == 200
    initial_count = len(res.json())

    # Create new task
    new_task = {
        "name": "Integration Test Task",
        "subject": "Testing",
        "estimated_duration": 35,
        "deadline_days": 1.5,
        "difficulty": 6.0,
        "importance": 8.0,
    }
    create_res = client.post("/api/tasks", json=new_task)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["name"] == "Integration Test Task"
    assert "priority_score" in created

    # Verify task was added
    res_after = client.get("/api/tasks")
    assert len(res_after.json()) == initial_count + 1

    # Delete the newly created task (last index)
    del_res = client.delete(f"/api/tasks/{len(res_after.json()) - 1}")
    assert del_res.status_code == 200


def test_api_schedule(client):
    payload = {
        "available_time_minutes": 120,
        "default_break_minutes": 10,
    }
    res = client.post("/api/schedule", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "blocks" in data
    assert data["available_budget_minutes"] == 120
    assert data["total_planned_time"] <= 120
    assert data["total_planned_time"] == data["total_study_time"] + data["total_break_time"]
    assert data["remaining_available_time"] == 120 - data["total_planned_time"]
    assert data["is_feasible"] is True


def test_api_schedule_regeneration_different_budgets(client):
    """Verify schedule recalculates correctly when budget changes from 60 to 240 to 345 minutes."""
    budgets = [60, 240, 345]
    prev_study_time = -1

    for b in budgets:
        payload = {
            "available_time_minutes": b,
            "default_break_minutes": 10,
        }
        res = client.post("/api/schedule", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["available_budget_minutes"] == b
        assert data["total_planned_time"] == data["total_study_time"] + data["total_break_time"]
        assert data["remaining_available_time"] == b - data["total_planned_time"]
        assert data["is_feasible"] is True
        # As budget increases, scheduled study time should be monotonically non-decreasing
        assert data["total_study_time"] >= prev_study_time
        prev_study_time = data["total_study_time"]


def test_api_schedule_invalid_input(client):
    """Verify invalid available time (< 1) is rejected."""
    payload = {
        "available_time_minutes": -30,
        "default_break_minutes": 10,
    }
    res = client.post("/api/schedule", json=payload)
    assert res.status_code == 422 or res.status_code == 400


def test_api_session_recording(client):
    payload = {
        "task_name": "Math Practice",
        "study_minutes": 30,
        "break_minutes": 10,
        "feedback": "Just right",
        "post_break_energy": "Better",
    }
    res = client.post("/api/sessions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["session"]["task_name"] == "Math Practice"
    assert "new_adaptation_offset" in data


def test_api_preferences_update(client):
    payload = {
        "study_time": "Morning",
        "focus_style": "Short bursts",
    }
    res = client.put("/api/preferences", json=payload)
    assert res.status_code == 200
    assert res.json()["preferences"]["focus_style"] == "Short bursts"


def test_api_technical_endpoints(client):
    curves_res = client.get("/api/technical/membership-data")
    assert curves_res.status_code == 200
    assert "advisor" in curves_res.json()

    rules_res = client.get("/api/technical/rules")
    assert rules_res.status_code == 200
    assert rules_res.json()["advisor_rules_count"] == 81
    assert rules_res.json()["task_rules_count"] == 27

    heatmaps_res = client.get("/api/technical/heatmaps?workload=5.0")
    assert heatmaps_res.status_code == 200
    assert "coverage" in heatmaps_res.json()
    assert "durations" in heatmaps_res.json()
