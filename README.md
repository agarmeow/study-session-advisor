# Fuzzy Study Intelligence System

An AI Search and Computational Intelligence (AISC) companion designed for college students to plan, balance, prioritize, and execute effective study sessions.

Upgraded from the original **Study Session Advisor**, this system combines **Mamdani Fuzzy Inference Systems** for stamina-aware session recommendations and task prioritization with **Greedy Best-First Search (GBFS)** for feasible daily schedule optimization.

The application features a modern, full-stack architecture with a **FastAPI** computational intelligence backend and a **React + Vite + TypeScript** SaaS web interface, while maintaining the legacy **Streamlit** dashboard as a functional fallback.

---

## 🌟 Architecture Overview

```
                               ┌────────────────────────────────────────────────────────┐
                               │             Fuzzy Study Intelligence System            │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
       Frontend Interface Layer                                                FastAPI & Computational Layer
   ┌──────────────────────────────────────────────┐                           ┌──────────────────────────────────────────────┐
   │ React 19 + TypeScript + Vite + Tailwind CSS  │                           │ Python 3.10+ FastAPI Backend (Port 8000)     │
   │ - Dashboard Overview & Metric Analytics      │ ──── HTTP REST APIs ────▶ │ - Mamdani Fuzzy Advisor (81 Rules)           │
   │ - Stamina Check-In & Study Advisor           │                           │ - Mamdani Task Prioritizer (27 Rules)        │
   │ - Live Study / Break Countdown Timer         │ ◀── JSON Data Stream ─── │ - Greedy Best-First Search (GBFS) Scheduler  │
   │ - Priority Queue Task Manager                │                           │ - Bounded Adaptive Feedback Engine (±15m)    │
   │ - GBFS Timeline & Feasibility Planner        │                           │ - Local JSON Privacy-Preserving Persistence  │
   │ - Recharts Membership Curve & Heatmap Visuals│                           │ - CSV & JSON Exporters                       │
   └──────────────────────────────────────────────┘                           └──────────────────────────────────────────────┘
                      │                                                                         │
                      └──────────────────────────── (Optional Fallback) ────────────────────────┘
                                                    Streamlit Dashboard
                                                  (streamlit run app.py)
```

---

## 🔬 AISC Algorithms & Computational Intelligence

### 1. Stamina-Aware Study Advisor (81 Mamdani Rules)
- **Inputs**:
  - Sleep Hours $\in [0, 12]$ (Trapezoidal Low, Triangular Medium, Trapezoidal High)
  - Energy Level $\in [0, 10]$ (Trapezoidal Drained, Triangular Okay, Trapezoidal Energized)
  - Deadline Urgency $\in [0, 30]$ (Trapezoidal Imminent, Triangular Near, Trapezoidal Far)
  - Topic Difficulty $\in [0, 10]$ (Trapezoidal Easy, Triangular Medium, Trapezoidal Hard)
- **Student-Friendly Rule Constraints**:
  - Intensity is capped at 3 when energy is *Drained*.
  - Intensity is capped at 5 when sleep is *Low*.
  - Complete $3^4 = 81$ rule Cartesian grid guarantees **100% non-zero activation coverage** without dead zones.
  - Conjunction: Minimum operator ($\min$); Aggregation: Maximum operator ($\max$).
  - Defuzzification: Continuous discrete Centroid (Center of Area).

### 2. Multi-Attribute Task Prioritizer (27 Mamdani Rules)
- **Inputs**: Days to Deadline $\in [0, 30]$, Importance $\in [1, 10]$, Difficulty $\in [1, 10]$.
- **Consequent**: Priority Score $\in [0, 100]$ classified into *High Priority*, *Medium Priority*, and *Low Priority*.
- Prevents cognitive traps where high difficulty inappropriately eclipses urgent or critical coursework.

### 3. Heuristic Daily Scheduler (Greedy Best-First Search - GBFS)
- **State Representation**: $S = (T_{\text{rem}}, t_{\text{elapsed}})$, where $T_{\text{rem}}$ is the unassigned task set and $t_{\text{elapsed}}$ is total planned minutes.
- **Feasibility Constraint**: $t_{\text{elapsed}} + \text{duration}(t) + \text{break} \le \text{Budget}_{\text{available}}$.
- **Heuristic Evaluation Function**:
  $$h(n) = \sum_{t \in T_{\text{rem}}} \text{Priority}(t) \cdot \left(1 + \frac{\text{Duration}(t)}{\text{DeadlineDays}(t) \cdot 60}\right)$$
