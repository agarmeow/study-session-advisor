"""FastAPI Backend for Fuzzy Study Intelligence System.

Serves application endpoints for:
- Mamdani Fuzzy Study Advisor
- Fuzzy Task Prioritizer
- Heuristic Search (GBFS) Daily Scheduler
- Persistent storage, feedback adaptation, and exports
- Technical analysis, membership curves, and heatmap data
"""

import os
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

from analysis_tools import generate_heatmap_data
from fuzzy_advisor import (
    RULES as ADVISOR_RULES,
    fuzzy_difficulty,
    fuzzy_energy,
    fuzzy_sleep,
    fuzzy_urgency,
    infer_study_advice,
    trapezoidal,
    triangular,
)
from scheduler import format_minutes_to_time, schedule_tasks_gbfs
from storage import (
    apply_adaptation_and_preferences,
    export_history_json,
    export_sessions_csv,
    generate_recommendation_explanation,
    get_default_data,
    load_user_data,
    record_session,
    save_user_data,
)
from task_prioritizer import (
    TASK_RULES,
    Task,
    prioritize_tasks,
)


app = FastAPI(
    title="Fuzzy Study Intelligence API",
    description="AISC Decision Support API using Mamdani Fuzzy Inference and Greedy Best-First Search.",
    version="2.0.0",
)

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in local development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# PYDANTIC REQUEST/RESPONSE MODELS
# --------------------------------------------------

class RecommendationRequest(BaseModel):
    sleep_hours: float = Field(..., ge=0.0, le=12.0)
    energy: float = Field(..., ge=0.0, le=10.0)
    energy_label: str = "Okay"
    days_to_deadline: float = Field(..., ge=0.0, le=30.0)
    deadline_label: str = "Near"
    difficulty: float = Field(..., ge=0.0, le=10.0)
    difficulty_label: str = "Medium"
    task_name: Optional[str] = "General Study Session"


class TaskCreateRequest(BaseModel):
    name: str = Field(..., min_length=1)
    subject: Optional[str] = "General"
    estimated_duration: int = Field(..., gt=0, le=360)
    deadline_days: float = Field(..., ge=0.0, le=180.0)
    difficulty: float = Field(..., ge=0.0, le=10.0)
    importance: float = Field(..., ge=0.0, le=10.0)


class ScheduleRequest(BaseModel):
    available_time_minutes: int = Field(..., ge=0, le=1440)
    default_break_minutes: int = Field(10, ge=0, le=60)


class SessionRecordRequest(BaseModel):
    task_name: str = "General Study Session"
    study_minutes: int = Field(..., gt=0)
    break_minutes: int = Field(..., ge=0)
    feedback: Optional[str] = None
    post_break_energy: Optional[str] = None


class PreferencesUpdateRequest(BaseModel):
    study_time: Optional[str] = None
    focus_style: Optional[str] = None
    break_style: Optional[str] = None


# --------------------------------------------------
# CORE APPLICATION ENDPOINTS
# --------------------------------------------------

@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    """Health status and system metadata."""
    return {
        "status": "ok",
        "app": "Fuzzy Study Intelligence System",
        "version": "2.0.0",
        "framework": "FastAPI",
    }


@app.get("/api/data")
def get_all_data() -> Dict[str, Any]:
    """Fetch complete user state: tasks, sessions, preferences, and adaptive offset."""
    data = load_user_data()
    # Prioritize tasks before returning
    task_objs = [
        Task(
            name=t["name"],
            subject=t.get("subject", "General"),
            estimated_duration=t["estimated_duration"],
            deadline_days=t["deadline_days"],
            difficulty=t["difficulty"],
            importance=t["importance"],
        )
        for t in data.get("tasks", [])
    ]
    ranked = prioritize_tasks(task_objs)
    data["tasks"] = [
        {
            "name": t.name,
            "subject": t.subject,
            "estimated_duration": t.estimated_duration,
            "deadline_days": t.deadline_days,
            "difficulty": t.difficulty,
            "importance": t.importance,
            "priority_score": t.priority_score,
            "priority_level": t.priority_level,
            "priority_reason": t.priority_reason,
        }
        for t in ranked
    ]
    return data


