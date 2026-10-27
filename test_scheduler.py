"""Tests for Heuristic Search Daily Scheduler."""

import pytest
from task_prioritizer import Task
from scheduler import schedule_tasks_gbfs, format_minutes_to_time


def test_empty_task_list():
    schedule = schedule_tasks_gbfs(tasks=[], available_time_minutes=120)
    assert schedule.blocks == []
    assert schedule.total_planned_time == 0
    assert schedule.remaining_available_time == 120
    assert schedule.scheduled_tasks == []
    assert schedule.unscheduled_tasks == []


def test_single_task_fits():
    task = Task(name="Math Homework", estimated_duration=45, deadline_days=1, difficulty=5, importance=8)
    schedule = schedule_tasks_gbfs(tasks=[task], available_time_minutes=60, default_break_minutes=10)

    assert len(schedule.scheduled_tasks) == 1
    assert schedule.total_study_time == 45
    assert schedule.total_break_time == 0  # Only one task, no trailing break needed
    assert schedule.total_planned_time == 45
    assert schedule.remaining_available_time == 15
    assert schedule.unscheduled_tasks == []


def test_task_exceeds_available_time():
    task = Task(name="Massive Project", estimated_duration=120, deadline_days=1, difficulty=9, importance=9)
    schedule = schedule_tasks_gbfs(tasks=[task], available_time_minutes=60)

    assert schedule.scheduled_tasks == []
    assert len(schedule.unscheduled_tasks) == 1
    assert "Requires 120 min" in schedule.unscheduled_tasks[0]["reason"]
    assert schedule.total_planned_time == 0
    assert schedule.remaining_available_time == 60


def test_multiple_tasks_with_breaks():
    t1 = Task(name="Task 1", estimated_duration=30, deadline_days=1, difficulty=5, importance=7)
    t2 = Task(name="Task 2", estimated_duration=30, deadline_days=2, difficulty=5, importance=6)
    schedule = schedule_tasks_gbfs(
        tasks=[t1, t2],
        available_time_minutes=75,
        default_break_minutes=10,
    )

    # 30 study + 10 break + 30 study = 70 minutes <= 75 minutes budget
    assert len(schedule.scheduled_tasks) == 2
    assert schedule.total_study_time == 60
    assert schedule.total_break_time == 10
    assert schedule.total_planned_time == 70
    assert schedule.remaining_available_time == 5

    # Check block structure: study -> break -> study
    assert len(schedule.blocks) == 3
    assert schedule.blocks[0].block_type == "study"
    assert schedule.blocks[1].block_type == "break"
    assert schedule.blocks[2].block_type == "study"


def test_priority_selection_under_time_constraint():
    # Only 50 minutes available. t_urgent takes 45m. t_relaxed takes 45m.
    # The heuristic search should choose the urgent, high-importance task.
    t_urgent = Task(name="Urgent Task", estimated_duration=45, deadline_days=0.5, difficulty=8, importance=9)
    t_relaxed = Task(name="Relaxed Task", estimated_duration=45, deadline_days=10, difficulty=3, importance=2)

    schedule = schedule_tasks_gbfs(
        tasks=[t_relaxed, t_urgent],
        available_time_minutes=50,
        default_break_minutes=10,
    )

    assert len(schedule.scheduled_tasks) == 1
    assert schedule.scheduled_tasks[0].name == "Urgent Task"
    assert len(schedule.unscheduled_tasks) == 1
    assert schedule.unscheduled_tasks[0]["task"].name == "Relaxed Task"


def test_no_duplicate_scheduling():
    tasks = [
        Task(name="Physics", estimated_duration=30, deadline_days=1, difficulty=6, importance=8),
        Task(name="Chemistry", estimated_duration=25, deadline_days=2, difficulty=5, importance=7),
    ]
    schedule = schedule_tasks_gbfs(tasks=tasks, available_time_minutes=120)

    scheduled_names = [t.name for t in schedule.scheduled_tasks]
    assert len(scheduled_names) == len(set(scheduled_names))


def test_total_time_never_exceeds_budget():
    tasks = [
        Task(name=f"Task {i}", estimated_duration=25, deadline_days=i, difficulty=5, importance=6)
        for i in range(1, 10)
    ]
    budget = 100
    schedule = schedule_tasks_gbfs(tasks=tasks, available_time_minutes=budget, default_break_minutes=10)

    assert schedule.total_planned_time <= budget
    assert schedule.remaining_available_time >= 0
    assert schedule.total_planned_time + schedule.remaining_available_time == budget


def test_deterministic_schedule():
    tasks = [
        Task(name="Task A", estimated_duration=30, deadline_days=1, difficulty=5, importance=7),
        Task(name="Task B", estimated_duration=40, deadline_days=2, difficulty=6, importance=8),
        Task(name="Task C", estimated_duration=20, deadline_days=0.5, difficulty=4, importance=9),
    ]
    s1 = schedule_tasks_gbfs(tasks, available_time_minutes=80)
    s2 = schedule_tasks_gbfs(tasks, available_time_minutes=80)

    assert [t.name for t in s1.scheduled_tasks] == [t.name for t in s2.scheduled_tasks]
    assert s1.total_planned_time == s2.total_planned_time


def test_invalid_available_time_rejected():
    with pytest.raises(ValueError, match="cannot be negative"):
        schedule_tasks_gbfs(tasks=[], available_time_minutes=-10)


def test_format_minutes_to_time():
    assert format_minutes_to_time(0, base_hour=9, base_minute=0) == "09:00"
    assert format_minutes_to_time(45, base_hour=9, base_minute=0) == "09:45"
    assert format_minutes_to_time(90, base_hour=9, base_minute=0) == "10:30"
