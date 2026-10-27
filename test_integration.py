"""End-to-end Integration Tests for Fuzzy Study Intelligence System."""

import pytest
from fuzzy_advisor import infer_study_advice
from task_prioritizer import Task, prioritize_tasks
from scheduler import schedule_tasks_gbfs
from storage import (
    apply_adaptation_and_preferences,
    record_session,
    export_history_json,
    export_sessions_csv,
    get_default_data,
)


def test_full_student_study_flow():
    # 1. Student inputs state
    sleep = 6.5
    energy = 5.0
    deadline = 2.0
    difficulty = 6.0

    # 2. Compute fuzzy advice
    advice = infer_study_advice(sleep, energy, deadline, difficulty)
    assert 15 <= advice["study_minutes"] <= 90
    assert 5 <= advice["break_minutes"] <= 20
    assert advice["intensity"] in {"Light revision", "Moderate study", "Challenging material"}

    # 3. Apply preferences
    prefs = {"focus_style": "Short bursts", "study_time": "Morning"}
    adapted = apply_adaptation_and_preferences(
        base_study_minutes=advice["study_minutes"],
        base_break_minutes=advice["break_minutes"],
        intensity=advice["intensity"],
        preferences=prefs,
        adaptation_offset=0,
    )
    assert adapted["final_study_minutes"] <= advice["study_minutes"]

    # 4. Record completed session and provide feedback
    data = get_default_data()
    record_session(
        data=data,
        task_name="Operating Systems Lab",
        study_minutes=adapted["final_study_minutes"],
        break_minutes=adapted["final_break_minutes"],
        feedback="Too short",
        post_break_energy="Better",
        filepath=None,
    )
    assert len(data["sessions"]) == 1
    assert data["adaptation_offset"] == 5

    # 5. Subsequent recommendation should reflect feedback adaptation
    adapted2 = apply_adaptation_and_preferences(
        base_study_minutes=advice["study_minutes"],
        base_break_minutes=advice["break_minutes"],
        intensity=advice["intensity"],
        preferences=prefs,
        adaptation_offset=data["adaptation_offset"],
    )
    assert "past session feedback" in adapted2["adjustment_explanation"]


def test_full_task_scheduling_flow():
    # Create multiple coursework tasks
    tasks = [
        Task(name="Math Assignment", estimated_duration=45, deadline_days=1, difficulty=7, importance=8),
        Task(name="History Essay", estimated_duration=60, deadline_days=4, difficulty=4, importance=5),
        Task(name="CS Coding Project", estimated_duration=50, deadline_days=0.5, difficulty=8, importance=9),
    ]

    # Prioritize using fuzzy inference
    ranked = prioritize_tasks(tasks)
    assert ranked[0].name == "CS Coding Project"  # Most urgent & high importance

    # Schedule using Greedy Best-First Search with 120 minutes available
    schedule = schedule_tasks_gbfs(
        tasks=ranked,
        available_time_minutes=120,
        default_break_minutes=10,
    )

    # 50m (CS) + 10m break + 45m (Math) = 105m <= 120m
    # History Essay (60m) will not fit (would require 105 + 10 + 60 = 175m)
    assert len(schedule.scheduled_tasks) == 2
    assert schedule.scheduled_tasks[0].name == "CS Coding Project"
    assert schedule.scheduled_tasks[1].name == "Math Assignment"
    assert schedule.total_planned_time <= 120
    assert len(schedule.unscheduled_tasks) == 1
    assert schedule.unscheduled_tasks[0]["task"].name == "History Essay"
    assert "Requires 60 min" in schedule.unscheduled_tasks[0]["reason"]
