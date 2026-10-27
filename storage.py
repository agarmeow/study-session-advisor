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
    last_feedback: Optional[str] = None,
) -> Dict[str, Any]:
    """Apply rule-based adjustments from user focus style preferences and session feedback.
    
    Principles:
    - Base fuzzy inference is preserved and reported.
    - Preference and feedback adjustments are bounded (15 to 90 min).
    - Conservative: if intensity is "Light revision", long session preference is softened.
    - Transparently distinguishes accumulated feedback offset from recent feedback.
    """
    adjusted_study = base_study_minutes
    adjusted_break = base_break_minutes
    reasons = []

    # 1. Apply feedback adaptation (bounded between -15 and +15 min)
    bounded_offset = max(-15, min(15, int(adaptation_offset)))
    if bounded_offset != 0:
        adjusted_study += bounded_offset
        direction_sign = f"+{bounded_offset}" if bounded_offset > 0 else f"{bounded_offset}"
        recent_desc = f", most recent feedback: '{last_feedback}'" if last_feedback else ""
        if bounded_offset > 0:
            reasons.append(
                f"added {bounded_offset} min cumulative adjustment from past session feedback{recent_desc}"
            )
        else:
            reasons.append(
                f"reduced by {abs(bounded_offset)} min cumulative adjustment from past feedback{recent_desc}"
            )

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
            reasons.append("kept session gentle because your current state requires light revision (longer sessions deferred)")

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
        "focus_style": focus_style,
    }


def generate_recommendation_explanation(
    sleep_hours: float,
    energy_input: str,
    deadline_input: str,
    difficulty_input: str,
    final_study_minutes: int,
    final_break_minutes: int,
    intensity: str,
    rest_needed: str,
    base_study_minutes: int,
    adaptation_offset: int = 0,
    last_feedback: Optional[str] = None,
    focus_style: str = "Balanced",
) -> Dict[str, Any]:
    """Generate precise, input-grounded explanations matching actual computed outputs.
    
    Guarantees:
    - Never describes stamina as balanced when rest_needed is High.
    - Explicitly addresses imminent deadlines and topic difficulty.
    - Distinguishes cumulative feedback adjustment from recent feedback entry.
    - Explains focus preference only when actually relevant to the outcome.
    """
    clean_energy = energy_input.split()[0].lower() if " " in energy_input else energy_input.lower()
    clean_diff = difficulty_input.split()[0] if " " in difficulty_input else difficulty_input

    # 1. Actionable Guidance
    guidance = (
        f"Start with a {final_study_minutes}-minute {intensity.lower()} session, "
        f"followed by a {final_break_minutes}-minute rest break."
    )

    # 2. Stamina & Rest Assessment
    if rest_needed == "High":
        stamina_note = (
            f"Your rest-needed indicator is **High** because you recorded {sleep_hours:.1f} hours of sleep "
            f"and feel {clean_energy}. Pacing yourself with a gentle session and a generous break "
            "prevents cognitive burnout and error fatigue."
        )
    elif rest_needed == "Medium":
        stamina_note = (
            f"Your stamina indicator is **Medium** with {sleep_hours:.1f} hours of sleep and {clean_energy} energy. "
            "Structured intervals with scheduled rest will maintain steady, sustainable focus."
        )
    else:
        stamina_note = (
            f"Your rest-needed indicator is **Low** ({sleep_hours:.1f} hours of sleep, {clean_energy} energy). "
            "Your alertness and stamina are strong, making this an optimal window for high-retention study."
        )

    # 3. Urgency & Difficulty Context
    context_points = []
    is_imminent = "Today" in deadline_input or "Imminent" in deadline_input or "< 24" in deadline_input
    is_near = "2–3" in deadline_input or "Near" in deadline_input

    if is_imminent:
        if intensity == "Light revision":
            context_points.append(
                "**Imminent Deadline:** Although your deadline is today, tackling complex new problems while fatigued "
                "leads to frustration and high error rates. Focus on high-yield revision and reinforcing core definitions."
            )
        elif intensity == "Challenging material":
            context_points.append(
                "**Imminent Deadline:** With high alertness and a deadline today, prioritize your most critical problem sets "
                "and deliverables during this deep-focus block."
            )
        else:
            context_points.append(
                "**Imminent Deadline:** Prioritize direct progress on key coursework deliverables during this block."
            )
    elif is_near:
        context_points.append(
            "**Approaching Deadline (2–3 Days):** Working through structured intervals now builds confidence without last-minute panic."
        )
    else:
        context_points.append(
            "**Upcoming Deadline:** You have ample runway to explore topics methodically without urgency pressure."
        )

    if "Hard" in difficulty_input:
        if intensity == "Light revision":
            context_points.append(
                f"**{clean_diff} Topic:** Deconstruct difficult topics into bite-sized concepts rather than attempting a grueling marathon."
            )
        else:
            context_points.append(
                f"**{clean_diff} Topic:** Demanding material benefits from dedicated active recall and problem solving in this block."
            )
    elif "Easy" in difficulty_input:
        context_points.append(
            f"**{clean_diff} Topic:** Material is manageable—use this session for quick practice, flashcards, or summarizing."
        )

    # 4. Adaptation & Transparency Notes
    transparency_notes = []
    if base_study_minutes != final_study_minutes:
        transparency_notes.append(f"Base fuzzy inference recommendation: {base_study_minutes} min.")
        if adaptation_offset != 0:
            direction = f"+{adaptation_offset}" if adaptation_offset > 0 else f"{adaptation_offset}"
            recent_str = f" (most recent response: '{last_feedback}')" if last_feedback else ""
            transparency_notes.append(
                f"Cumulative feedback adjustment: {direction} min across past study sessions{recent_str}."
            )
        if focus_style == "Short bursts" and final_study_minutes < base_study_minutes:
            transparency_notes.append("Applied 'Short bursts' preference to cap session length.")
        elif focus_style == "Longer sessions" and final_study_minutes > base_study_minutes:
            transparency_notes.append("Applied 'Longer sessions' preference (+10 min).")
        elif focus_style == "Longer sessions" and intensity == "Light revision":
            transparency_notes.append("Kept session gentle despite 'Longer sessions' preference due to light revision requirement.")
    else:
        transparency_notes.append("Duration matches pure fuzzy Mamdani inference without preference or feedback offsets.")

    return {
        "guidance": guidance,
        "stamina_note": stamina_note,
        "context_notes": context_points,
        "transparency_notes": transparency_notes,
        "disclaimer": "Recommendations are rule-based planning guidelines designed for student productivity, not medical or cognitive assessments.",
    }


