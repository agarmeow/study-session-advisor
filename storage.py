"""Local persistence, user preferences, and rule-based feedback adaptation.

Handles saving/loading student tasks, session history, preferences, and lightweight
feedback-based duration adjustments without external databases.
Provides JSON and CSV export capabilities.
"""

import csv
import io
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple


DEFAULT_DATA: Dict[str, Any] = {
    "tasks": [
        {
            "name": "Discrete Math Revision",
            "subject": "Mathematics",
            "estimated_duration": 40,
            "deadline_days": 1.0,
            "difficulty": 7.0,
            "importance": 8.0,
        },
        {
            "name": "Database Schema Design",
            "subject": "Computer Science",
            "estimated_duration": 45,
            "deadline_days": 3.0,
            "difficulty": 5.0,
            "importance": 7.0,
        },
        {
            "name": "Literature Reading",
            "subject": "Humanities",
            "estimated_duration": 30,
            "deadline_days": 8.0,
            "difficulty": 3.0,
            "importance": 4.0,
        },
    ],
    "sessions": [],
    "preferences": {
        "study_time": "Morning",
        "focus_style": "Balanced",  # "Balanced", "Short bursts", "Longer sessions"
        "break_style": "Standard",
    },
    "adaptation_offset": 0,  # Bounded minutes offset based on feedback (-15 to +15)
}


def get_default_data() -> Dict[str, Any]:
    """Return a deep copy of default data."""
    return json.loads(json.dumps(DEFAULT_DATA))


def load_user_data(filepath: str = "study_data.json") -> Dict[str, Any]:
    """Load user data from a local JSON file or return defaults if not found."""
    if not os.path.exists(filepath):
        return get_default_data()

    try:
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure all required keys exist
            for key, val in DEFAULT_DATA.items():
                if key not in data:
                    data[key] = json.loads(json.dumps(val))
            return data
    except Exception:
        return get_default_data()


def save_user_data(data: Dict[str, Any], filepath: str = "study_data.json") -> None:
    """Save user data to local JSON file safely."""
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        # Avoid crashing Streamlit app on write error
        pass


def apply_adaptation_and_preferences(
    base_study_minutes: int,
    base_break_minutes: int,
    intensity: str,
    preferences: Dict[str, Any],
    adaptation_offset: int,
) -> Dict[str, Any]:
    """Apply rule-based adjustments from user focus style preferences and session feedback.
    
    Principles:
    - Base fuzzy inference is preserved and reported.
    - Preference and feedback adjustments are bounded (15 to 90 min).
    - Conservative: if intensity is "Light revision", long session preference is softened.
    - Transparently explains why any adjustment was made.
    """
    adjusted_study = base_study_minutes
    adjusted_break = base_break_minutes
    reasons = []

    # 1. Apply feedback adaptation (bounded between -15 and +15 min)
    bounded_offset = max(-15, min(15, int(adaptation_offset)))
    if bounded_offset != 0:
        adjusted_study += bounded_offset
        if bounded_offset > 0:
            reasons.append(f"added {bounded_offset} min from your past session feedback ('Too short')")
        else:
            reasons.append(f"reduced by {abs(bounded_offset)} min from your past feedback ('Too long')")

    # 2. Apply focus style preference
    focus_style = preferences.get("focus_style", "Balanced")
    if focus_style == "Short bursts":
        # Pull towards shorter blocks (e.g. 25-30m)
        if adjusted_study > 30:
            diff = min(15, adjusted_study - 25)
            adjusted_study -= diff
            reasons.append("aligned towards shorter blocks based on your 'Short bursts' preference")
    elif focus_style == "Longer sessions":
        # If intensity allows moderate or challenging study, can extend slightly
        if intensity != "Light revision" and adjusted_study < 60:
            adjusted_study = min(75, adjusted_study + 10)
            reasons.append("slightly extended for your 'Longer sessions' preference")
        elif intensity == "Light revision":
            reasons.append("kept session gentle because your current state requires light revision")

    # Final clamping to safe bounds [15, 90]
    final_study = max(15, min(90, round(adjusted_study)))
    final_break = max(5, min(20, round(adjusted_break)))

    if reasons:
        explanation = "Recommendation adjusted: " + "; ".join(reasons) + "."
    else:
        explanation = "Recommendation reflects your base fuzzy inference directly without adjustments."

    return {
        "base_study_minutes": base_study_minutes,
        "base_break_minutes": base_break_minutes,
        "final_study_minutes": final_study,
        "final_break_minutes": final_break,
        "adaptation_offset": bounded_offset,
        "adjustment_explanation": explanation,
    }


def record_session(
    data: Dict[str, Any],
    task_name: str,
    study_minutes: int,
    break_minutes: int,
    feedback: Optional[str] = None,
    post_break_energy: Optional[str] = None,
    filepath: Optional[str] = "study_data.json",
) -> Dict[str, Any]:
    """Record a completed study/break session and update feedback adaptation."""
    session_entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "task_name": task_name,
        "study_minutes": study_minutes,
        "break_minutes": break_minutes,
        "feedback": feedback,
        "post_break_energy": post_break_energy,
    }
    data["sessions"].append(session_entry)

    # Update feedback adaptation if provided
    if feedback == "Too short":
        # Increment by 5 minutes up to max +15
        data["adaptation_offset"] = min(15, data.get("adaptation_offset", 0) + 5)
    elif feedback == "Too long":
        # Decrement by 5 minutes down to min -15
        data["adaptation_offset"] = max(-15, data.get("adaptation_offset", 0) - 5)
    # If "Just right", offset stays unchanged

    if filepath:
        save_user_data(data, filepath)

    return session_entry


def export_history_json(data: Dict[str, Any]) -> str:
    """Export tasks and session history as formatted JSON."""
    return json.dumps(data, indent=2)


def export_sessions_csv(data: Dict[str, Any]) -> str:
    """Export session history as CSV string."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Timestamp",
        "Date",
        "Task Name",
        "Study Minutes",
        "Break Minutes",
        "Feedback",
        "Post-Break Energy",
    ])

    for s in data.get("sessions", []):
        writer.writerow([
            s.get("timestamp", ""),
            s.get("date", ""),
            s.get("task_name", ""),
            s.get("study_minutes", 0),
            s.get("break_minutes", 0),
            s.get("feedback", ""),
            s.get("post_break_energy", ""),
        ])

    return output.getvalue()