- Guarantees strict feasibility: total planned study and rest blocks never exceed available daily time budget.

### 4. Bounded Feedback Adaptation
- Records student session feedback (*Too short*, *Just right*, *Too long*) and post-break recovery energy (*Better*, *Unchanged*, *Lower*).
- Adapts baseline fuzzy outputs dynamically by adjusting an adaptation offset bounded within $[-15, +15]$ minutes, ensuring session recommendations remain within safe cognitive limits ($15 \le \text{Study} \le 90$ mins).

---

## 📁 Repository Structure

```
Study-Session-Advisor/
├── main.py                     # FastAPI REST API wrapper around AISC modules
├── fuzzy_advisor.py            # 4-input, 81-rule Mamdani fuzzy inference engine
├── task_prioritizer.py         # 3-input, 27-rule Mamdani task prioritizer
├── scheduler.py                # Greedy Best-First Search (GBFS) heuristic scheduler
├── storage.py                  # Local JSON data layer, bounded feedback, and exporters
├── analysis_tools.py           # 2D surface coverage and heatmap generation
├── app.py                      # Original Streamlit dashboard (preserved as fallback)
├── requirements.txt            # Python dependencies (FastAPI, Uvicorn, Streamlit, Pytest)
├── study_data.json             # Local privacy-preserving user study records
├── test_api.py                 # FastAPI integration and endpoint tests
├── test_fuzzy_advisor.py       # 81-rule advisor unit tests & boundary checks
├── test_task_prioritizer.py    # 27-rule prioritizer unit tests
├── test_scheduler.py           # GBFS heuristic search & feasibility tests
├── test_storage.py             # Storage, feedback adaptation, and export tests
├── test_integration.py         # Full end-to-end Python pipeline tests
└── frontend/                   # Modern React + Vite + TypeScript full-stack web UI
    ├── package.json            # Frontend dependencies (React, Recharts, Lucide, Tailwind)
    ├── vite.config.ts          # Vite configuration with API reverse proxy
    ├── index.html              # Web application entry HTML
    └── src/
        ├── types/              # TypeScript interface definitions
        ├── services/           # Typed API service client
        ├── components/
        │   ├── common/         # Badge, Card, MetricCard, PreferencesModal
        │   ├── layout/         # Header, Sidebar responsive navigation
        │   └── views/          # Dashboard, Advisor, Tasks, Planner, History, Technical
        └── index.css           # Tailwind CSS styling and theme tokens
```

---

## 🚀 Setup & Execution

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### 2. Backend Setup & Startup

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

# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (port 8000)
uvicorn main:app --reload --port 8000
```

The interactive OpenAPI documentation will be accessible at: `http://127.0.0.1:8000/docs`.

### 3. Frontend Setup & Startup

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at `http://localhost:5173`. The Vite proxy will automatically route all `/api` requests to the FastAPI backend at `http://127.0.0.1:8000`.

### 4. Streamlit Fallback Dashboard

To run the legacy Streamlit interface:

```bash
streamlit run app.py
```

Open your browser at `http://localhost:8501`.

---

## 🧪 Automated Testing & Verification

Run the full Python test suite:

```bash
python -m pytest -v
```

**Result: 66 of 66 tests passing** across inference engines, boundary conditions, GBFS schedule constraints, feedback adaptation, and REST API endpoints.

Verify the frontend production build:

```bash
cd frontend
npm run build
```

TypeScript compiler (`tsc -b`) and Vite production bundle complete with **zero errors**.

---

## 📜 Academic Integrity & Project Purpose

Built as an Artificial Intelligence Search and Computational Intelligence (AISC) academic project. Demonstrates practical application of:
1. Multi-antecedent **Mamdani Fuzzy Inference Systems** for complex decision support.
2. **Heuristic State-Space Search (GBFS)** for constrained combinatorial optimization.
3. **Closed-loop adaptive learning** via bounded user feedback.
4. Professional full-stack software architecture with clean decoupling of reasoning logic and presentation.
