"""Fuzzy Task Prioritizer.

Calculates task priority scores (0-100) and human-readable priority levels
(High, Medium, Low) using Mamdani fuzzy inference with triangular and trapezoidal
membership functions, a 27-rule base, and centroid defuzzification.

Independent of Streamlit for unit testing and modularity.
"""

from dataclasses import dataclass, field
from itertools import product
from typing import Dict, List, Optional, Tuple, Any

from fuzzy_advisor import trapezoidal, triangular, centroid


@dataclass
class Task:
    name: str
    estimated_duration: int  # minutes
    deadline_days: float  # days until deadline
    difficulty: float  # 0 to 10
    importance: float  # 0 to 10
    subject: str = "General"
    task_id: str = ""
    priority_score: float = 0.0
    priority_level: str = "Medium Priority"
    priority_reason: str = ""

    def __post_init__(self):
        if not self.name or not self.name.strip():
            raise ValueError("Task name cannot be empty.")
        if not isinstance(self.estimated_duration, (int, float)) or self.estimated_duration <= 0:
            raise ValueError("Estimated duration must be a positive number of minutes.")
        self.estimated_duration = int(self.estimated_duration)

        if not isinstance(self.deadline_days, (int, float)) or self.deadline_days < 0:
            raise ValueError("Days to deadline must be a non-negative number.")
        self.deadline_days = float(self.deadline_days)

        if not isinstance(self.difficulty, (int, float)) or not (0 <= self.difficulty <= 10):
            raise ValueError("Difficulty must be between 0 and 10.")
        self.difficulty = float(self.difficulty)

        if not isinstance(self.importance, (int, float)) or not (0 <= self.importance <= 10):
            raise ValueError("Importance must be between 0 and 10.")
        self.importance = float(self.importance)


# --------------------------------------------------
# 1. MEMBERSHIP FUNCTIONS FOR TASK PRIORITIZATION
# --------------------------------------------------

def fuzzy_task_urgency(days: float) -> Dict[str, float]:
    """Fuzzify deadline urgency based on days remaining."""
    capped_days = min(30.0, max(0.0, float(days)))
    return {
        "urgent": trapezoidal(capped_days, 0, 0, 1.0, 3.0),
        "moderate": triangular(capped_days, 1.5, 4.0, 8.0),
        "relaxed": trapezoidal(capped_days, 6.0, 10.0, 30.0, 30.0),
    }


def fuzzy_task_importance(importance: float) -> Dict[str, float]:
    """Fuzzify task importance (0 to 10)."""
    return {
        "low": trapezoidal(importance, 0, 0, 2.0, 4.0),
        "medium": triangular(importance, 2.0, 5.0, 8.0),
        "high": trapezoidal(importance, 6.0, 8.0, 10.0, 10.0),
    }


def fuzzy_task_difficulty(difficulty: float) -> Dict[str, float]:
    """Fuzzify task difficulty (0 to 10)."""
    return {
        "easy": trapezoidal(difficulty, 0, 0, 2.0, 4.0),
        "medium": triangular(difficulty, 2.0, 5.0, 8.0),
        "hard": trapezoidal(difficulty, 6.0, 8.0, 10.0, 10.0),
    }


# --------------------------------------------------
# 2. 27-RULE BASE FOR TASK PRIORITY
# --------------------------------------------------

def build_task_rule_base() -> List[Tuple[str, str, str, float]]:
    """Build a complete 27-rule base for task prioritization.
    
    Returns tuples of: (urgency_set, importance_set, difficulty_set, target_priority_consequent)
    Target priority consequent is a value between 15 and 95 on the 0-100 scale.
    """
    rules = []
    urgency_categories = ["urgent", "moderate", "relaxed"]
    importance_categories = ["high", "medium", "low"]
    difficulty_categories = ["easy", "medium", "hard"]

    urgency_weights = {"urgent": 2, "moderate": 1, "relaxed": 0}
    importance_weights = {"high": 2, "medium": 1, "low": 0}
    difficulty_weights = {"hard": 2, "medium": 1, "easy": 0}

    for u_cat, i_cat, d_cat in product(urgency_categories, importance_categories, difficulty_categories):
        u_val = urgency_weights[u_cat]
        i_val = importance_weights[i_cat]
        d_val = difficulty_weights[d_cat]

        # Urgency and Importance heavily dictate priority; difficulty provides secondary adjustment.
        # Max: 18 + 24*2 + 18*2 + 4*2 = 18 + 48 + 36 + 8 = 110 -> clamped to 95
        # Min: 18 + 0 + 0 + 0 = 18
        consequent = 18.0 + 24.0 * u_val + 18.0 * i_val + 4.0 * d_val

        # Difficulty constraint: high difficulty cannot make a relaxed, low-importance task high priority
        if u_val == 0 and i_val == 0:
            consequent = min(consequent, 35.0)

        # Clamping
        consequent = max(15.0, min(95.0, consequent))
        rules.append((u_cat, i_cat, d_cat, consequent))

    return rules


