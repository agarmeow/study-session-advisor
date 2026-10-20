
import streamlit as st
import matplotlib.pyplot as plt

from fuzzy_engine import (
    infer_study_duration,
    triangular_membership,
    trapezoidal_membership,
)

# ---------------- PAGE CONFIGURATION ----------------

st.set_page_config(
    page_title="Study Session Advisor",
    page_icon="📚",
    layout="wide",
)

st.title("📚 Fuzzy Logic-Based Study Session Advisor")
st.write(
    "Get a personalized study-duration recommendation using "
    "fuzzy logic based on your sleep, workload, and energy."
)

st.divider()

# ---------------- SIDEBAR INPUTS ----------------

st.sidebar.header("Your Current State")

sleep = st.sidebar.slider(
    "😴 Hours of sleep",
    min_value=0,
    max_value=12,
    value=7,
    help="How many hours did you sleep?",
)

workload = st.sidebar.slider(
    "📝 Workload",
    min_value=0,
    max_value=10,
    value=5,
    help="0 = very light workload, 10 = very heavy workload",
)

energy = st.sidebar.slider(
    "⚡ Energy level",
    min_value=0,
    max_value=10,
    value=6,
    help="0 = exhausted, 10 = very energetic",
)

st.sidebar.caption(
    "Adjust the sliders and click the button to get your recommendation."
)

# ---------------- RECOMMENDATION ----------------

if st.button("Get Study Recommendation", type="primary"):
    st.session_state["result"] = infer_study_duration(
        sleep=sleep,
        workload=workload,
        energy=energy,
    )
    st.session_state["last_inputs"] = (sleep, workload, energy)

if "result" in st.session_state:
    result = st.session_state["result"]
    last_inputs = st.session_state["last_inputs"]

    duration = result["duration"]

    st.subheader("Your Recommendation")

    col1, col2, col3 = st.columns(3)

    with col1:
        st.metric("Recommended Study Time", f"{duration} min")

    with col2:
        st.metric("Sleep", f"{last_inputs[0]} hours")

    with col3:
        st.metric("Energy", f"{last_inputs[2]}/10")

    st.success(
        f"Study for approximately {duration} minutes, "
        "then take a short break and reassess your energy."
    )

    st.caption(
        f"Workload level: {last_inputs[1]}/10. "
        "This is a rule-based estimate, not a medical or scientific assessment."
    )

    # -------- FIRED RULES --------

    st.subheader("Why this recommendation?")

    active_rules = [
        rule for rule in result["rules"]
        if rule[1] > 0
    ]

    if active_rules:
        for description, strength, category in active_rules[:5]:
            st.write(
                f"- **{description}** — "
                f"firing strength: {strength:.2f}"
            )
    else:
        st.warning("No rules fired for these inputs.")

    # -------- AGGREGATED OUTPUT --------

    st.subheader("Fuzzy Output and Centroid")

    durations, memberships = zip(*result["aggregated_output"])

    fig, ax = plt.subplots(figsize=(10, 4))

    ax.fill_between(
        durations,
        memberships,
        alpha=0.3,
        label="Aggregated fuzzy output",
    )
    ax.plot(
        durations,
        memberships,
        label="Membership degree",
    )
    ax.axvline(
        duration,
        linestyle="--",
        label=f"Recommended: {duration} minutes",
    )

    ax.set_xlabel("Study Duration (minutes)")
    ax.set_ylabel("Membership Degree")
    ax.set_title("Mamdani Aggregation and Centroid Defuzzification")
    ax.set_xlim(15, 90)
    ax.set_ylim(0, 1.05)
    ax.grid(True, alpha=0.3)
    ax.legend()

    st.pyplot(fig)
    plt.close(fig)

else:
    st.info(
        "Set your sleep, workload and energy levels in the sidebar, "
        "then click **Get Study Recommendation**."
    )

# ---------------- TABS ----------------

tab1, tab2, tab3 = st.tabs(
    ["Membership Functions", "Rule Base", "Test Scenarios"]
)

