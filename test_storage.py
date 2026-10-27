"""Tests for storage, preferences, and feedback adaptation."""

import json
import os
import pytest
from storage import (
    load_user_data,
    save_user_data,
    apply_adaptation_and_preferences,
    record_session,
    export_history_json,
    export_sessions_csv,
    get_default_data,
)


def test_default_data_structure():
    data = get_default_data()
    assert "tasks" in data
    assert "sessions" in data
    assert "preferences" in data
    assert "adaptation_offset" in data
    assert len(data["tasks"]) >= 1


def test_save_and_load_round_trip(tmp_path):
    test_file = str(tmp_path / "test_user_data.json")
    data = get_default_data()
    data["adaptation_offset"] = 10
    data["preferences"]["focus_style"] = "Short bursts"

    save_user_data(data, filepath=test_file)
    loaded = load_user_data(filepath=test_file)

    assert loaded["adaptation_offset"] == 10
    assert loaded["preferences"]["focus_style"] == "Short bursts"


def test_feedback_adaptation_bounds():
    data = get_default_data()
    assert data["adaptation_offset"] == 0

    # 4 consecutive "Too short" should cap at +15
    for _ in range(4):
        record_session(data, "Math", 30, 5, feedback="Too short", filepath=None)
    assert data["adaptation_offset"] == 15

    # 8 consecutive "Too long" should cap at -15
    for _ in range(8):
        record_session(data, "Math", 30, 5, feedback="Too long", filepath=None)
    assert data["adaptation_offset"] == -15


def test_preference_adjustment_short_bursts():
    pref = {"focus_style": "Short bursts"}
    res = apply_adaptation_and_preferences(
        base_study_minutes=50,
        base_break_minutes=10,
        intensity="Moderate study",
        preferences=pref,
        adaptation_offset=0,
    )
    assert res["final_study_minutes"] < 50
    assert "Short bursts" in res["adjustment_explanation"]


def test_preference_adjustment_light_revision_preserves_gentle_session():
    pref = {"focus_style": "Longer sessions"}
    res = apply_adaptation_and_preferences(
        base_study_minutes=25,
        base_break_minutes=15,
        intensity="Light revision",
        preferences=pref,
        adaptation_offset=0,
    )
    # Shouldn't stretch light revision excessively
    assert res["final_study_minutes"] == 25
    assert "light revision" in res["adjustment_explanation"]


def test_export_json_and_csv():
    data = get_default_data()
    record_session(data, "Test Task", 25, 5, feedback="Just right", post_break_energy="Better", filepath=None)

    json_str = export_history_json(data)
    parsed = json.loads(json_str)
    assert len(parsed["sessions"]) == 1

    csv_str = export_sessions_csv(data)
    assert "Test Task" in csv_str
    assert "Just right" in csv_str
    assert "Better" in csv_str
