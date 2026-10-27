"""Fuzzy Study Intelligence System.

A student-friendly intelligent study companion powered by:
1. Mamdani Fuzzy Inference for personalized study and break recommendations.
2. Mamdani Fuzzy Prioritization for student tasks.
3. Heuristic-Guided Search (Greedy Best-First Search) for daily schedule planning.
4. Bounded rule-based feedback adaptation and focus preferences.
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
# PAGE CONFIGURATION & STYLING
# --------------------------------------------------

st.set_page_config(
    page_title="Fuzzy Study Intelligence System",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom light clean CSS for typography and cards
st.markdown(
    """
    <style>
    .metric-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 16px;
        border: 1px solid #e9ecef;
        text-align: center;
    }
    .recommendation-box {
        background: linear-gradient(135deg, #f0f7ff 0%, #e6f0fa 100%);
        border-left: 5px solid #0d6efd;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
    }
    .timeline-block-study {
        background-color: #e7f3ff;
        border-left: 4px solid #0d6efd;
        padding: 10px 14px;
        margin-bottom: 8px;
        border-radius: 4px;
    }
    .timeline-block-break {
        background-color: #e8f5e9;
        border-left: 4px solid #2e7d32;
        padding: 8px 14px;
        margin-bottom: 8px;
        border-radius: 4px;
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

# Ensure tasks list is in session state as Task objects
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
    """Sync session_state tasks to user_data dictionary and save to disk."""
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

st.sidebar.title("🎓 Study Intelligence")
st.sidebar.caption("Computational Intelligence & Search Planner")

nav_choice = st.sidebar.radio(
    "Navigation",
    [
        "🏠 Home / Study Advisor",
        "📋 My Tasks",
        "📅 Today's Plan",
        "📈 Progress & History",
        "🧠 AI Logic / System Analysis",
    ],
    index=0,
)

st.sidebar.divider()
st.sidebar.subheader("⚙️ Personalized Preferences")

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
    st.sidebar.info(
        f"💡 **Adaptive Duration:** {abs(adaptation_offset)} min "
        f"{'added to' if adaptation_offset > 0 else 'subtracted from'} "
        "sessions based on your past feedback."
    )

st.sidebar.caption(
    "AISC Project • Mamdani Fuzzy Logic + Heuristic Search"
)


# ==================================================
# 1. HOME / STUDY ADVISOR
# ==================================================

if nav_choice == "🏠 Home / Study Advisor":
    st.title("🎓 Fuzzy Study Intelligence System")
    st.write(
        "Welcome! Tell us your current state in seconds, and our fuzzy inference "
        "system will calculate an optimal, balanced study and break session tailored to your stamina."
    )

    st.subheader("⏱️ 10-Second Student Check-in")
    with st.form("checkin_form"):
        col1, col2 = st.columns(2)

        with col1:
            sleep_hours = st.slider(
                "😴 How many hours did you sleep last night?",
                min_value=0.0,
                max_value=12.0,
                value=7.0,
                step=0.5,
                help="Range: 0 to 12 hours.",
            )

            energy_selection = st.radio(
                "⚡ How is your current energy?",
                ["Drained (Low energy, tired)", "Okay (Steady, normal)", "Energized (Fresh, alert)"],
                index=1,
            )

        with col2:
            deadline_selection = st.radio(
                "⏳ Nearest Deadline Urgency",
                ["Today / Imminent (< 24 hours)", "In 2–3 Days (Near)", "In a Week or Later (Far)"],
                index=1,
            )

            difficulty_selection = st.radio(
                "📚 Topic Difficulty to Study",
                ["Easy (Familiar review / revision)", "Medium (Standard core material)", "Hard (Challenging / abstract concepts)"],
                index=1,
            )

        task_choice = None
        if st.session_state["tasks"]:
            task_names = [t.name for t in st.session_state["tasks"]] + ["Custom / General Session"]
            task_choice = st.selectbox("Assign this session to a task (optional):", task_names)

        submitted = st.form_submit_button("🎯 Get My Study Recommendation", type="primary")

    # Mapping friendly student selections to internal fuzzy inputs
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

        # 2. Apply Rule-Based Adaptation & Focus Preferences
        adapted_res = apply_adaptation_and_preferences(
            base_study_minutes=base_res["study_minutes"],
            base_break_minutes=base_res["break_minutes"],
            intensity=base_res["intensity"],
            preferences=st.session_state["user_data"].get("preferences", {}),
            adaptation_offset=st.session_state["user_data"].get("adaptation_offset", 0),
        )

        st.session_state["last_recommendation"] = {
            "fuzzy": base_res,
            "adapted": adapted_res,
            "inputs": {
                "sleep": sleep_hours,
                "energy": energy_selection,
                "deadline": deadline_selection,
                "difficulty": difficulty_selection,
            },
            "task_name": task_choice if task_choice else "General Study Session",
        }

    # Display Recommendation Card if available
    rec = st.session_state["last_recommendation"]
    if rec:
        fuzzy_out = rec["fuzzy"]
        adapted_out = rec["adapted"]
        study_min = adapted_out["final_study_minutes"]
        break_min = adapted_out["final_break_minutes"]
        intensity = fuzzy_out["intensity"]
        rest_needed = fuzzy_out["rest_needed"]

        st.divider()
        st.subheader("📋 Your Personalized Recommendation")

        # Recommendation Card UI
        rcol1, rcol2, rcol3, rcol4 = st.columns(4)
        with rcol1:
            st.metric("Study Duration", f"{study_min} min", delta=f"Base: {fuzzy_out['study_minutes']}m" if study_min != fuzzy_out['study_minutes'] else None)
        with rcol2:
            st.metric("Break Duration", f"{break_min} min")
        with rcol3:
            st.metric("Study Approach", intensity)
        with rcol4:
            st.metric("Rest Needed", rest_needed)

        # Natural language actionable explanation
        explanation_lines = []
        if intensity == "Light revision":
            explanation_lines.append(
                f"Start with a gentle {study_min}-minute revision session, followed by a {break_min}-minute break. "
                "Because your stamina is depleted or sleep was limited, focus on light consolidation rather than complex problem solving."
            )
        elif intensity == "Challenging material":
            explanation_lines.append(
                f"You are well primed for a deep {study_min}-minute focused session, followed by a {break_min}-minute break. "
                "Your energy and rest levels are high, making this an ideal window to tackle complex or urgent concepts."
            )
        else:
            explanation_lines.append(
                f"Work steadily for {study_min} minutes, followed by a {break_min}-minute rest. "
                "Your stamina is balanced, allowing steady progress through standard coursework."
            )

        if adapted_out["adjustment_explanation"]:
            explanation_lines.append(adapted_out["adjustment_explanation"])

        st.info(" ".join(explanation_lines))
        st.caption(
            "Note: Recommendations and rest-needed scores are algorithmic planning guidelines "
            "derived from fuzzy logic rules, not medical assessments."
        )

        # Timer setup trigger
        if st.button("🚀 Load Into Timer & Begin", type="primary"):
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
    # STUDY & BREAK TIMER
    # --------------------------------------------------
    st.divider()
    st.subheader("⏱️ Study & Break Session Timer")

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
                # Study block complete -> transition to break
                st.session_state["timer_mode"] = "break"
                break_secs = st.session_state.get("break_target_min", 10) * 60
                st.session_state["timer_total_seconds"] = break_secs
                st.session_state["timer_remaining_seconds"] = break_secs
                st.session_state["timer_state"] = "paused"
                st.toast("🎉 Study block completed! Time for a well-deserved break.")
            else:
                # Break complete
                st.session_state["timer_state"] = "finished"
                st.toast("☕ Break completed! How are you feeling?")

    rem_seconds = st.session_state["timer_remaining_seconds"]
    tot_seconds = max(1, st.session_state["timer_total_seconds"])
    mins = rem_seconds // 60
    secs = rem_seconds % 60
    progress_val = max(0.0, min(1.0, 1.0 - (rem_seconds / tot_seconds)))

    mode_badge = "📚 Study Session" if st.session_state["timer_mode"] == "study" else "☕ Rest Break"
    st.markdown(f"#### Current Mode: **{mode_badge}** — *{st.session_state['timer_task_name']}*")

    # Big visible countdown
    st.markdown(
        f"<h1 style='text-align: center; font-size: 64px; margin: 10px 0;'>{mins:02d}:{secs:02d}</h1>",
        unsafe_allow_html=True,
    )
    st.progress(progress_val)

    # Timer Controls
    tcol1, tcol2, tcol3, tcol4 = st.columns(4)

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
        if st.button("🔄 Reset Timer", use_container_width=True):
            st.session_state["timer_state"] = "idle"
            st.session_state["timer_remaining_seconds"] = st.session_state["timer_total_seconds"]
            st.rerun()

    with tcol3:
        if st.session_state["timer_mode"] == "study":
            if st.button("⏭️ Complete Study -> Break", use_container_width=True):
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
        # Quick test helper: Fast forward 1 minute
        if st.button("⏩ Advance 1 Min", use_container_width=True):
            st.session_state["timer_remaining_seconds"] = max(0, st.session_state["timer_remaining_seconds"] - 60)
            st.rerun()

    # Session completion & feedback dialog
    if st.session_state["timer_state"] == "finished" or (st.session_state["timer_mode"] == "break" and rem_seconds == 0):
        st.success("🎉 Session finished! Record your feedback to help the system adapt future recommendations.")
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
                    "How is your energy feeling after the break?",
                    ["Better ⚡", "Unchanged 😐", "Lower 😴"],
                    index=0,
                )

            if st.form_submit_button("💾 Save Session to History"):
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
                st.success("Session saved! Future recommendations have been updated.")
                st.rerun()

    # If running, rerun every 1 second to update display
    if st.session_state["timer_state"] == "running":
        time.sleep(1)
        st.rerun()


# ==================================================
# 2. MY TASKS (FUZZY TASK PRIORITIZER)
# ==================================================

elif nav_choice == "📋 My Tasks":
    st.title("📋 My Tasks & Fuzzy Prioritizer")
    st.write(
        "Manage your coursework and assignments. Our secondary Mamdani fuzzy system "
        "evaluates urgency, importance, and difficulty to assign clear, actionable priorities."
    )

    # Sort tasks by fuzzy priority
    st.session_state["tasks"] = prioritize_tasks(st.session_state["tasks"])
    persist_tasks()

    # Task Overview Cards / Table
    if st.session_state["tasks"]:
        st.subheader("Current Tasks (Ranked by Fuzzy Priority)")
        for idx, task in enumerate(st.session_state["tasks"]):
            badge_color = "🔴" if task.priority_level == "High Priority" else "🟡" if task.priority_level == "Medium Priority" else "🟢"
            with st.expander(
                f"{badge_color} **{task.name}** [{task.subject}] — {task.priority_level} (Score: {task.priority_score}/100)",
                expanded=(idx == 0),
            ):
                tcol1, tcol2, tcol3, tcol4 = st.columns(4)
                with tcol1:
                    st.write(f"⏱️ **Duration:** {task.estimated_duration} min")
                with tcol2:
                    st.write(f"⏳ **Deadline:** {task.deadline_days} days remaining")
                with tcol3:
                    st.write(f"📚 **Difficulty:** {task.difficulty}/10")
                with tcol4:
                    st.write(f"⭐ **Importance:** {task.importance}/10")

                st.info(f"💡 **AI Reason:** {task.priority_reason}")

                if st.button(f"🗑️ Delete '{task.name}'", key=f"del_{idx}"):
                    st.session_state["tasks"].pop(idx)
                    persist_tasks()
                    st.rerun()
    else:
        st.info("No tasks added yet! Add your first task below to see fuzzy prioritization in action.")

    st.divider()
    st.subheader("➕ Add a New Task")

    with st.form("add_task_form"):
        col1, col2 = st.columns(2)
        with col1:
            new_name = st.text_input("Task Name*", placeholder="e.g. Operating Systems Lab 3")
            new_subject = st.text_input("Subject / Course", placeholder="e.g. Computer Science")
            new_duration = st.number_input("Estimated Duration (minutes)*", min_value=5, max_value=300, value=45, step=5)

        with col2:
            new_deadline = st.number_input("Days until Deadline*", min_value=0.0, max_value=60.0, value=2.0, step=0.5)
            new_difficulty = st.slider("Difficulty (0 = Very Easy, 10 = Very Hard)", 0.0, 10.0, 5.0, 0.5)
            new_importance = st.slider("Importance / Grade Impact (0 = Low, 10 = Crucial)", 0.0, 10.0, 7.0, 0.5)

        submit_task = st.form_submit_button("Add Task & Calculate Priority", type="primary")

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
                st.success(f"Task '{new_name}' added and prioritized!")
                st.rerun()
            except Exception as e:
                st.error(f"Error adding task: {e}")

    if st.button("🔄 Reset to Default Sample Tasks"):
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

elif nav_choice == "📅 Today's Plan":
    st.title("📅 Today's Plan & Heuristic Scheduler")
    st.write(
        "Using **Greedy Best-First Search (GBFS)**, our scheduling algorithm organizes your "
        "tasks into a feasible daily timeline that respects your available study hours, "
        "prioritizes imminent deadlines, and schedules rest breaks between study sessions."
    )

    scol1, scol2 = st.columns(2)
    with scol1:
        available_hours = st.slider("Available Study Time Today (Hours)", 0.5, 8.0, 2.5, 0.5)
        available_minutes = int(available_hours * 60)
    with scol2:
        break_duration = st.selectbox("Preferred Break Duration Between Tasks", [5, 10, 15], index=1)

    if st.button("⚡ Generate Schedule with Heuristic Search", type="primary"):
        st.session_state["generated_schedule"] = schedule_tasks_gbfs(
            tasks=st.session_state["tasks"],
            available_time_minutes=available_minutes,
            default_break_minutes=break_duration,
        )

    # Display schedule if generated or generate default
    if "generated_schedule" not in st.session_state:
        st.session_state["generated_schedule"] = schedule_tasks_gbfs(
            tasks=st.session_state["tasks"],
            available_time_minutes=available_minutes,
            default_break_minutes=break_duration,
        )

    sched = st.session_state["generated_schedule"]

    st.divider()
    st.subheader("📊 Schedule Summary")
    mcol1, mcol2, mcol3, mcol4 = st.columns(4)
    with mcol1:
        st.metric("Total Planned Time", f"{sched.total_planned_time} min")
    with mcol2:
        st.metric("Study Time", f"{sched.total_study_time} min")
    with mcol3:
        st.metric("Break Time", f"{sched.total_break_time} min")
    with mcol4:
        st.metric("Remaining Buffer", f"{sched.remaining_available_time} min")

    if sched.total_planned_time <= available_minutes:
        st.success("✅ Feasible Schedule: 100% fits within your available time budget.")

    # Timeline view
    st.subheader("🗓️ Structured Daily Timeline")
    if sched.blocks:
        base_h = 9
        for block in sched.blocks:
            t_start = format_minutes_to_time(block.start_offset, base_h)
            t_end = format_minutes_to_time(block.end_offset, base_h)

            if block.block_type == "study":
                st.markdown(
                    f"<div class='timeline-block-study'>"
                    f"⏰ <b>{t_start} – {t_end}</b> ({block.duration_minutes} min) &nbsp;|&nbsp; "
                    f"📚 <b>{block.task_name}</b> [{block.subject}] &nbsp;•&nbsp; <i>{block.priority_level}</i>"
                    f"</div>",
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f"<div class='timeline-block-break'>"
                    f"⏰ <b>{t_start} – {t_end}</b> ({block.duration_minutes} min) &nbsp;|&nbsp; "
                    f"☕ <b>{block.task_name}</b> — Step away, hydrate, and stretch."
                    f"</div>",
                    unsafe_allow_html=True,
                )
    else:
        st.warning("No tasks could be scheduled. Check your available time budget or task list.")

    # Unscheduled tasks
    if sched.unscheduled_tasks:
        st.subheader("⚠️ Unscheduled Tasks")
        st.write("These tasks could not be scheduled in today's time window:")
        for unsched in sched.unscheduled_tasks:
            t = unsched["task"]
            st.markdown(f"- **{t.name}** ({t.estimated_duration} min) — *Reason: {unsched['reason']}*")

    # Algorithm Details Expander
    with st.expander("🔍 AISC Algorithm Details: Greedy Best-First Search (GBFS)"):
        st.write(
            """
            **How the Heuristic Search Works:**
            - **State Space:** Each node represents a partial schedule `(scheduled_tasks, time_spent, remaining_tasks)`.
            - **Candidate Actions:** Picking an unscheduled task that satisfies feasibility `time_spent + break + duration <= budget`.
            - **Heuristic Function \\(h(n)\\):**
              $$\\sum_{t \\in \\text{remaining}} \\text{PriorityScore}(t) \\times \\frac{4.0}{\\text{DeadlineDays}(t) + 0.5}$$
              GBFS guides search towards states that minimize the penalty of leaving urgent, high-priority tasks uncompleted.
            """
        )
        st.write(f"**Nodes expanded during search:** {sched.algorithm_info.get('nodes_expanded', 0)}")
        st.write(f"**Initial Urgency Penalty \\(h(0)\\):** {sched.algorithm_info.get('initial_heuristic', 0)}")
        st.write(f"**Final Remaining Penalty \\(h(\\text{best})\\):** {sched.algorithm_info.get('final_heuristic', 0)}")


# ==================================================
# 4. PROGRESS & HISTORY
# ==================================================

elif nav_choice == "📈 Progress & History":
    st.title("📈 Study Progress & History")
    st.write(
        "Review your completed study sessions, feedback adaptation metrics, and export your history."
    )

    sessions = st.session_state["user_data"].get("sessions", [])

    total_study_mins = sum(s.get("study_minutes", 0) for s in sessions)
    total_break_mins = sum(s.get("break_minutes", 0) for s in sessions)
    completed_count = len(sessions)

    mcol1, mcol2, mcol3, mcol4 = st.columns(4)
    with mcol1:
        st.metric("Completed Sessions", completed_count)
    with mcol2:
        st.metric("Total Study Time", f"{total_study_mins} min")
    with mcol3:
        st.metric("Total Break Time", f"{total_break_mins} min")
    with mcol4:
        offset = st.session_state["user_data"].get("adaptation_offset", 0)
        st.metric("Adaptive Offset", f"{'+' if offset > 0 else ''}{offset} min")

    st.divider()

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

        st.subheader("💾 Export Study Data")
        ecol1, ecol2 = st.columns(2)
        with ecol1:
            json_data = export_history_json(st.session_state["user_data"])
            st.download_button(
                label="📥 Download History (JSON)",
                data=json_data,
                file_name="study_intelligence_history.json",
                mime="application/json",
            )
        with ecol2:
            csv_data = export_sessions_csv(st.session_state["user_data"])
            st.download_button(
                label="📥 Download History (CSV)",
                data=csv_data,
                file_name="study_sessions.csv",
                mime="text/csv",
            )
    else:
        st.info("No study sessions logged yet. Complete a study session with the timer on the Home page to start tracking!")


# ==================================================
# 5. AI LOGIC / SYSTEM ANALYSIS
# ==================================================

elif nav_choice == "🧠 AI Logic / System Analysis":
    st.title("🧠 AISC System Analysis & Architecture")
    st.write(
        "Technical verification and visualization of the Computational Intelligence "
        "and Search algorithms powering the Fuzzy Study Intelligence System."
    )

    tab1, tab2, tab3, tab4 = st.tabs([
        "Advisor Fuzzy Sets (81 Rules)",
        "Task Prioritizer Sets (27 Rules)",
        "Heuristic Search Formalism",
        "Heatmaps & Coverage Analysis",
    ])

    with tab1:
        st.subheader("Study Advisor: 4-Input Mamdani System")
        st.write(
            "Uses 81 Mamdani fuzzy rules covering sleep (3), energy (3), deadline urgency (3), "
            "and topic difficulty (3). Consequents determine study duration, break duration, intensity, and rest needed."
        )

        # Plot Advisor Membership Functions
        x_sleep = [i * 0.1 for i in range(121)]
        x_scale = [i * 0.1 for i in range(101)]

        fig, axes = plt.subplots(2, 2, figsize=(12, 7))

        # Sleep
        axes[0, 0].plot(x_sleep, [trapezoidal(x, 0, 0, 4, 6) for x in x_sleep], label="Low")
        axes[0, 0].plot(x_sleep, [triangular(x, 4, 7, 9) for x in x_sleep], label="Medium")
        axes[0, 0].plot(x_sleep, [trapezoidal(x, 7, 9, 12, 12) for x in x_sleep], label="High")
        axes[0, 0].set_title("Sleep (Hours)")
        axes[0, 0].set_ylim(-0.05, 1.05)
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)

        # Energy
        axes[0, 1].plot(x_scale, [trapezoidal(x, 0, 0, 2, 4) for x in x_scale], label="Drained")
        axes[0, 1].plot(x_scale, [triangular(x, 2, 5, 8) for x in x_scale], label="Okay")
        axes[0, 1].plot(x_scale, [trapezoidal(x, 6, 8, 10, 10) for x in x_scale], label="Energized")
        axes[0, 1].set_title("Energy (0–10)")
        axes[0, 1].set_ylim(-0.05, 1.05)
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)

        # Urgency
        axes[1, 0].plot(x_scale, [trapezoidal(x, 0, 0, 0.5, 1.5) for x in x_scale], label="Imminent")
        axes[1, 0].plot(x_scale, [triangular(x, 0.5, 3, 7) for x in x_scale], label="Near")
        axes[1, 0].plot(x_scale, [trapezoidal(x, 5, 10, 30, 30) for x in x_scale], label="Far")
        axes[1, 0].set_title("Deadline Urgency (Days)")
        axes[1, 0].set_xlim(0, 15)
        axes[1, 0].set_ylim(-0.05, 1.05)
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)

        # Difficulty
        axes[1, 1].plot(x_scale, [trapezoidal(x, 0, 0, 2, 4) for x in x_scale], label="Easy")
        axes[1, 1].plot(x_scale, [triangular(x, 2, 5, 8) for x in x_scale], label="Medium")
        axes[1, 1].plot(x_scale, [trapezoidal(x, 6, 8, 10, 10) for x in x_scale], label="Hard")
        axes[1, 1].set_title("Difficulty (0–10)")
        axes[1, 1].set_ylim(-0.05, 1.05)
        axes[1, 1].legend()
        axes[1, 1].grid(True, alpha=0.3)

        fig.tight_layout()
        st.pyplot(fig)
        plt.close(fig)

        # Rule Base Explorer
        st.write(f"**Total Rule Base Size:** {len(ADVISOR_RULES)} Mamdani Rules")
        with st.expander("View 81-Rule Consequent Table"):
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
            "Computes task priority scores (0 to 100) using 27 Mamdani rules across "
            "Urgency, Importance, and Difficulty."
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
            """
            ### Greedy Best-First Search (GBFS)
            - **Problem formulation:** Finding a subset and ordering of study tasks and breaks within a finite daily budget \\(B\\).
            - **State representation:** \\(S = (\\text{scheduled}, \\text{time\\_spent}, \\text{remaining})\\)
            - **Actions:** Pick an unscheduled task \\(t\\) such that:
              $$\\text{time\\_spent} + \\text{break\\_duration} + \\text{duration}(t) \\le B$$
            - **Heuristic evaluation function \\(h(S)\\):**
              Estimates the cost of uncompleted work:
              $$h(S) = \\sum_{t \\in \\text{remaining}} \\text{PriorityScore}(t) \\times \\frac{4.0}{\\text{DeadlineDays}(t) + 0.5}$$
            - **Search Strategy:** Guided by a min-heap priority queue, expanding the state that minimizes \\(h(S)\\).
            """
        )

    with tab4:
        st.subheader("Fuzzy Rule Coverage & Heatmaps")
        st.write("Examines rule firing and centroid defuzzification across sleep and energy.")

        heatmap_wl = st.slider("Workload for Heatmap", 0.0, 10.0, 5.0, 0.5)
        hm_data = generate_heatmap_data(fixed_workload=heatmap_wl, step=1.0)

        s_vals = hm_data["sleep_values"]
        e_vals = hm_data["energy_values"]

        hcol1, hcol2 = st.columns(2)
        with hcol1:
            fig_h1, ax_h1 = plt.subplots(figsize=(6, 4))
            im1 = ax_h1.imshow(
                hm_data["coverage"],
                origin="lower",
                extent=[s_vals[0], s_vals[-1], e_vals[0], e_vals[-1]],
                aspect="auto",
                vmin=0,
                vmax=1,
            )
            ax_h1.set_xlabel("Sleep (hours)")
            ax_h1.set_ylabel("Energy (0-10)")
            ax_h1.set_title("Rule Firing Strength")
            fig_h1.colorbar(im1, ax=ax_h1)
            st.pyplot(fig_h1)
            plt.close(fig_h1)

        with hcol2:
            fig_h2, ax_h2 = plt.subplots(figsize=(6, 4))
            im2 = ax_h2.imshow(
                hm_data["durations"],
                origin="lower",
                extent=[s_vals[0], s_vals[-1], e_vals[0], e_vals[-1]],
                aspect="auto",
                vmin=15,
                vmax=90,
            )
            ax_h2.set_xlabel("Sleep (hours)")
            ax_h2.set_ylabel("Energy (0-10)")
            ax_h2.set_title("Recommended Study Duration (min)")
            fig_h2.colorbar(im2, ax=ax_h2)
            st.pyplot(fig_h2)
            plt.close(fig_h2)
