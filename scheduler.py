"""Heuristic Search for Daily Scheduling.

Implements a Greedy Best-First Search (GBFS) algorithm to schedule student tasks
within a daily available time budget, accounting for fuzzy priority scores,
deadline urgency, estimated task durations, and necessary rest breaks.

Search Formulation:
- State: (scheduled_blocks, time_spent, available_time, scheduled_tasks, remaining_tasks)
- Candidate Actions: Choose an unscheduled candidate task that feasibly fits in the remaining time budget.
- Feasibility Constraints:
    total_time = current_time_spent + (break_minutes if scheduled_blocks else 0) + task.estimated_duration <= available_time
- Heuristic Function h(state):
    Estimates the urgency penalty of remaining unscheduled tasks:
    h(state) = sum( task.priority_score * (5.0 / (task.deadline_days + 1.0)) for task in state.remaining_tasks )
    States with lower h(state) have successfully scheduled the most urgent and high-priority tasks.
"""

from dataclasses import dataclass, field
import heapq
from typing import List, Dict, Any, Optional, Tuple

from task_prioritizer import Task, prioritize_tasks


@dataclass
class ScheduleBlock:
    block_type: str  # "study" or "break"
    task_name: str
    duration_minutes: int
    start_offset: int  # minutes from schedule start
    end_offset: int  # minutes from schedule start
    subject: str = ""
    priority_level: str = ""


@dataclass
class DailySchedule:
    blocks: List[ScheduleBlock]
    total_planned_time: int
    total_study_time: int
    total_break_time: int
    remaining_available_time: int
    scheduled_tasks: List[Task]
    unscheduled_tasks: List[Dict[str, Any]]
    algorithm_info: Dict[str, Any]


