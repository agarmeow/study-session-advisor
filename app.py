"""Fuzzy Study Intelligence System.

A polished, student-friendly study companion powered by:
1. Mamdani Fuzzy Inference for stamina-aware study and break recommendations.
2. Mamdani Fuzzy Prioritization for coursework and assignments.
3. Heuristic Search (Greedy Best-First Search) for daily schedule planning.
4. Bounded rule-based feedback adaptation and personalized focus preferences.
"""

import time
from datetime import datetime
import matplotlib.pyplot as plt
import streamlit as st

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
from fuzzy_engine import (
    RULE_BASE as OLD_RULE_BASE,
    infer_study_duration as infer_old_study_duration,
    trapezoidal_membership,
    triangular_membership,
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
    calculate_task_priority,
    prioritize_tasks,
)


# --------------------------------------------------
# PAGE CONFIGURATION & MEDILINK-INSPIRED STYLING
# --------------------------------------------------

st.set_page_config(
    page_title="Fuzzy Study Intelligence System",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Premium light theme CSS with restrained coral accents and clean SaaS hierarchy
st.markdown(
    """
    <style>
    /* Base typography and background */
    .stApp {
        background-color: #f8fafc;
        font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        color: #1e293b;
    }
    
    /* Clean sidebar */
    [data-testid="stSidebar"] {
        background-color: #ffffff;
        border-right: 1px solid #e2e8f0;
    }
    
    /* Headings hierarchy */
    h1 {
        font-size: 1.65rem !important;
        font-weight: 700 !important;
        color: #0f172a !important;
        margin-bottom: 0.35rem !important;
        letter-spacing: -0.02em !important;
    }
    h2 {
        font-size: 1.25rem !important;
        font-weight: 600 !important;
        color: #1e293b !important;
        margin-top: 1.25rem !important;
        margin-bottom: 0.5rem !important;
    }
    h3 {
        font-size: 1.05rem !important;
        font-weight: 600 !important;
        color: #334155 !important;
    }
    
    /* SaaS Card containers */
    .saas-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 20px 24px;
        margin-bottom: 18px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.03);
    }
    
    .saas-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
        padding-bottom: 10px;
        border-bottom: 1px solid #f1f5f9;
    }
    
    .saas-card-title {
        font-size: 1.08rem;
        font-weight: 600;
        color: #0f172a;
    }
    
    .saas-card-desc {
        font-size: 0.85rem;
        color: #64748b;
        margin-bottom: 14px;
    }
    
    /* Coral Accent Buttons */
    button[kind="primary"] {
        background-color: #e0564c !important;
        border-color: #e0564c !important;
        color: #ffffff !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        padding: 0.45rem 1.1rem !important;
        transition: all 0.15s ease-in-out !important;
    }
    button[kind="primary"]:hover {
        background-color: #c93f35 !important;
        border-color: #c93f35 !important;
        box-shadow: 0 2px 4px rgba(224, 86, 76, 0.25) !important;
    }
    
    button[kind="secondary"] {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #334155 !important;
        font-weight: 500 !important;
        border-radius: 8px !important;
    }
    button[kind="secondary"]:hover {
        border-color: #94a3b8 !important;
        background-color: #f8fafc !important;
    }
    
    /* Streamlit Metrics Polished & Responsive */
    [data-testid="stMetric"] {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 14px 18px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }
    [data-testid="stMetricLabel"] {
        font-size: 0.8rem !important;
        font-weight: 600 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.04em !important;
        color: #64748b !important;
        white-space: normal !important;
    }
    [data-testid="stMetricValue"] {
        font-size: 1.45rem !important;
        font-weight: 700 !important;
        color: #0f172a !important;
        white-space: normal !important;
        overflow-wrap: break-word !important;
    }
    
    /* Badges & Pills */
    .pill {
        display: inline-flex;
        align-items: center;
        padding: 3px 10px;
        border-radius: 9999px;
        font-size: 0.78rem;
        font-weight: 600;
        line-height: 1.2;
    }
    .pill-coral {
        background-color: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
    }
    .pill-amber {
        background-color: #fffbeb;
        color: #b45309;
        border: 1px solid #fde68a;
    }
    .pill-green {
        background-color: #f0fdf4;
        color: #15803d;
        border: 1px solid #bbf7d0;
    }
    .pill-blue {
        background-color: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
    }
    .pill-slate {
        background-color: #f1f5f9;
        color: #475569;
        border: 1px solid #e2e8f0;
    }
    
    /* Recommendation Card Styling */
    .rec-container {
        background: #ffffff;
        border: 1px solid #fed7d7;
        border-left: 5px solid #e0564c;
        border-radius: 10px;
        padding: 20px 24px;
        margin-top: 16px;
        margin-bottom: 20px;
        box-shadow: 0 2px 6px rgba(224, 86, 76, 0.06);
    }
    
    /* Timeline Blocks */
    .timeline-study-card {
        background: #ffffff;
        border: 1px solid #bfdbfe;
        border-left: 4px solid #2563eb;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 10px;
    }
    .timeline-break-card {
        background: #f8fafc;
        border: 1px dashed #86efac;
        border-left: 4px solid #16a34a;
        border-radius: 8px;
        padding: 10px 16px;
        margin-bottom: 10px;
    }
    
    /* Timer Display */
    .timer-display {
        text-align: center;
        font-size: 3.8rem;
        font-weight: 700;
        font-variant-numeric: tabular-nums;
        color: #0f172a;
        margin: 12px 0;
        letter-spacing: -0.03em;
    }
    
    /* Nav headers */
    .sidebar-section-title {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #94a3b8;
        margin-top: 14px;
        margin-bottom: 8px;
    }
    </style>
    """,
    unsafe_allow_html=True,
)


# --------------------------------------------------
# SESSION STATE INITIALIZATION
# --------------------------------------------------

if "user_data" not in st.session_state:
    st.session_state["user_data"] = load_user_data()

# Ensure tasks list is stored in session state as Task objects
if "tasks" not in st.session_state:
    raw_tasks = st.session_state["user_data"].get("tasks", [])
    task_objs = []
    for rt in raw_tasks:
        try:
            task_objs.append(
                Task(
                    name=rt["name"],
                    subject=rt.get("subject", "General"),
                    estimated_duration=rt["estimated_duration"],
                    deadline_days=rt["deadline_days"],
                    difficulty=rt["difficulty"],
                    importance=rt["importance"],
                )
            )
        except Exception:
            pass
    st.session_state["tasks"] = task_objs

# Timer session state
if "timer_state" not in st.session_state:
    st.session_state["timer_state"] = "idle"  # "idle", "running", "paused", "finished"
if "timer_mode" not in st.session_state:
    st.session_state["timer_mode"] = "study"  # "study" or "break"
if "timer_total_seconds" not in st.session_state:
    st.session_state["timer_total_seconds"] = 25 * 60
if "timer_remaining_seconds" not in st.session_state:
    st.session_state["timer_remaining_seconds"] = 25 * 60
if "timer_task_name" not in st.session_state:
    st.session_state["timer_task_name"] = "General Study Session"
if "timer_last_timestamp" not in st.session_state:
    st.session_state["timer_last_timestamp"] = time.time()
if "last_recommendation" not in st.session_state:
    st.session_state["last_recommendation"] = None


def persist_tasks():
    """Sync session_state tasks to user_data dictionary and save safely to local disk."""
    raw = []
    for t in st.session_state["tasks"]:
        raw.append({
            "name": t.name,
            "subject": t.subject,
            "estimated_duration": t.estimated_duration,
            "deadline_days": t.deadline_days,
            "difficulty": t.difficulty,
            "importance": t.importance,
        })
    st.session_state["user_data"]["tasks"] = raw
    save_user_data(st.session_state["user_data"])


# --------------------------------------------------
# SIDEBAR NAVIGATION & SETTINGS
# --------------------------------------------------

st.sidebar.markdown(
    """
    <div style='display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 4px 0;'>
        <div style='background-color: #fee2e2; color: #e0564c; width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: bold;'>
            🎓
        </div>
        <div>
            <div style='font-size: 1.02rem; font-weight: 700; color: #0f172a; line-height: 1.2;'>Study Intelligence</div>
            <div style='font-size: 0.76rem; color: #64748b; font-weight: 500;'>AISC Decision Platform</div>
        </div>
    </div>
    """,
    unsafe_allow_html=True,
)

st.sidebar.markdown("<div class='sidebar-section-title'>Student Workspace</div>", unsafe_allow_html=True)

# Primary student-facing sections
student_nav_choices = [
    "Study Advisor",
    "My Tasks",
    "Today's Plan",
    "Progress & History",
]

primary_page = st.sidebar.radio(
    "Navigation",
    student_nav_choices,
    index=0,
    label_visibility="collapsed",
)

st.sidebar.markdown("<div class='sidebar-section-title'>System & Architecture</div>", unsafe_allow_html=True)
view_technical = st.sidebar.checkbox(
    "AISC Technical Details",
    value=False,
    help="Inspect Mamdani 81/27 rule bases, membership plots, defuzzification, and GBFS search formulation.",
)

active_page = "AISC Technical Details" if view_technical else primary_page

# Personalized Preferences Card
st.sidebar.markdown("<div class='sidebar-section-title'>Personal Preferences</div>", unsafe_allow_html=True)

user_prefs = st.session_state["user_data"].get("preferences", {})

pref_time = st.sidebar.selectbox(
    "Preferred Study Time",
    ["Morning", "Afternoon", "Night", "Flexible"],
    index=["Morning", "Afternoon", "Night", "Flexible"].index(user_prefs.get("study_time", "Morning"))
    if user_prefs.get("study_time") in ["Morning", "Afternoon", "Night", "Flexible"]
    else 0,
)

pref_focus = st.sidebar.selectbox(
    "Focus Style",
    ["Balanced", "Short bursts", "Longer sessions"],
    index=["Balanced", "Short bursts", "Longer sessions"].index(user_prefs.get("focus_style", "Balanced"))
    if user_prefs.get("focus_style") in ["Balanced", "Short bursts", "Longer sessions"]
    else 0,
    help="Short bursts prioritize 25m blocks; longer sessions allow extended blocks when rested.",
)

if (
    pref_time != user_prefs.get("study_time")
    or pref_focus != user_prefs.get("focus_style")
):
    st.session_state["user_data"]["preferences"]["study_time"] = pref_time
    st.session_state["user_data"]["preferences"]["focus_style"] = pref_focus
    save_user_data(st.session_state["user_data"])

adaptation_offset = st.session_state["user_data"].get("adaptation_offset", 0)
if adaptation_offset != 0:
    offset_sign = f"+{adaptation_offset}" if adaptation_offset > 0 else f"{adaptation_offset}"
    st.sidebar.markdown(
        f"""
        <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-top: 10px;'>
            <div style='font-size: 0.76rem; font-weight: 600; color: #475569;'>ADAPTIVE DURATION OFFSET</div>
            <div style='font-size: 0.88rem; font-weight: 700; color: #0f172a; margin-top: 2px;'>{offset_sign} min applied</div>
            <div style='font-size: 0.74rem; color: #64748b; margin-top: 2px;'>Cumulative from past feedback</div>
        </div>
        """,
        unsafe_allow_html=True,
    )


# ==================================================
# 1. STUDY ADVISOR
# ==================================================

if active_page == "Study Advisor":
    st.title("Study Session Advisor")
    st.caption("Personalized study and break duration planning powered by Mamdani Fuzzy Inference.")

    # 10-Second Student Check-in Form Card
    with st.container():
        st.markdown(
            """
            <div class='saas-card'>
                <div class='saas-card-header'>
                    <div>
                        <div class='saas-card-title'>Daily Student Check-in</div>
                        <div class='saas-card-desc'>Tell us your current physical stamina and academic context in 10 seconds.</div>
                    </div>
                    <span class='pill pill-coral'>Mamdani Inference</span>
                </div>
            """,
            unsafe_allow_html=True,
        )

        with st.form("checkin_form", border=False):
            col1, col2 = st.columns(2)

            with col1:
                sleep_hours = st.slider(
                    "Hours of Sleep Last Night",
                    min_value=0.0,
                    max_value=12.0,
                    value=7.0,
                    step=0.5,
                    help="Normal healthy range is typically 6–9 hours.",
                )

                energy_selection = st.radio(
                    "Current Energy State",
                    ["Drained (Low energy, tired)", "Okay (Steady, normal)", "Energized (Fresh, alert)"],
                    index=1,
                    horizontal=False,
                )

            with col2:
                deadline_selection = st.radio(
                    "Nearest Deadline Urgency",
                    ["Today / Imminent (< 24 hours)", "In 2–3 Days (Near)", "In a Week or Later (Far)"],
                    index=1,
                    horizontal=False,
                )

                difficulty_selection = st.radio(
                    "Topic Difficulty",
                    ["Easy (Familiar review / revision)", "Medium (Standard core material)", "Hard (Challenging / abstract concepts)"],
                    index=1,
                    horizontal=False,
                )

            task_choice = None
            if st.session_state["tasks"]:
                task_names = [t.name for t in st.session_state["tasks"]] + ["Custom / General Session"]
                task_choice = st.selectbox("Assign this session to a task (optional):", task_names)

            submitted = st.form_submit_button("Generate Study Recommendation", type="primary")

        st.markdown("</div>", unsafe_allow_html=True)

    # Numerical mappings for fuzzy inference
    energy_map = {
        "Drained (Low energy, tired)": 1.5,
        "Okay (Steady, normal)": 5.0,
        "Energized (Fresh, alert)": 8.5,
    }
    deadline_map = {
        "Today / Imminent (< 24 hours)": 0.5,
        "In 2–3 Days (Near)": 2.5,
        "In a Week or Later (Far)": 8.0,
    }
    difficulty_map = {
        "Easy (Familiar review / revision)": 2.5,
        "Medium (Standard core material)": 5.0,
        "Hard (Challenging / abstract concepts)": 8.5,
    }

    if submitted:
        energy_val = energy_map[energy_selection]
        deadline_val = deadline_map[deadline_selection]
        diff_val = difficulty_map[difficulty_selection]

        # 1. Run Mamdani Fuzzy Inference Engine
        base_res = infer_study_advice(
            sleep_hours=sleep_hours,
            energy=energy_val,
            days_to_deadline=deadline_val,
            difficulty=diff_val,
        )

        # 2. Apply Rule-Based Feedback Adaptation & Focus Style Preferences
        last_fb = st.session_state["user_data"].get("last_feedback")
        adapted_res = apply_adaptation_and_preferences(
            base_study_minutes=base_res["study_minutes"],
            base_break_minutes=base_res["break_minutes"],
            intensity=base_res["intensity"],
            preferences=st.session_state["user_data"].get("preferences", {}),
            adaptation_offset=st.session_state["user_data"].get("adaptation_offset", 0),
            last_feedback=last_fb,
        )

        # 3. Generate input-grounded explanation
        explanation = generate_recommendation_explanation(
            sleep_hours=sleep_hours,
            energy_input=energy_selection,
            deadline_input=deadline_selection,
            difficulty_input=difficulty_selection,
            final_study_minutes=adapted_res["final_study_minutes"],
            final_break_minutes=adapted_res["final_break_minutes"],
            intensity=base_res["intensity"],
            rest_needed=base_res["rest_needed"],
            base_study_minutes=base_res["study_minutes"],
            adaptation_offset=st.session_state["user_data"].get("adaptation_offset", 0),
            last_feedback=last_fb,
            focus_style=st.session_state["user_data"].get("preferences", {}).get("focus_style", "Balanced"),
        )

        st.session_state["last_recommendation"] = {
            "fuzzy": base_res,
            "adapted": adapted_res,
            "explanation": explanation,
            "inputs": {
                "sleep": sleep_hours,
                "energy": energy_selection,
                "deadline": deadline_selection,
                "difficulty": difficulty_selection,
            },
            "task_name": task_choice if task_choice else "General Study Session",
        }

    # Display Recommendation Card
    rec = st.session_state["last_recommendation"]
    if rec:
        fuzzy_out = rec["fuzzy"]
        adapted_out = rec["adapted"]
        exp_out = rec.get("explanation")
        study_min = adapted_out["final_study_minutes"]
        break_min = adapted_out["final_break_minutes"]
        intensity = fuzzy_out["intensity"]
        rest_needed = fuzzy_out["rest_needed"]

        # Card container
        st.markdown(
            f"""
            <div class='rec-container'>
                <div style='display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;'>
                    <div style='font-size: 1.15rem; font-weight: 700; color: #0f172a;'>
                        Recommended Session for: <span style='color: #e0564c;'>{rec['task_name']}</span>
                    </div>
                    <span class='pill pill-coral'>Active Plan</span>
                </div>
            """,
            unsafe_allow_html=True,
        )

        # 4 Responsive Metric Cards
        mcol1, mcol2, mcol3, mcol4 = st.columns(4)
        with mcol1:
            delta_str = f"Base: {fuzzy_out['study_minutes']}m" if study_min != fuzzy_out['study_minutes'] else None
            st.metric("Study Duration", f"{study_min} min", delta=delta_str)
        with mcol2:
            st.metric("Break Duration", f"{break_min} min")
        with mcol3:
            st.metric("Approach", intensity)
        with mcol4:
            st.metric("Rest Needed", rest_needed)

        # Grounded Explanation Content
        if exp_out:
            st.markdown(
                f"""
                <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin: 14px 0 10px 0;'>
                    <div style='font-weight: 600; color: #0f172a; margin-bottom: 6px;'>Session Guidance</div>
                    <div style='font-size: 0.92rem; color: #334155; line-height: 1.5;'>{exp_out['guidance']}</div>
                    <div style='font-size: 0.88rem; color: #475569; margin-top: 8px; line-height: 1.45;'>{exp_out['stamina_note']}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

            # Context points
            for point in exp_out["context_notes"]:
                st.markdown(f"<div style='font-size: 0.86rem; color: #475569; margin-bottom: 4px;'>• {point}</div>", unsafe_allow_html=True)

            with st.expander("Adjustment Transparency & Base Reasoning"):
                for t_note in exp_out["transparency_notes"]:
                    st.write(f"- {t_note}")
                st.caption(exp_out["disclaimer"])

        st.markdown("</div>", unsafe_allow_html=True)

        # Button to Load into Timer
        if st.button("Load Recommendation Into Timer & Begin", type="primary"):
            st.session_state["timer_task_name"] = rec["task_name"]
            st.session_state["timer_mode"] = "study"
            st.session_state["timer_total_seconds"] = study_min * 60
            st.session_state["timer_remaining_seconds"] = study_min * 60
            st.session_state["timer_state"] = "running"
            st.session_state["timer_last_timestamp"] = time.time()
            st.session_state["study_target_min"] = study_min
            st.session_state["break_target_min"] = break_min
            st.rerun()

    # --------------------------------------------------
    # STUDY & BREAK TIMER CARD
    # --------------------------------------------------
    # Handle Timer Tick
    now = time.time()
    if st.session_state["timer_state"] == "running":
        elapsed = int(now - st.session_state.get("timer_last_timestamp", now))
        if elapsed >= 1:
            st.session_state["timer_remaining_seconds"] = max(
                0, st.session_state["timer_remaining_seconds"] - elapsed
            )
            st.session_state["timer_last_timestamp"] = now

        if st.session_state["timer_remaining_seconds"] <= 0:
            if st.session_state["timer_mode"] == "study":
                st.session_state["timer_mode"] = "break"
                break_secs = st.session_state.get("break_target_min", 10) * 60
                st.session_state["timer_total_seconds"] = break_secs
                st.session_state["timer_remaining_seconds"] = break_secs
                st.session_state["timer_state"] = "paused"
                st.toast("🎉 Study block completed! Time for a rest break.")
            else:
                st.session_state["timer_state"] = "finished"
                st.toast("☕ Break completed! Please record your feedback.")

    rem_seconds = st.session_state["timer_remaining_seconds"]
    tot_seconds = max(1, st.session_state["timer_total_seconds"])
    mins = rem_seconds // 60
    secs = rem_seconds % 60
    progress_val = max(0.0, min(1.0, 1.0 - (rem_seconds / tot_seconds)))

    st.markdown(
        """
        <div class='saas-card'>
            <div class='saas-card-header'>
                <div class='saas-card-title'>Active Session Timer</div>
        """,
        unsafe_allow_html=True,
    )

    is_study = st.session_state["timer_mode"] == "study"
    mode_pill = "<span class='pill pill-coral'>📚 Study Session</span>" if is_study else "<span class='pill pill-green'>☕ Rest Break</span>"
    st.markdown(
        f"""
        <div style='display: flex; justify-content: space-between; align-items: center;'>
            <div>{mode_pill} &nbsp; <span style='font-size: 0.95rem; font-weight: 600; color: #1e293b;'>{st.session_state['timer_task_name']}</span></div>
            <div style='font-size: 0.8rem; color: #64748b; font-weight: 500;'>Status: <b>{st.session_state['timer_state'].upper()}</b></div>
        </div>
        """,
        unsafe_allow_html=True,
    )

    # Big visible tabular timer countdown
    st.markdown(
        f"<div class='timer-display'>{mins:02d}:{secs:02d}</div>",
        unsafe_allow_html=True,
    )
    st.progress(progress_val)

    # Timer Controls in clean 5-column layout
    tcol1, tcol2, tcol3, tcol4, tcol5 = st.columns(5)

    with tcol1:
        if st.session_state["timer_state"] == "running":
            if st.button("⏸️ Pause", use_container_width=True):
                st.session_state["timer_state"] = "paused"
                st.rerun()
        else:
            if st.button("▶️ Start / Resume", type="primary", use_container_width=True):
                st.session_state["timer_state"] = "running"
                st.session_state["timer_last_timestamp"] = time.time()
                st.rerun()

    with tcol2:
        if st.button("🔄 Reset", use_container_width=True):
            st.session_state["timer_state"] = "idle"
            st.session_state["timer_remaining_seconds"] = st.session_state["timer_total_seconds"]
            st.rerun()

    with tcol3:
        if st.session_state["timer_mode"] == "study":
            if st.button("⏭️ Next (To Break)", use_container_width=True):
                st.session_state["timer_mode"] = "break"
                break_secs = st.session_state.get("break_target_min", 10) * 60
                st.session_state["timer_total_seconds"] = break_secs
                st.session_state["timer_remaining_seconds"] = break_secs
                st.session_state["timer_state"] = "paused"
                st.rerun()
        else:
            if st.button("✅ Finish Session", use_container_width=True):
                st.session_state["timer_state"] = "finished"
                st.rerun()

    with tcol4:
        if st.button("⏩ Advance 1 Min", use_container_width=True):
            st.session_state["timer_remaining_seconds"] = max(0, st.session_state["timer_remaining_seconds"] - 60)
            st.rerun()

    with tcol5:
        if st.button("⏹️ Reset All", use_container_width=True):
            st.session_state["timer_state"] = "idle"
            st.session_state["timer_mode"] = "study"
            st.session_state["timer_remaining_seconds"] = 25 * 60
            st.session_state["timer_total_seconds"] = 25 * 60
            st.rerun()

    # Feedback dialogue on completion
    if st.session_state["timer_state"] == "finished" or (st.session_state["timer_mode"] == "break" and rem_seconds == 0):
        st.markdown(
            """
            <div style='background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 14px 18px; margin-top: 14px;'>
                <div style='font-size: 0.95rem; font-weight: 700; color: #166534;'>🎉 Session Complete!</div>
                <div style='font-size: 0.84rem; color: #15803d;'>Log your feedback below to conservatively adapt future session lengths.</div>
            </div>
            """,
            unsafe_allow_html=True,
        )

        with st.form("feedback_form"):
            fb_col1, fb_col2 = st.columns(2)
            with fb_col1:
                feedback_choice = st.radio(
                    "How did the study duration feel?",
                    ["Just right", "Too short", "Too long"],
                    index=0,
                )
            with fb_col2:
                energy_post = st.radio(
                    "Energy state after the break",
                    ["Better ⚡", "Unchanged 😐", "Lower 😴"],
                    index=0,
                )

            if st.form_submit_button("Save Session & Feedback", type="primary"):
                record_session(
                    data=st.session_state["user_data"],
                    task_name=st.session_state["timer_task_name"],
                    study_minutes=st.session_state.get("study_target_min", 25),
                    break_minutes=st.session_state.get("break_target_min", 10),
                    feedback=feedback_choice,
                    post_break_energy=energy_post,
                )
                st.session_state["timer_state"] = "idle"
                st.session_state["timer_mode"] = "study"
                st.session_state["timer_remaining_seconds"] = 25 * 60
                st.session_state["timer_total_seconds"] = 25 * 60
                st.success("Session saved! Feedback adaptation applied.")
                st.rerun()

    st.markdown("</div>", unsafe_allow_html=True)

    # Rerun tick if timer is active
    if st.session_state["timer_state"] == "running":
        time.sleep(1)
        st.rerun()


# ==================================================
# 2. MY TASKS (FUZZY TASK PRIORITIZER)
# ==================================================

elif active_page == "My Tasks":
    st.title("Task Prioritization")
    st.caption("Coursework ranked dynamically by a 27-rule Mamdani Fuzzy Prioritizer.")

    # Sort tasks by fuzzy priority
    st.session_state["tasks"] = prioritize_tasks(st.session_state["tasks"])
    persist_tasks()

    # Summary Stats Bar
    total_count = len(st.session_state["tasks"])
    high_count = sum(1 for t in st.session_state["tasks"] if t.priority_level == "High Priority")
    med_count = sum(1 for t in st.session_state["tasks"] if t.priority_level == "Medium Priority")
    low_count = sum(1 for t in st.session_state["tasks"] if t.priority_level == "Low Priority")

    scol1, scol2, scol3, scol4 = st.columns(4)
    with scol1:
        st.metric("Total Tasks", total_count)
    with scol2:
        st.metric("High Priority", high_count)
    with scol3:
        st.metric("Medium Priority", med_count)
    with scol4:
        st.metric("Low Priority", low_count)

    st.markdown("---")

    # Ranked Task List
    st.subheader("Current Tasks (Ranked by Fuzzy Score)")
    if st.session_state["tasks"]:
        for idx, task in enumerate(st.session_state["tasks"]):
            if task.priority_level == "High Priority":
                badge_html = f"<span class='pill pill-coral'>High Priority • {task.priority_score}/100</span>"
            elif task.priority_level == "Medium Priority":
                badge_html = f"<span class='pill pill-amber'>Medium Priority • {task.priority_score}/100</span>"
            else:
                badge_html = f"<span class='pill pill-green'>Low Priority • {task.priority_score}/100</span>"

            with st.expander(f"{task.name} ({task.subject}) — {task.priority_level} [{task.priority_score}/100]", expanded=(idx == 0)):
                st.markdown(badge_html, unsafe_allow_html=True)

                rcol1, rcol2, rcol3, rcol4 = st.columns(4)
                with rcol1:
                    st.write(f"⏱️ **Duration:** {task.estimated_duration} min")
                with rcol2:
                    st.write(f"⏳ **Deadline:** {task.deadline_days} days")
                with rcol3:
                    st.write(f"📚 **Difficulty:** {task.difficulty}/10")
                with rcol4:
                    st.write(f"⭐ **Importance:** {task.importance}/10")

                st.info(f"**AI Reasoning:** {task.priority_reason}")

                if st.button(f"🗑️ Delete Task", key=f"del_{idx}"):
                    st.session_state["tasks"].pop(idx)
                    persist_tasks()
                    st.rerun()
    else:
        st.info("No active tasks found. Add a coursework task below to calculate its fuzzy priority.")

    # Add Task Form Card
    st.markdown(
        """
        <div class='saas-card'>
            <div class='saas-card-header'>
                <div class='saas-card-title'>Add New Coursework Task</div>
                <span class='pill pill-slate'>Fuzzy Evaluation</span>
            </div>
        """,
        unsafe_allow_html=True,
    )

    with st.form("add_task_form", border=False):
        col1, col2 = st.columns(2)
        with col1:
            st.markdown("<div style='font-size: 0.82rem; font-weight: 600; color: #64748b; margin-bottom: 6px;'>TASK INFORMATION</div>", unsafe_allow_html=True)
            new_name = st.text_input("Task Name*", placeholder="e.g. Distributed Systems Lab 3")
            new_subject = st.text_input("Subject / Course", placeholder="e.g. Computer Science")
            new_duration = st.number_input("Estimated Duration (minutes)*", min_value=10, max_value=240, value=45, step=5)

        with col2:
            st.markdown("<div style='font-size: 0.82rem; font-weight: 600; color: #64748b; margin-bottom: 6px;'>PRIORITY CRITERIA</div>", unsafe_allow_html=True)
            new_deadline = st.number_input("Days until Deadline*", min_value=0.0, max_value=60.0, value=2.0, step=0.5)
            new_difficulty = st.slider("Difficulty (0 = Easy, 10 = Hard)", 0.0, 10.0, 5.0, 0.5)
            new_importance = st.slider("Importance / Grade Impact (0 = Low, 10 = Critical)", 0.0, 10.0, 7.0, 0.5)

        submit_task = st.form_submit_button("Add & Calculate Fuzzy Priority", type="primary")

    if submit_task:
        if not new_name.strip():
            st.error("Task name cannot be empty.")
        else:
            try:
                new_t = Task(
                    name=new_name.strip(),
                    subject=new_subject.strip() if new_subject.strip() else "General",
                    estimated_duration=int(new_duration),
                    deadline_days=float(new_deadline),
                    difficulty=float(new_difficulty),
                    importance=float(new_importance),
                )
                st.session_state["tasks"].append(new_t)
                st.session_state["tasks"] = prioritize_tasks(st.session_state["tasks"])
                persist_tasks()
                st.success(f"Task '{new_name}' added and evaluated.")
                st.rerun()
            except Exception as e:
                st.error(f"Error adding task: {e}")

    st.markdown("</div>", unsafe_allow_html=True)

    if st.button("Reset to Sample Coursework Tasks"):
        default_data = get_default_data()
        st.session_state["tasks"] = [
            Task(
                name=t["name"],
                subject=t["subject"],
                estimated_duration=t["estimated_duration"],
                deadline_days=t["deadline_days"],
                difficulty=t["difficulty"],
                importance=t["importance"],
            )
            for t in default_data["tasks"]
        ]
        persist_tasks()
        st.rerun()


# ==================================================
# 3. TODAY'S PLAN (HEURISTIC SEARCH SCHEDULER)
# ==================================================

elif active_page == "Today's Plan":
    st.title("Today's Daily Schedule")
    st.caption("Greedy Best-First Search (GBFS) heuristic schedule optimizer.")

    # Available Time Controls Card
    with st.container():
        st.markdown(
            """
            <div class='saas-card'>
                <div class='saas-card-header'>
                    <div>
                        <div class='saas-card-title'>Daily Study Time Budget & Break Preferences</div>
                        <div class='saas-card-desc'>Specify your available hours today. The scheduler will construct a feasible timeline with rest intervals.</div>
                    </div>
                    <span class='pill pill-blue'>AISC Search</span>
                </div>
            """,
            unsafe_allow_html=True,
        )

        scol1, scol2 = st.columns(2)
        with scol1:
            available_hours = st.slider(
                "Available Study Time Today",
                min_value=0.5,
                max_value=8.0,
                value=2.5,
                step=0.5,
                help="Select your available budget. Time is displayed in both hours and minutes.",
            )
            available_minutes = int(available_hours * 60)
            st.caption(f"Selected Budget: **{available_hours:.1f} hours ({available_minutes} minutes)**")

        with scol2:
            break_duration = st.selectbox(
                "Preferred Break Duration Between Blocks",
                [5, 10, 15],
                index=1,
                help="Minutes allocated for rest intervals between study tasks.",
            )

        gen_schedule_btn = st.button("Generate Optimized Schedule", type="primary")
        st.markdown("</div>", unsafe_allow_html=True)

    if gen_schedule_btn or "generated_schedule" not in st.session_state:
        st.session_state["generated_schedule"] = schedule_tasks_gbfs(
            tasks=st.session_state["tasks"],
            available_time_minutes=available_minutes,
            default_break_minutes=break_duration,
        )

    sched = st.session_state["generated_schedule"]

    # Summary Metrics Card
    st.subheader("Schedule Feasibility & Breakdown")
    mcol1, mcol2, mcol3, mcol4, mcol5 = st.columns(5)
    with mcol1:
        st.metric("Available Budget", f"{available_minutes} min", f"{available_hours:.1f} hrs")
    with mcol2:
        st.metric("Total Planned", f"{sched.total_planned_time} min")
    with mcol3:
        st.metric("Study Time", f"{sched.total_study_time} min")
    with mcol4:
        st.metric("Break Time", f"{sched.total_break_time} min")
    with mcol5:
        st.metric("Remaining Buffer", f"{sched.remaining_available_time} min")

    if sched.total_planned_time <= available_minutes:
        st.markdown(
            f"""
            <div style='background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.88rem; color: #166534;'>
                ✅ <b>Feasible Schedule Confirmed:</b> Total planned time ({sched.total_planned_time} min) fits 100% within your available budget ({available_minutes} min).
            </div>
            """,
            unsafe_allow_html=True,
        )

    # Structured Timeline Blocks
    st.subheader("Planned Study Timeline")
    if sched.blocks:
        base_h = 9
        for block in sched.blocks:
            t_start = format_minutes_to_time(block.start_offset, base_h)
            t_end = format_minutes_to_time(block.end_offset, base_h)

            if block.block_type == "study":
                st.markdown(
                    f"""
                    <div class='timeline-study-card'>
                        <div style='display: flex; justify-content: space-between; align-items: center;'>
                            <div style='font-size: 0.95rem; font-weight: 700; color: #1e3a8a;'>
                                ⏰ {t_start} – {t_end} &nbsp; ({block.duration_minutes} min)
                            </div>
                            <span class='pill pill-blue'>{block.priority_level or 'Study Block'}</span>
                        </div>
                        <div style='font-size: 0.92rem; font-weight: 600; color: #0f172a; margin-top: 4px;'>
                            📚 {block.task_name} &nbsp; <span style='font-size: 0.82rem; color: #64748b; font-weight: normal;'>[{block.subject}]</span>
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f"""
                    <div class='timeline-break-card'>
                        <div style='font-size: 0.9rem; font-weight: 700; color: #15803d;'>
                            ☕ {t_start} – {t_end} &nbsp; ({block.duration_minutes} min) — Rest & Recharge Break
                        </div>
                        <div style='font-size: 0.82rem; color: #475569; margin-top: 2px;'>
                            Step away from the screen, hydrate, and stretch.
                        </div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
    else:
        st.info("No tasks could be scheduled within the selected time window. Increase available study hours or reduce task durations.")

    # Unscheduled Tasks
    if sched.unscheduled_tasks:
        st.markdown(
            """
            <div style='background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-top: 14px;'>
                <div style='font-weight: 700; color: #92400e; font-size: 0.95rem; margin-bottom: 6px;'>Unscheduled Tasks & Constraints</div>
            """,
            unsafe_allow_html=True,
        )
        for unsched in sched.unscheduled_tasks:
            t = unsched["task"]
            st.markdown(f"<div style='font-size: 0.86rem; color: #78350f; margin-bottom: 4px;'>• <b>{t.name}</b> ({t.estimated_duration} min) — <i>{unsched['reason']}</i></div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

    # GBFS Algorithm Details Expander (with fixed LaTeX format)
    with st.expander("AISC Algorithm Details: Greedy Best-First Search (GBFS)"):
        try:
            st.markdown(
                r"""
                **Search Formulation:**
                - **State Space:** Each node represents a partial schedule $(S, t_{\text{used}}, R)$, where $S$ is scheduled tasks/breaks, $t_{\text{used}}$ is elapsed minutes, and $R$ is remaining unscheduled coursework.
                - **Feasibility Constraint:** $t_{\text{used}} + t_{\text{break}} + t_{\text{duration}}(t) \le B_{\text{available}}$.
                - **Heuristic Function $h(n)$:**
                  $$h(n) = \sum_{t \in R} \text{PriorityScore}(t) \times \frac{4.0}{\text{DeadlineDays}(t) + 0.5}$$
                - **Search Strategy:** Guided by a min-heap priority queue, expanding states that minimize the cost of leaving urgent and critical work uncompleted.
                """
            )
            nodes_val = sched.algorithm_info.get("nodes_expanded", 0)
            init_h = sched.algorithm_info.get("initial_heuristic", 0)
            final_h = sched.algorithm_info.get("final_heuristic", 0)

            st.write(f"- **Nodes expanded during search:** `{nodes_val}`")
            st.write(f"- **Initial Urgency Penalty \\(h(0)\\):** `{init_h}`")
            st.markdown(f"- **Final Remaining Penalty \\(h(\\text{{best}})\\):** `{final_h}`")
        except Exception as e:
            st.error("Error displaying search metrics.")
            st.caption(f"Detail: {e}")


# ==================================================
# 4. PROGRESS & HISTORY
# ==================================================

elif active_page == "Progress & History":
    st.title("Progress & History")
    st.caption("Review completed study sessions, feedback adaptation metrics, and export history.")

    sessions = st.session_state["user_data"].get("sessions", [])
    total_study_mins = sum(s.get("study_minutes", 0) for s in sessions)
    total_break_mins = sum(s.get("break_minutes", 0) for s in sessions)
    completed_count = len(sessions)

    # Summary Metrics Card
    mcol1, mcol2, mcol3, mcol4 = st.columns(4)
    with mcol1:
        st.metric("Completed Sessions", completed_count)
    with mcol2:
        hours_str = f"{total_study_mins // 60}h {total_study_mins % 60}m"
        st.metric("Total Study Time", f"{total_study_mins} min", hours_str)
    with mcol3:
        st.metric("Total Break Time", f"{total_break_mins} min")
    with mcol4:
        offset = st.session_state["user_data"].get("adaptation_offset", 0)
        offset_display = f"{'+' if offset > 0 else ''}{offset} min"
        st.metric("Adaptive Offset", offset_display)

    st.markdown("---")

    if sessions:
        st.subheader("Session Log")
        display_rows = []
        for s in reversed(sessions):
            display_rows.append({
                "Timestamp": s.get("timestamp", ""),
                "Task": s.get("task_name", ""),
                "Study (min)": s.get("study_minutes", 0),
                "Break (min)": s.get("break_minutes", 0),
                "Duration Feedback": s.get("feedback", "N/A"),
                "Post-Break Energy": s.get("post_break_energy", "N/A"),
            })

        st.dataframe(display_rows, use_container_width=True)

        st.subheader("Data Export")
        ecol1, ecol2 = st.columns(2)
        with ecol1:
            json_data = export_history_json(st.session_state["user_data"])
            st.download_button(
                label="📥 Download History (JSON)",
                data=json_data,
                file_name="study_intelligence_history.json",
                mime="application/json",
                use_container_width=True,
            )
        with ecol2:
            csv_data = export_sessions_csv(st.session_state["user_data"])
            st.download_button(
                label="📥 Download Sessions (CSV)",
                data=csv_data,
                file_name="study_sessions.csv",
                mime="text/csv",
                use_container_width=True,
            )
    else:
        st.info("No study sessions logged yet. Complete your first study session from the Study Advisor tab to start tracking progress.")


# ==================================================
# 5. AISC TECHNICAL DETAILS (ABOUT THIS SYSTEM)
# ==================================================

elif active_page == "AISC Technical Details":
    st.title("AISC System Architecture & Technical Verification")
    st.caption("Deep technical verification of Fuzzy Inference Systems and Heuristic Search Algorithms.")

    tab1, tab2, tab3, tab4 = st.tabs([
        "Study Advisor (81 Rules)",
        "Task Prioritizer (27 Rules)",
        "Heuristic Search Formalism",
        "Heatmaps & Coverage Analysis",
    ])

    with tab1:
        st.subheader("Study Advisor: 4-Input Mamdani System")
        st.write(
            "Mamdani-style inference engine with 81 unique rules covering Sleep (3), Energy (3), "
            "Deadline Urgency (3), and Topic Difficulty (3). Defuzzification is evaluated via discrete centroid of area."
        )

        # Plot Advisor Membership Curves
        x_sleep = [i * 0.1 for i in range(121)]
        x_scale = [i * 0.1 for i in range(101)]

        fig, axes = plt.subplots(2, 2, figsize=(11, 6))

        # Sleep
        axes[0, 0].plot(x_sleep, [trapezoidal(x, 0, 0, 4, 6) for x in x_sleep], label="Low", color="#e0564c")
        axes[0, 0].plot(x_sleep, [triangular(x, 4, 7, 9) for x in x_sleep], label="Medium", color="#d97706")
        axes[0, 0].plot(x_sleep, [trapezoidal(x, 7, 9, 12, 12) for x in x_sleep], label="High", color="#16a34a")
        axes[0, 0].set_title("Sleep (Hours)")
        axes[0, 0].set_ylim(-0.05, 1.05)
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)

        # Energy
        axes[0, 1].plot(x_scale, [trapezoidal(x, 0, 0, 2, 4) for x in x_scale], label="Drained", color="#e0564c")
        axes[0, 1].plot(x_scale, [triangular(x, 2, 5, 8) for x in x_scale], label="Okay", color="#d97706")
        axes[0, 1].plot(x_scale, [trapezoidal(x, 6, 8, 10, 10) for x in x_scale], label="Energized", color="#16a34a")
        axes[0, 1].set_title("Energy (0–10)")
        axes[0, 1].set_ylim(-0.05, 1.05)
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        # Urgency
        axes[1, 0].plot(x_scale, [trapezoidal(x, 0, 0, 0.5, 1.5) for x in x_scale], label="Imminent", color="#e0564c")
        axes[1, 0].plot(x_scale, [triangular(x, 0.5, 3, 7) for x in x_scale], label="Near", color="#d97706")
        axes[1, 0].plot(x_scale, [trapezoidal(x, 5, 10, 30, 30) for x in x_scale], label="Far", color="#16a34a")
        axes[1, 0].set_title("Deadline Urgency (Days)")
        axes[1, 0].set_xlim(0, 15)
        axes[1, 0].set_ylim(-0.05, 1.05)
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)

        # Difficulty
        axes[1, 1].plot(x_scale, [trapezoidal(x, 0, 0, 2, 4) for x in x_scale], label="Easy", color="#16a34a")
        axes[1, 1].plot(x_scale, [triangular(x, 2, 5, 8) for x in x_scale], label="Medium", color="#d97706")
        axes[1, 1].plot(x_scale, [trapezoidal(x, 6, 8, 10, 10) for x in x_scale], label="Hard", color="#e0564c")
        axes[1, 1].set_title("Difficulty (0–10)")
        axes[1, 1].set_ylim(-0.05, 1.05)
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)

        fig.tight_layout()
        st.pyplot(fig)
        plt.close(fig)

        st.write(f"**Total Rule Base Size:** {len(ADVISOR_RULES)} Mamdani Rules")
        with st.expander("View Complete 81-Rule Consequent Table"):
            rule_table = [
                {
                    "Rule #": i + 1,
                    "Sleep": r[0].capitalize(),
                    "Energy": r[1].capitalize(),
                    "Urgency": r[2].capitalize(),
                    "Difficulty": r[3].capitalize(),
                    "Study (min)": r[4],
                    "Break (min)": r[5],
                    "Intensity": r[6],
                    "Rest": r[7],
                }
                for i, r in enumerate(ADVISOR_RULES)
            ]
            st.dataframe(rule_table, use_container_width=True)

    with tab2:
        st.subheader("Task Prioritizer: 3-Input Mamdani System")
        st.write(
            "Computes priority scores (0 to 100) using 27 Mamdani rules balancing Urgency, Importance, and Difficulty. "
            "Constrained so high topic difficulty alone never inappropriately elevates relaxed, low-importance tasks."
        )
        with st.expander("View 27 Task Prioritizer Rules"):
            t_rules = [
                {
                    "Rule #": i + 1,
                    "Urgency": r[0].capitalize(),
                    "Importance": r[1].capitalize(),
                    "Difficulty": r[2].capitalize(),
                    "Consequent Priority": r[3],
                }
                for i, r in enumerate(TASK_RULES)
            ]
            st.dataframe(t_rules, use_container_width=True)

    with tab3:
        st.subheader("Heuristic Search Formalism")
        st.markdown(
            r"""
            ### Greedy Best-First Search (GBFS)
            - **Problem formulation:** Finding a subset and ordering of study tasks and breaks within a finite daily budget $B$.
            - **State representation:** $S = (\text{scheduled}, t_{\text{used}}, \text{remaining})$.
            - **Actions:** Pick an unscheduled task $t$ such that:
              $$t_{\text{used}} + t_{\text{break}} + t_{\text{duration}}(t) \le B$$
            - **Heuristic evaluation function $h(S)$:**
              Estimates the cost of leaving urgent and critical coursework uncompleted:
              $$h(S) = \sum_{t \in \text{remaining}} \text{PriorityScore}(t) \times \frac{4.0}{\text{DeadlineDays}(t) + 0.5}$$
            - **Search Strategy:** Guided by a min-heap priority queue, expanding the state that minimizes $h(S)$.
            - **Optimality Note:** As with all Greedy Best-First Search methods, GBFS optimizes for speed and urgency reduction rather than global combinatorial optimality.
            """
        )

    with tab4:
        st.subheader("Fuzzy Rule Coverage & Heatmaps")
        st.write("Examines rule firing and centroid defuzzification across sleep and energy dimensions.")

        heatmap_wl = st.slider("Workload for Heatmap", 0.0, 10.0, 5.0, 0.5)
        hm_data = generate_heatmap_data(fixed_workload=heatmap_wl, step=1.0)

        s_vals = hm_data["sleep_values"]
        e_vals = hm_data["energy_values"]

        hcol1, hcol2 = st.columns(2)
        with hcol1:
            fig_h1, ax_h1 = plt.subplots(figsize=(5.5, 3.8))
            im1 = ax_h1.imshow(
                hm_data["coverage"],
                origin="lower",
                extent=[s_vals[0], s_vals[-1], e_vals[0], e_vals[-1]],
                aspect="auto",
                vmin=0,
                vmax=1,
                cmap="YlOrRd",
            )
            ax_h1.set_xlabel("Sleep (hours)")
            ax_h1.set_ylabel("Energy (0-10)")
            ax_h1.set_title("Rule Firing Strength")
            fig_h1.colorbar(im1, ax=ax_h1)
            st.pyplot(fig_h1)
            plt.close(fig_h1)

        with hcol2:
            fig_h2, ax_h2 = plt.subplots(figsize=(5.5, 3.8))
            im2 = ax_h2.imshow(
                hm_data["durations"],
                origin="lower",
                extent=[s_vals[0], s_vals[-1], e_vals[0], e_vals[-1]],
                aspect="auto",
                vmin=15,
                vmax=90,
                cmap="Blues",
            )
            ax_h2.set_xlabel("Sleep (hours)")
            ax_h2.set_ylabel("Energy (0-10)")
            ax_h2.set_title("Study Duration (min)")
            fig_h2.colorbar(im2, ax=ax_h2)
            st.pyplot(fig_h2)
            plt.close(fig_h2)