@app.post("/api/recommendation")
def compute_study_recommendation(req: RecommendationRequest) -> Dict[str, Any]:
    """Run Mamdani fuzzy inference and apply focus preference & feedback adaptation."""
    try:
        data = load_user_data()
        preferences = data.get("preferences", {})
        adaptation_offset = data.get("adaptation_offset", 0)
        last_fb = data.get("last_feedback")

        # 1. Fuzzy Inference
        base_res = infer_study_advice(
            sleep_hours=req.sleep_hours,
            energy=req.energy,
            days_to_deadline=req.days_to_deadline,
            difficulty=req.difficulty,
        )

        # 2. Adaptation & Preferences
        adapted_res = apply_adaptation_and_preferences(
            base_study_minutes=base_res["study_minutes"],
            base_break_minutes=base_res["break_minutes"],
            intensity=base_res["intensity"],
            preferences=preferences,
            adaptation_offset=adaptation_offset,
            last_feedback=last_fb,
        )

        # 3. Input-Grounded Explanation
        explanation = generate_recommendation_explanation(
            sleep_hours=req.sleep_hours,
            energy_input=req.energy_label,
            deadline_input=req.deadline_label,
            difficulty_input=req.difficulty_label,
            final_study_minutes=adapted_res["final_study_minutes"],
            final_break_minutes=adapted_res["final_break_minutes"],
            intensity=base_res["intensity"],
            rest_needed=base_res["rest_needed"],
            base_study_minutes=base_res["study_minutes"],
            adaptation_offset=adaptation_offset,
            last_feedback=last_fb,
            focus_style=preferences.get("focus_style", "Balanced"),
        )

        return {
            "fuzzy": base_res,
            "adapted": adapted_res,
            "explanation": explanation,
            "task_name": req.task_name or "General Study Session",
            "inputs": req.model_dump(),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Recommendation calculation failed: {str(e)}",
        )


@app.get("/api/tasks")
def get_tasks() -> List[Dict[str, Any]]:
    """Return all tasks prioritized via 27-rule Mamdani fuzzy prioritizer."""
    data = load_user_data()
    task_objs = [
        Task(
            name=t["name"],
            subject=t.get("subject", "General"),
            estimated_duration=t["estimated_duration"],
            deadline_days=t["deadline_days"],
            difficulty=t["difficulty"],
            importance=t["importance"],
        )
        for t in data.get("tasks", [])
    ]
    ranked = prioritize_tasks(task_objs)
    return [
        {
            "name": t.name,
            "subject": t.subject,
            "estimated_duration": t.estimated_duration,
            "deadline_days": t.deadline_days,
            "difficulty": t.difficulty,
            "importance": t.importance,
            "priority_score": t.priority_score,
            "priority_level": t.priority_level,
            "priority_reason": t.priority_reason,
        }
        for t in ranked
    ]