def format_minutes_to_time(minutes_offset: int, base_hour: int = 9, base_minute: int = 0) -> str:
    """Format minutes offset from schedule start into human-readable HH:MM."""
    total_minutes = base_hour * 60 + base_minute + minutes_offset
    hours = (total_minutes // 60) % 24
    mins = total_minutes % 60
    return f"{hours:02d}:{mins:02d}"


def calculate_schedule_heuristic(remaining_tasks: List[Task]) -> float:
    """Evaluate heuristic score h(state).
    
    Lower value is better: penalizes leaving urgent and high-priority tasks unscheduled.
    h(state) = sum( task.priority_score * (4.0 / (task.deadline_days + 0.5)) for task in remaining_tasks )
    """
    penalty = 0.0
    for task in remaining_tasks:
        urgency_multiplier = 4.0 / (task.deadline_days + 0.5)
        penalty += task.priority_score * urgency_multiplier
    return round(penalty, 2)


@dataclass(order=True)
class SearchNode:
    priority: float  # heapq sorts by first element (heuristic value)
    time_spent: int = field(compare=False)
    scheduled_tasks: List[Task] = field(compare=False)
    remaining_tasks: List[Task] = field(compare=False)


def schedule_tasks_gbfs(
    tasks: List[Task],
    available_time_minutes: int,
    default_break_minutes: int = 10,
    max_search_expansions: int = 500,
    base_start_hour: int = 9,
    base_start_minute: int = 0,
) -> DailySchedule:
    """Construct a feasible daily study schedule using Greedy Best-First Search (GBFS).
    
    Args:
        tasks: List of Task objects to schedule.
        available_time_minutes: Total minutes available for study and breaks today.
        default_break_minutes: Minutes allocated for rest breaks between study sessions.
        max_search_expansions: Search node expansion limit to guarantee responsive performance.
        base_start_hour: Starting hour for time-block formatting.
        base_start_minute: Starting minute for time-block formatting.
        
    Returns:
        DailySchedule object containing scheduled blocks, metrics, and unscheduled task details.
    """
    if available_time_minutes < 0:
        raise ValueError("Available study time cannot be negative.")

    if not tasks or available_time_minutes == 0:
        return DailySchedule(
            blocks=[],
            total_planned_time=0,
            total_study_time=0,
            total_break_time=0,
            remaining_available_time=max(0, available_time_minutes),
            scheduled_tasks=[],
            unscheduled_tasks=[
                {"task": t, "reason": "No available study time allocated." if available_time_minutes == 0 else "Empty task list."}
                for t in tasks
            ],
            algorithm_info={
                "algorithm": "Greedy Best-First Search (GBFS)",
                "nodes_expanded": 0,
                "heuristic": "Deadline Urgency & Priority Penalty h(n)",
            },
        )

    # Ensure all tasks have priority evaluated
    tasks_with_priority = prioritize_tasks([t for t in tasks])

    # Initial state
    initial_h = calculate_schedule_heuristic(tasks_with_priority)
    initial_node = SearchNode(
        priority=initial_h,
        time_spent=0,
        scheduled_tasks=[],
        remaining_tasks=tasks_with_priority,
    )

    open_set: List[SearchNode] = []
    heapq.heappush(open_set, initial_node)

    best_node = initial_node
    nodes_expanded = 0

    while open_set and nodes_expanded < max_search_expansions:
        current_node = heapq.heappop(open_set)
        nodes_expanded += 1

        # Check if current_node has scheduled more priority value or left less penalty
        if current_node.priority < best_node.priority or (
            current_node.priority == best_node.priority and len(current_node.scheduled_tasks) > len(best_node.scheduled_tasks)
        ):
            best_node = current_node

        # If no tasks remain, we achieved optimal coverage
        if not current_node.remaining_tasks:
            break

        # Expand candidate actions: choose next task to schedule
        has_feasible_expansion = False
        for i, candidate_task in enumerate(current_node.remaining_tasks):
            # Check feasibility
            break_needed = default_break_minutes if current_node.scheduled_tasks else 0
            additional_time = break_needed + candidate_task.estimated_duration
            new_time_spent = current_node.time_spent + additional_time

            if new_time_spent <= available_time_minutes:
                has_feasible_expansion = True
                new_scheduled = current_node.scheduled_tasks + [candidate_task]
                new_remaining = current_node.remaining_tasks[:i] + current_node.remaining_tasks[i + 1:]
                new_h = calculate_schedule_heuristic(new_remaining)

                successor = SearchNode(
                    priority=new_h,
                    time_spent=new_time_spent,
                    scheduled_tasks=new_scheduled,
                    remaining_tasks=new_remaining,
                )
                heapq.heappush(open_set, successor)

        # If no feasible candidate could be added, this branch is fully expanded

    # Build the final schedule blocks from the best node found
    blocks: List[ScheduleBlock] = []
    current_offset = 0
    total_study_minutes = 0
    total_break_minutes = 0

    for idx, task in enumerate(best_node.scheduled_tasks):
        # Insert break if not first task
        if idx > 0:
            break_start = current_offset
            break_end = current_offset + default_break_minutes
            blocks.append(
                ScheduleBlock(
                    block_type="break",
                    task_name="Rest & Recharge Break",
                    duration_minutes=default_break_minutes,
                    start_offset=break_start,
                    end_offset=break_end,
                    subject="Break",
                    priority_level="",
                )
            )
            current_offset = break_end
            total_break_minutes += default_break_minutes

        study_start = current_offset
        study_end = current_offset + task.estimated_duration
        blocks.append(
            ScheduleBlock(
                block_type="study",
                task_name=task.name,
                duration_minutes=task.estimated_duration,
                start_offset=study_start,
                end_offset=study_end,
                subject=task.subject,
                priority_level=task.priority_level,
            )
        )
        current_offset = study_end
        total_study_minutes += task.estimated_duration

    total_planned = total_study_minutes + total_break_minutes
    remaining_time = available_time_minutes - total_planned

    # Identify unscheduled tasks and reasons
    unscheduled = []
    scheduled_names = {t.name for t in best_node.scheduled_tasks}
    for task in tasks_with_priority:
        if task.name not in scheduled_names:
            required_time = task.estimated_duration + (default_break_minutes if blocks else 0)
            if required_time > remaining_time:
                reason = (
                    f"Requires {task.estimated_duration} min (+ {default_break_minutes} min break), "
                    f"but only {remaining_time} min remain in today's budget."
                )
            else:
                reason = "Lower priority/urgency heuristic score relative to selected tasks within time budget."
            unscheduled.append({
                "task": task,
                "reason": reason,
            })

    return DailySchedule(
        blocks=blocks,
        total_planned_time=total_planned,
        total_study_time=total_study_minutes,
        total_break_time=total_break_minutes,
        remaining_available_time=remaining_time,
        scheduled_tasks=best_node.scheduled_tasks,
        unscheduled_tasks=unscheduled,
        algorithm_info={
            "algorithm": "Greedy Best-First Search (GBFS)",
            "nodes_expanded": nodes_expanded,
            "heuristic": "Urgency and Priority Penalty Function h(n)",
            "initial_heuristic": initial_h,
            "final_heuristic": best_node.priority,
        },
    )
