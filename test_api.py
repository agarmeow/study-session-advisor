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


def test_api_session_completion_and_feedback_flow(client):
    """Test full finish session, feedback adaptation, and duplicate prevention flow."""
    # 1. Finish session early without feedback
    session_payload = {
        "task_name": "Compiler Design",
        "study_minutes": 20,
        "planned_study_minutes": 25,
        "actual_study_minutes": 20,
        "break_minutes": 5,
        "completion_time": "02:00 AM",
    }
    rec_res = client.post("/api/sessions", json=session_payload)
    assert rec_res.status_code == 200
    sess_data = rec_res.json()
    created_sess = sess_data["session"]
    sess_id = created_sess["id"]
    initial_offset = sess_data["new_adaptation_offset"]

    assert created_sess["task_name"] == "Compiler Design"
    assert created_sess["study_minutes"] == 20
    assert created_sess["planned_study_minutes"] == 25
    assert created_sess["actual_study_minutes"] == 20
    assert created_sess["break_minutes"] == 5
    assert created_sess["completion_time"] == "02:00 AM"
    assert created_sess["feedback"] is None

    # 2. Submit "Too Short" feedback
    fb_payload = {
        "session_id": sess_id,
        "feedback": "Too Short",
        "post_break_energy": "Better",
    }
    fb_res = client.post("/api/feedback", json=fb_payload)
    assert fb_res.status_code == 200
    fb_data = fb_res.json()
    assert fb_data["already_submitted"] is False
    assert fb_data["session"]["feedback"] == "Too short"
    expected_new_offset = min(15, initial_offset + 5)
    assert fb_data["new_adaptation_offset"] == expected_new_offset
    assert fb_data["last_feedback"] == "Too short"

    # 3. Duplicate submission attempt on same session must be blocked
    fb_res_dup = client.post(f"/api/sessions/{sess_id}/feedback", json=fb_payload)
    assert fb_res_dup.status_code == 200
    dup_data = fb_res_dup.json()
    assert dup_data["already_submitted"] is True
    # Offset must not increment again
    assert dup_data["new_adaptation_offset"] == expected_new_offset

    # 4. Verify subsequent study recommendation incorporates updated offset
    rec_req = {
        "sleep_hours": 7.0,
        "energy": 5.0,
        "days_to_deadline": 2.0,
        "difficulty": 5.0,
        "task_name": "Next Subject",
    }
    rec_resp = client.post("/api/recommendation", json=rec_req)
    assert rec_resp.status_code == 200
    rec_json = rec_resp.json()
    assert rec_json["adapted"]["adaptation_offset"] == expected_new_offset