def normalize_feedback(fb: Optional[str]) -> Optional[str]:
    """Normalize feedback string to canonical 'Too short', 'Just right', or 'Too long'."""
    if not fb:
        return None
    cleaned = str(fb).strip().lower()
    if cleaned in {"too short", "too_short", "tooshort"}:
        return "Too short"
    if cleaned in {"too long", "too_long", "toolong"}:
        return "Too long"
    if cleaned in {"just right", "just_right", "justright"}:
        return "Just right"
    return fb.strip()


def record_session(
    data: Dict[str, Any],
    task_name: str,
    study_minutes: int,
    break_minutes: int,
    feedback: Optional[str] = None,
    post_break_energy: Optional[str] = None,
    filepath: Optional[str] = "study_data.json",
    session_id: Optional[str] = None,
    planned_study_minutes: Optional[int] = None,
    actual_study_minutes: Optional[int] = None,
    completion_time: Optional[str] = None,
) -> Dict[str, Any]:
    """Record a completed study/break session and update feedback adaptation."""
    now = datetime.now()
    now_str = now.strftime("%Y-%m-%d %H:%M:%S")
    date_str = now.strftime("%Y-%m-%d")

    norm_feedback = normalize_feedback(feedback)
    actual_study = actual_study_minutes if actual_study_minutes is not None else study_minutes
    planned_study = planned_study_minutes if planned_study_minutes is not None else study_minutes
    sid = session_id or f"sess_{int(now.timestamp() * 1000)}"

    session_entry = {
        "id": sid,
        "timestamp": now_str,
        "date": date_str,
        "completion_time": completion_time or now_str,
        "task_name": task_name,
        "study_minutes": actual_study,
        "planned_study_minutes": planned_study,
        "actual_study_minutes": actual_study,
        "break_minutes": break_minutes,
        "feedback": norm_feedback,
        "post_break_energy": post_break_energy,
    }
    data.setdefault("sessions", []).append(session_entry)

    # Update feedback adaptation if provided
    if norm_feedback in {"Too short", "Too long", "Just right"}:
        data["last_feedback"] = norm_feedback
        if norm_feedback == "Too short":
            data["adaptation_offset"] = min(15, data.get("adaptation_offset", 0) + 5)
        elif norm_feedback == "Too long":
            data["adaptation_offset"] = max(-15, data.get("adaptation_offset", 0) - 5)

    if filepath:
        save_user_data(data, filepath)

    return session_entry


def update_session_feedback(
    data: Dict[str, Any],
    session_id: Optional[str] = None,
    feedback: str = "Just right",
    post_break_energy: Optional[str] = None,
    filepath: Optional[str] = "study_data.json",
    allow_duplicate: bool = False,
) -> Tuple[Dict[str, Any], bool]:
    """Attach or update feedback for a recorded session and apply bounded adaptation.
    
    Returns (session_entry, was_updated).
    If allow_duplicate is False and session already has feedback, returns (session_entry, False)
    without applying the offset adjustment again.
    """
    sessions = data.get("sessions", [])
    if not sessions:
        raise ValueError("No study sessions found to attach feedback to.")

    target_session = None
    if session_id:
        for s in reversed(sessions):
            if s.get("id") == session_id or s.get("timestamp") == session_id:
                target_session = s
                break
    
    if target_session is None:
        target_session = sessions[-1]

    norm_feedback = normalize_feedback(feedback)
    if not norm_feedback or norm_feedback not in {"Too short", "Too long", "Just right"}:
        raise ValueError(f"Invalid feedback: '{feedback}'. Must be 'Too Short', 'Just Right', or 'Too Long'.")

    # Prevent duplicate submission if feedback already exists for this session
    if target_session.get("feedback") is not None and not allow_duplicate:
        return target_session, False

    target_session["feedback"] = norm_feedback
    if post_break_energy:
        target_session["post_break_energy"] = post_break_energy

    data["last_feedback"] = norm_feedback
    if norm_feedback == "Too short":
        data["adaptation_offset"] = min(15, data.get("adaptation_offset", 0) + 5)
    elif norm_feedback == "Too long":
        data["adaptation_offset"] = max(-15, data.get("adaptation_offset", 0) - 5)

    if filepath:
        save_user_data(data, filepath)

    return target_session, True


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