@app.post("/api/tasks")
def create_task(req: TaskCreateRequest) -> Dict[str, Any]:
    """Create and prioritize a new coursework task."""
    try:
        new_task = Task(
            name=req.name.strip(),
            subject=req.subject.strip() if req.subject else "General",
            estimated_duration=req.estimated_duration,
            deadline_days=req.deadline_days,
            difficulty=req.difficulty,
            importance=req.importance,
        )
        data = load_user_data()
        data.setdefault("tasks", []).append({
            "name": new_task.name,
            "subject": new_task.subject,
            "estimated_duration": new_task.estimated_duration,
            "deadline_days": new_task.deadline_days,
            "difficulty": new_task.difficulty,
            "importance": new_task.importance,
        })
        save_user_data(data)

        # Return prioritized task
        task_objs = [
            Task(
                name=t["name"],
                subject=t.get("subject", "General"),
                estimated_duration=t["estimated_duration"],
                deadline_days=t["deadline_days"],
                difficulty=t["difficulty"],
                importance=t["importance"],
            )
            for t in data["tasks"]
        ]
        ranked = prioritize_tasks(task_objs)
        created_match = next((t for t in ranked if t.name == new_task.name), ranked[0])

        return {
            "name": created_match.name,
            "subject": created_match.subject,
            "estimated_duration": created_match.estimated_duration,
            "deadline_days": created_match.deadline_days,
            "difficulty": created_match.difficulty,
            "importance": created_match.importance,
            "priority_score": created_match.priority_score,
            "priority_level": created_match.priority_level,
            "priority_reason": created_match.priority_reason,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.delete("/api/tasks/{task_index}")
def delete_task(task_index: int) -> Dict[str, str]:
    """Delete a task by its index."""
    data = load_user_data()
    tasks = data.get("tasks", [])
    if 0 <= task_index < len(tasks):
        deleted = tasks.pop(task_index)
        save_user_data(data)
        return {"message": f"Task '{deleted.get('name')}' deleted successfully."}
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task index out of range.")


@app.post("/api/tasks/reset")
def reset_tasks_to_defaults() -> List[Dict[str, Any]]:
    """Reset tasks to original sample coursework tasks."""
    default_data = get_default_data()
    data = load_user_data()
    data["tasks"] = default_data["tasks"]
    save_user_data(data)
    return get_tasks()


@app.post("/api/schedule")
def generate_schedule(req: ScheduleRequest) -> Dict[str, Any]:
    """Execute Greedy Best-First Search to construct a feasible daily study schedule."""
    try:
        data = load_user_data()
        task_objs = [
            Task(
                name=t["name"],
                subject=t.get("subject", "General"),
                estimated_duration=t["estimated_duration"],
                deadline_days=t["deadline_days"],
                difficulty=t["difficulty"],
                importance=t["importance"],
            )
            for t in data.get("tasks", [])
        ]
        schedule = schedule_tasks_gbfs(
            tasks=task_objs,
            available_time_minutes=req.available_time_minutes,
            default_break_minutes=req.default_break_minutes,
        )

        blocks_json = [
            {
                "block_type": b.block_type,
                "task_name": b.task_name,
                "duration_minutes": b.duration_minutes,
                "start_offset": b.start_offset,
                "end_offset": b.end_offset,
                "start_time": format_minutes_to_time(b.start_offset),
                "end_time": format_minutes_to_time(b.end_offset),
                "subject": b.subject,
                "priority_level": b.priority_level,
            }
            for b in schedule.blocks
        ]

        unscheduled_json = [
            {
                "task": {
                    "name": u["task"].name,
                    "subject": u["task"].subject,
                    "estimated_duration": u["task"].estimated_duration,
                    "deadline_days": u["task"].deadline_days,
                    "priority_score": u["task"].priority_score,
                    "priority_level": u["task"].priority_level,
                },
                "reason": u["reason"],
            }
            for u in schedule.unscheduled_tasks
        ]

        scheduled_tasks_json = [
            {
                "name": t.name,
                "subject": t.subject,
                "estimated_duration": t.estimated_duration,
                "priority_level": t.priority_level,
            }
            for t in schedule.scheduled_tasks
        ]

        return {
            "blocks": blocks_json,
            "total_planned_time": schedule.total_planned_time,
            "total_study_time": schedule.total_study_time,
            "total_break_time": schedule.total_break_time,
            "remaining_available_time": schedule.remaining_available_time,
            "scheduled_tasks": scheduled_tasks_json,
            "unscheduled_tasks": unscheduled_json,
            "algorithm_info": schedule.algorithm_info,
            "available_budget_minutes": req.available_time_minutes,
            "is_feasible": schedule.total_planned_time <= req.available_time_minutes,
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.post("/api/sessions")
def record_completed_session(req: SessionRecordRequest) -> Dict[str, Any]:
    """Record completed study session and feedback, updating bounded adaptation."""
    try:
        data = load_user_data()
        session_entry = record_session(
            data=data,
            task_name=req.task_name,
            study_minutes=req.study_minutes,
            break_minutes=req.break_minutes,
            feedback=req.feedback,
            post_break_energy=req.post_break_energy,
        )
        return {
            "session": session_entry,
            "new_adaptation_offset": data.get("adaptation_offset", 0),
            "last_feedback": data.get("last_feedback"),
        }
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@app.put("/api/preferences")
def update_preferences(req: PreferencesUpdateRequest) -> Dict[str, Any]:
    """Update user study preferences."""
    data = load_user_data()
    prefs = data.setdefault("preferences", {})
    if req.study_time is not None:
        prefs["study_time"] = req.study_time
    if req.focus_style is not None:
        prefs["focus_style"] = req.focus_style
    if req.break_style is not None:
        prefs["break_style"] = req.break_style
    save_user_data(data)
    return {"preferences": prefs}


@app.get("/api/export/json")
def export_data_json() -> Any:
    """Download local history and tasks as formatted JSON."""
    data = load_user_data()
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": "attachment; filename=study_intelligence_history.json"},
    )


@app.get("/api/export/csv")
def export_data_csv() -> Any:
    """Download study session logs as formatted CSV."""
    data = load_user_data()
    csv_text = export_sessions_csv(data)
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=study_sessions.csv"},
    )