with tab1:
    st.subheader("Input Membership Functions")
    st.write(
        "Fuzzy membership values range from 0 to 1. "
        "An input can belong partially to overlapping categories."
    )

    sleep_values = [x / 10 for x in range(121)]
    scale_values = [x / 10 for x in range(101)]

    fig, axes = plt.subplots(1, 3, figsize=(14, 4))

    sleep_sets = {
        "Low": lambda x: trapezoidal_membership(x, 0, 0, 4, 6),
        "Medium": lambda x: triangular_membership(x, 4, 7, 10),
        "High": lambda x: trapezoidal_membership(x, 8, 10, 12, 12),
    }

    workload_sets = {
        "Light": lambda x: trapezoidal_membership(x, 0, 0, 2, 4),
        "Moderate": lambda x: triangular_membership(x, 2, 5, 8),
        "Heavy": lambda x: trapezoidal_membership(x, 6, 8, 10, 10),
    }

    energy_sets = {
        "Tired": lambda x: trapezoidal_membership(x, 0, 0, 2, 4),
        "Okay": lambda x: triangular_membership(x, 2, 5, 8),
        "Fresh": lambda x: trapezoidal_membership(x, 6, 8, 10, 10),
    }

    for label, function in sleep_sets.items():
        axes[0].plot(
            sleep_values,
            [function(x) for x in sleep_values],
            label=label,
        )

    axes[0].set_title("Sleep")
    axes[0].set_xlabel("Hours")
    axes[0].set_ylabel("Membership Degree")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    for label, function in workload_sets.items():
        axes[1].plot(
            scale_values,
            [function(x) for x in scale_values],
            label=label,
        )

    axes[1].set_title("Workload")
    axes[1].set_xlabel("Workload (0–10)")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    for label, function in energy_sets.items():
        axes[2].plot(
            scale_values,
            [function(x) for x in scale_values],
            label=label,
        )

    axes[2].set_title("Energy")
    axes[2].set_xlabel("Energy (0–10)")
    axes[2].legend()
    axes[2].grid(True, alpha=0.3)

    for ax in axes:
        ax.set_ylim(-0.05, 1.05)

    fig.tight_layout()
    st.pyplot(fig)
    plt.close(fig)

with tab2:
    st.subheader("Fuzzy Rule Base")

    rules = [
        ("Low sleep AND tired energy", "Short"),
        ("Low sleep AND okay energy", "Short"),
        ("Low sleep AND fresh energy", "Medium"),
        ("Medium sleep AND tired energy", "Short"),
        ("Medium sleep AND okay energy", "Medium"),
        ("Medium sleep AND fresh energy", "Long"),
        ("High sleep AND tired energy", "Medium"),
        ("High sleep AND okay energy", "Long"),
        ("High sleep AND fresh energy", "Long"),
        ("Heavy workload AND fresh energy", "Long"),
        ("Heavy workload AND tired energy", "Medium"),
        ("Light workload AND tired energy", "Short"),
        ("Moderate workload AND medium sleep", "Medium"),
    ]

    st.write("The system uses 13 hand-crafted Mamdani-style rules.")

    st.table(
        {
            "Rule condition": [r[0] for r in rules],
            "Recommended category": [r[1] for r in rules],
        }
    )

with tab3:
    st.subheader("Example Test Scenarios")

    scenarios = [
        ("Low sleep, tired", 3, 5, 2),
        ("Balanced state", 7, 5, 6),
        ("Well rested, energetic", 9, 4, 9),
        ("Heavy workload, tired", 7, 9, 3),
        ("Well rested, light workload", 9, 2, 8),
    ]

    rows = []

    for name, test_sleep, test_workload, test_energy in scenarios:
        test_result = infer_study_duration(
            test_sleep,
            test_workload,
            test_energy,
        )

        rows.append(
            {
                "Scenario": name,
                "Sleep (hours)": test_sleep,
                "Workload": test_workload,
                "Energy": test_energy,
                "Study duration (min)": test_result["duration"],
            }
        )

    st.table(rows)

    st.caption(
        "These are illustrative test cases, not experimentally validated "
        "study recommendations."
    )

