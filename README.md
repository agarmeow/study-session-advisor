# Fuzzy Study Intelligence System

An AI Search and Computational Intelligence (AISC) companion designed for college students to plan, balance, prioritize, and execute effective study sessions.

Upgraded from the original **Study Session Advisor**, this system combines **Mamdani Fuzzy Inference Systems** for stamina-aware session recommendations and task prioritization with **Greedy Best-First Search (GBFS)** for feasible daily schedule optimization.

---

## 🌟 Key Features

1. **Stamina-Aware Study & Break Advisor (Mamdani Fuzzy Logic)**
   - 10-second check-in collecting Sleep Hours (0–12h), Energy (Drained, Okay, Energized), Deadline Urgency, and Topic Difficulty.
   - Evaluates a complete 81-rule Mamdani base using triangular and trapezoidal membership functions and discrete centroid defuzzification.
   - Outputs recommended study duration, break duration, study approach (*Light revision*, *Moderate study*, or *Challenging material*), and a planning rest-needed indicator (*Low*, *Medium*, *High*).
   - Generates contextual, student-friendly explanations based on inference results.

2. **Interactive Session Timer**
   - Seamless countdown timer with study and break state transitions.
   - Start, pause, resume, reset, and skip/advance controls.
   - Persists state across Streamlit reruns.
   - Post-session feedback collection (*Too short*, *Just right*, *Too long*) and post-break energy reassessment (*Better*, *Unchanged*, *Lower*).

3. **Fuzzy Task Prioritizer**
   - Dedicated secondary Mamdani fuzzy system with 27 rules.
   - Considers Deadline Urgency, Importance, and Difficulty to assign priority scores (0–100) and classifications (*High Priority*, *Medium Priority*, *Low Priority*).
   - Constrained so high topic difficulty alone never inappropriately overrides low importance and relaxed deadlines.
   - Full task management (add, inspect, rank, and delete tasks).

4. **Heuristic Daily Scheduling (Greedy Best-First Search - GBFS)**
   - Algorithmic schedule construction given today's available study budget and preferred break durations.
   - Explores state space guided by an urgency-and-priority heuristic penalty $h(n)$.
   - Guarantees feasibility: total planned study and break time never exceeds available budget.
   - Clearly flags unscheduled tasks with exact reasons (e.g. insufficient remaining time).

5. **Personalization & Bounded Adaptation**
   - Configurable focus styles (*Balanced*, *Short bursts*, *Longer sessions*) and preferred study times (*Morning*, *Afternoon*, *Night*).
   - Rule-based session adaptation based on past feedback (bounded to $\pm 15$ minutes, keeping safety bounds between 15 and 90 minutes).
   - Transparent reporting: base fuzzy inference is always displayed alongside any applied adjustments.

6. **Progress Tracking & Data Export**
   - Local privacy-first persistence (no external databases required).
   - Session logs with timestamps, task names, durations, and student feedback.
   - One-click data export to **JSON** and **CSV**.

7. **AISC System Analysis & Technical Verification**
   - Interactive visualizations of membership functions for both fuzzy systems.
   - Full 81-rule and 27-rule base explorers.
   - Formal mathematical specification of the Greedy Best-First Search algorithm.
   - 2D heatmaps of rule firing strength and recommended study duration across sleep and energy dimensions.

---

## 🔬 AISC Algorithms & Architecture

```
                               ┌────────────────────────────────────────────────────────┐
                               │             Fuzzy Study Intelligence System            │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
       Computational Intelligence (Fuzzy Logic)                                 Artificial Intelligence Search
   ┌──────────────────────────────────────────────┐                           ┌──────────────────────────────────────────────┐
   │ 1. Study Advisor Engine (81 Rules)           │                           │ Greedy Best-First Search (GBFS) Scheduler    │
   │    - Inputs: Sleep, Energy, Urgency, Diff    │                           │ - State: (scheduled, time_spent, remaining)  │
   │    - Min AND operator, Max aggregation       │                           │ - Actions: Add candidate task fitting budget │
   │    - Discrete Centroid Defuzzification       │                           │ - Heuristic h(n): Penalty on unscheduled     │
   │    - Outputs: Study, Break, Intensity, Rest  │                           │   urgent & high-priority coursework          │
   ├──────────────────────────────────────────────┤                           │ - Output: Feasible timeline & break blocks   │
   │ 2. Task Prioritizer (27 Rules)               │                           └──────────────────────────────────────────────┘
   │    - Inputs: Deadline, Importance, Difficulty│
   │    - Priority score (0-100) & classification │
   └──────────────────────────────────────────────┘
```