TASK_RULES = build_task_rule_base()


# --------------------------------------------------
# 3. TASK PRIORITY INFERENCE
# --------------------------------------------------

def calculate_task_priority(
    deadline_days: float,
    importance: float,
    difficulty: float,
) -> Dict[str, Any]:
    """Compute fuzzy task priority.
    
    Returns:
        dict with priority_score (0-100), priority_level ("High Priority",
        "Medium Priority", "Low Priority"), fired_rules, and reason explanation.
    """
    if not isinstance(deadline_days, (int, float)) or deadline_days < 0:
        raise ValueError("Days to deadline must be a non-negative number.")
    if not isinstance(importance, (int, float)) or not (0 <= importance <= 10):
        raise ValueError("Importance must be between 0 and 10.")
    if not isinstance(difficulty, (int, float)) or not (0 <= difficulty <= 10):
        raise ValueError("Difficulty must be between 0 and 10.")

    u_memberships = fuzzy_task_urgency(deadline_days)
    i_memberships = fuzzy_task_importance(importance)
    d_memberships = fuzzy_task_difficulty(difficulty)

    priority_sets = []
    fired_rules = []

    for u_cat, i_cat, d_cat, consequent in TASK_RULES:
        strength = min(
            u_memberships[u_cat],
            i_memberships[i_cat],
            d_memberships[d_cat],
        )
        if strength <= 0:
            continue

        priority_sets.append((consequent, 20.0, strength))
        fired_rules.append({
            "urgency": u_cat,
            "importance": i_cat,
            "difficulty": d_cat,
            "consequent": consequent,
            "strength": round(strength, 3),
        })

    if not fired_rules:
        raise ValueError("No fuzzy rules fired for task priority.")

    score = centroid(priority_sets, range(0, 101))
    score = round(max(0.0, min(100.0, score)), 1)

    if score >= 68.0:
        level = "High Priority"
    elif score >= 42.0:
        level = "Medium Priority"
    else:
        level = "Low Priority"

    # Generate explanatory reason
    reason_parts = []
    if deadline_days <= 1.0:
        reason_parts.append("deadline is imminent")
    elif deadline_days <= 3.0:
        reason_parts.append("deadline is approaching soon")
    else:
        reason_parts.append(f"deadline is {round(deadline_days, 1)} days away")

    if importance >= 7.0:
        reason_parts.append("importance is high")
    elif importance >= 4.0:
        reason_parts.append("importance is moderate")
    else:
        reason_parts.append("importance is low")

    if difficulty >= 7.0:
        reason_parts.append("topic is challenging")
    elif difficulty <= 3.0:
        reason_parts.append("topic is straightforward")

    reason = f"{level} ({score}/100) because " + ", ".join(reason_parts) + "."

    return {
        "priority_score": score,
        "priority_level": level,
        "priority_reason": reason,
        "fired_rules": sorted(fired_rules, key=lambda x: x["strength"], reverse=True),
    }


def prioritize_task(task: Task) -> Task:
    """Evaluate and set the priority attributes of a Task instance."""
    result = calculate_task_priority(
        deadline_days=task.deadline_days,
        importance=task.importance,
        difficulty=task.difficulty,
    )
    task.priority_score = result["priority_score"]
    task.priority_level = result["priority_level"]
    task.priority_reason = result["priority_reason"]
    return task


def prioritize_tasks(tasks: List[Task]) -> List[Task]:
    """Prioritize and sort a list of tasks in descending order of fuzzy priority score."""
    for task in tasks:
        prioritize_task(task)

    # Sort descending by priority_score, then ascending by deadline_days (tie-breaker)
    return sorted(tasks, key=lambda t: (-t.priority_score, t.deadline_days, t.estimated_duration))