# --------------------------------------------------
# TECHNICAL AISC DATA ENDPOINTS
# --------------------------------------------------

@app.get("/api/technical/membership-data")
def get_membership_curve_data() -> Dict[str, Any]:
    """Return precomputed points to plot membership curves for advisor and prioritizer."""
    x_sleep = [round(i * 0.25, 2) for i in range(49)]  # 0 to 12
    x_scale = [round(i * 0.2, 2) for i in range(51)]   # 0 to 10

    advisor_curves = {
        "sleep": [
            {
                "x": x,
                "low": round(trapezoidal(x, 0, 0, 4, 6), 3),
                "medium": round(triangular(x, 4, 7, 9), 3),
                "high": round(trapezoidal(x, 7, 9, 12, 12), 3),
            }
            for x in x_sleep
        ],
        "energy": [
            {
                "x": x,
                "drained": round(trapezoidal(x, 0, 0, 2, 4), 3),
                "okay": round(triangular(x, 2, 5, 8), 3),
                "energized": round(trapezoidal(x, 6, 8, 10, 10), 3),
            }
            for x in x_scale
        ],
        "urgency": [
            {
                "x": x,
                "imminent": round(trapezoidal(x, 0, 0, 0.5, 1.5), 3),
                "near": round(triangular(x, 0.5, 3, 7), 3),
                "far": round(trapezoidal(x, 5, 10, 30, 30), 3),
            }
            for x in x_scale
        ],
        "difficulty": [
            {
                "x": x,
                "easy": round(trapezoidal(x, 0, 0, 2, 4), 3),
                "medium": round(triangular(x, 2, 5, 8), 3),
                "hard": round(trapezoidal(x, 6, 8, 10, 10), 3),
            }
            for x in x_scale
        ],
    }

    return {"advisor": advisor_curves}


@app.get("/api/technical/rules")
def get_system_rules() -> Dict[str, Any]:
    """Return all 81 advisor rules and 27 task prioritizer rules."""
    adv_rules = [
        {
            "id": i + 1,
            "sleep": r[0].capitalize(),
            "energy": r[1].capitalize(),
            "urgency": r[2].capitalize(),
            "difficulty": r[3].capitalize(),
            "study_minutes": r[4],
            "break_minutes": r[5],
            "intensity": r[6],
            "rest_score": r[7],
        }
        for i, r in enumerate(ADVISOR_RULES)
    ]

    t_rules = [
        {
            "id": i + 1,
            "urgency": r[0].capitalize(),
            "importance": r[1].capitalize(),
            "difficulty": r[2].capitalize(),
            "consequent_score": r[3],
        }
        for i, r in enumerate(TASK_RULES)
    ]

    return {
        "advisor_rules_count": len(adv_rules),
        "advisor_rules": adv_rules,
        "task_rules_count": len(t_rules),
        "task_rules": t_rules,
    }


@app.get("/api/technical/heatmaps")
def get_heatmap_matrix(workload: float = Query(5.0, ge=0.0, le=10.0)) -> Dict[str, Any]:
    """Calculate 2D grid of rule firing strength and duration across sleep and energy."""
    matrix_data = generate_heatmap_data(fixed_workload=workload, step=1.0)
    return {
        "workload": workload,
        "sleep_values": matrix_data["sleep_values"],
        "energy_values": matrix_data["energy_values"],
        "coverage": matrix_data["coverage"],
        "durations": matrix_data["durations"],
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