### 1. Mamdani Fuzzy Inference (Advisor)
- **Inputs**:
  - Sleep Hours $\in [0, 12]$ (Trapezoidal Low, Triangular Medium, Trapezoidal High)
  - Energy Level $\in [0, 10]$ (Trapezoidal Drained, Triangular Okay, Trapezoidal Energized)
  - Deadline Urgency $\in [0, 30]$ (Trapezoidal Imminent, Triangular Near, Trapezoidal Far)
  - Topic Difficulty $\in [0, 10]$ (Trapezoidal Easy, Triangular Medium, Trapezoidal Hard)
- **Student-Friendly Rule Constraints**:
  - Intensity is capped at 3 when energy is Drained.
  - Intensity is capped at 5 when sleep is Low.
  - Aggregation uses maximum operator; defuzzification uses discrete centroid of area over the respective output universes.

### 2. Heuristic Search Scheduler (GBFS)
- **Search Space**: Each node represents a partial schedule $(S, t_{\text{used}}, R)$, where $S$ is the sequence of scheduled tasks and breaks, $t_{\text{used}}$ is time elapsed, and $R$ is remaining unscheduled tasks.
- **Feasibility Constraint**: $t_{\text{used}} + t_{\text{break}} + t_{\text{duration}}(t) \le B_{\text{available}}$.
- **Heuristic Function $h(n)$**:
- Guided by a min-heap priority queue, GBFS expands states that minimize the cost of leaving urgent and critical work uncompleted.
- **Search Complexity & Optimality**: Greedy Best-First Search provides rapid, polynomial-time schedule generation with effective state pruning, prioritizing imminent coursework. Like standard GBFS algorithms, it optimizes for urgency reduction rather than guaranteeing global combinatorial optimality.

---

## 📂 Repository Structure

- `app.py`: Streamlit multi-section user interface, timer, and workflow coordinator.
- `fuzzy_advisor.py`: 4-input, 81-rule Mamdani fuzzy inference engine for study and break advice.
- `task_prioritizer.py`: 3-input, 27-rule Mamdani fuzzy engine for task prioritization.
- `scheduler.py`: Greedy Best-First Search (GBFS) algorithm for daily schedule generation.
- `storage.py`: Local JSON persistence, user preferences, rule-based feedback adaptation, and CSV/JSON export.
- `fuzzy_engine.py`: Original 3-input 27-rule fuzzy engine retained for baseline comparisons and heatmap analysis.
- `analysis_tools.py`: Coverage verification and 2D heatmap generation across parameter spaces.
- `plots.py`: Matplotlib membership function visualizers.
- `test_fuzzy_advisor.py`: Unit tests for advisor inference, boundary values, rule constraints, and realistic student scenarios.
- `test_task_prioritizer.py`: Unit tests for task priority scores, edge cases, and ranking.
- `test_scheduler.py`: Unit tests for GBFS scheduling, feasibility budgets, break insertion, and deterministic outputs.
- `test_storage.py`: Unit tests for persistence, adaptation bounds, and export functions.
- `test_integration.py`: End-to-end integration tests for the full study and scheduling pipeline.
- `test_fuzzy_engine.py`: Tests for the baseline 27-rule engine and coverage grid.

---

## 🚀 Setup & Execution

### Prerequisites
- Python 3.10+ (Standard Library used for fuzzy logic and heuristic search; no NumPy or scikit-fuzzy dependencies).
- Virtual environment recommended.

### Installation

```bash
# Clone the repository
git clone https://github.com/agarmeow/study-session-advisor.git
cd study-session-advisor

# Create and activate virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\activate

# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Run the Application

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501`.

### Run the Test Suite

```bash
python -m pytest -v
```

All 57 unit and integration tests should pass.

---

## ⚠️ Assumptions & Limitations

1. **AISC Pedagogical Design**: Membership functions, rule bases, priority weights, and heuristic penalties are project-designed assumptions for college study management; they are not medical or cognitive prescriptions.
2. **Local Session Scope**: Storage uses a local JSON file (`study_data.json`) and Streamlit session state scoped to the local environment. No cloud database or multi-user authentication is included.
3. **Timer Refresh**: The countdown timer operates via Streamlit state reruns; full browser reloads restart the active second counter to the last saved minute mark.
