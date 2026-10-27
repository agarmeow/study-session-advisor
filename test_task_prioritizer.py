"""Tests for Fuzzy Task Prioritizer."""

import pytest
from task_prioritizer import (
    Task,
    calculate_task_priority,
    prioritize_task,
    prioritize_tasks,
    TASK_RULES,
)


def test_task_rule_base_completeness():
    assert len(TASK_RULES) == 27
    antecedents = [(u, i, d) for u, i, d, _ in TASK_RULES]
    assert len(set(antecedents)) == 27


def test_urgent_high_importance_is_high_priority():
    result = calculate_task_priority(deadline_days=0.5, importance=9.0, difficulty=8.0)
    assert result["priority_level"] == "High Priority"
    assert result["priority_score"] >= 70.0
    assert "deadline is imminent" in result["priority_reason"]


def test_non_urgent_low_importance_is_low_priority():
    result = calculate_task_priority(deadline_days=14.0, importance=2.0, difficulty=2.0)
    assert result["priority_level"] == "Low Priority"
    assert result["priority_score"] < 42.0


def test_hard_difficulty_alone_does_not_make_high_priority():
    # Relaxed deadline (15 days), low importance (2.0), but very hard (10.0)
    result = calculate_task_priority(deadline_days=15.0, importance=2.0, difficulty=10.0)
    assert result["priority_level"] == "Low Priority"
    assert result["priority_score"] < 45.0


def test_task_model_validation():
    with pytest.raises(ValueError, match="Task name cannot be empty"):
        Task(name="", estimated_duration=30, deadline_days=2, difficulty=5, importance=5)

    with pytest.raises(ValueError, match="Estimated duration"):
        Task(name="Math", estimated_duration=0, deadline_days=2, difficulty=5, importance=5)

    with pytest.raises(ValueError, match="Days to deadline"):
        Task(name="Math", estimated_duration=30, deadline_days=-1, difficulty=5, importance=5)

    with pytest.raises(ValueError, match="Difficulty"):
        Task(name="Math", estimated_duration=30, deadline_days=2, difficulty=11, importance=5)

    with pytest.raises(ValueError, match="Importance"):
        Task(name="Math", estimated_duration=30, deadline_days=2, difficulty=5, importance=-2)


def test_empty_task_list():
    assert prioritize_tasks([]) == []


def test_multiple_tasks_sorted_correctly():
    t1 = Task(name="Relaxed Low", estimated_duration=30, deadline_days=14, difficulty=3, importance=2)
    t2 = Task(name="Urgent High", estimated_duration=45, deadline_days=0.5, difficulty=8, importance=9)
    t3 = Task(name="Medium", estimated_duration=40, deadline_days=3, difficulty=5, importance=5)

    sorted_tasks = prioritize_tasks([t1, t2, t3])
    assert sorted_tasks[0].name == "Urgent High"
    assert sorted_tasks[0].priority_level == "High Priority"
    assert sorted_tasks[1].name == "Medium"
    assert sorted_tasks[2].name == "Relaxed Low"
    assert sorted_tasks[2].priority_level == "Low Priority"


def test_stable_tie_breaker():
    # Two tasks with identical scores, but one is closer to deadline
    t1 = Task(name="Task Closer", estimated_duration=30, deadline_days=1, difficulty=5, importance=5)
    t2 = Task(name="Task Farther", estimated_duration=30, deadline_days=2, difficulty=5, importance=5)

    sorted_tasks = prioritize_tasks([t2, t1])
    assert sorted_tasks[0].name == "Task Closer"
