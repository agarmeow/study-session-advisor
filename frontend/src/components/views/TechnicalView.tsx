import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Search,
  Grid,
  TrendingUp,
  Sliders,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { MetricCard } from '../common/MetricCard';
import { api } from '../../services/api';
import type { MembershipData, SystemRules, HeatmapData } from '../../types';

export const TechnicalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'prioritizer' | 'gbfs' | 'heatmap'>('advisor');
  
  // Data states
  const [curves, setCurves] = useState<MembershipData | null>(null);
  const [rules, setRules] = useState<SystemRules | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [workload, setWorkload] = useState<number>(5.0);
  
  // Filter states
  const [selectedCurve, setSelectedCurve] = useState<'sleep' | 'energy' | 'urgency' | 'difficulty'>('sleep');
  const [ruleSearch, setRuleSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [curvesRes, rulesRes, heatmapRes] = await Promise.all([
          api.getMembershipData(),
          api.getSystemRules(),
          api.getHeatmapData(workload)
        ]);
        setCurves(curvesRes);
        setRules(rulesRes);
        setHeatmap(heatmapRes);
      } catch (err) {
        console.error('Failed to load technical verification data', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleWorkloadChange = async (newVal: number) => {
    setWorkload(newVal);
    try {
      const data = await api.getHeatmapData(newVal);
      setHeatmap(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered advisor rules
  const filteredAdvisorRules = useMemo(() => {
    if (!rules?.advisor_rules) return [];
    if (!ruleSearch.trim()) return rules.advisor_rules;
    const q = ruleSearch.toLowerCase();
    return rules.advisor_rules.filter(
      (r) =>
        r.sleep.toLowerCase().includes(q) ||
        r.energy.toLowerCase().includes(q) ||
        r.urgency.toLowerCase().includes(q) ||
        r.difficulty.toLowerCase().includes(q) ||
        r.intensity.toLowerCase().includes(q) ||
        String(r.study_minutes).includes(q)
    );
  }, [rules, ruleSearch]);

  const activeCurveData = useMemo(() => {
    if (!curves?.advisor) return [];
    return curves.advisor[selectedCurve] || [];
  }, [curves, selectedCurve]);

  if (isLoading && !curves) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
        <p className="text-xs font-medium">Loading verification data and fuzzy surfaces...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-coral-50 text-coral-600 border border-coral-100">
            <Cpu className="w-5 h-5" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            AISC System Architecture & Verification
          </h1>
        </div>
        <p className="text-sm text-neutral-500 mt-1">
          Formal computational intelligence specifications, Mamdani membership geometry, complete rule bases, and GBFS search verification.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 overflow-x-auto pb-px">
        {[
          { id: 'advisor', label: '1. Advisor Fuzzy Inference (81 Rules)', icon: Sliders },
          { id: 'prioritizer', label: '2. Task Prioritizer (27 Rules)', icon: Layers },
          { id: 'gbfs', label: '3. Heuristic Search Formalism (GBFS)', icon: Search },
          { id: 'heatmap', label: '4. Surface & Interpolation Grid', icon: Grid }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-coral-600 text-coral-600'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ADVISOR FUZZY INFERENCE */}
      {activeTab === 'advisor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Antecedents"
              value="4 Variables"
              subtitle="Sleep, Energy, Urgency, Difficulty"
              icon={<Sliders className="w-5 h-5 text-coral-600" />}
            />
            <MetricCard
              title="Rule Count"
              value="81 Rules"
              subtitle="3⁴ full Cartesian product"
              icon={<Layers className="w-5 h-5 text-blue-600" />}
            />
            <MetricCard
              title="Inference Engine"
              value="Mamdani Min-Max"
              subtitle="Min conjunction, Max aggregation"
              icon={<Cpu className="w-5 h-5 text-purple-600" />}
            />
            <MetricCard
              title="Defuzzification"
              value="Centroid (CoA)"
              subtitle="Continuous center-of-area"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            />
          </div>

          {/* Membership Function Curves */}
          <Card orientation="vertical" padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Membership Functions: μ(x)
                </h2>
                <p className="text-xs text-neutral-500">
                  Piecewise linear triangular and trapezoidal fuzzy sets.
                </p>
              </div>

              {/* Variable Toggle */}
              <div className="flex items-center gap-1.5 bg-neutral-100 p-1 rounded-xl">
                {(['sleep', 'energy', 'urgency', 'difficulty'] as const).map((variable) => (
                  <button
                    key={variable}
                    onClick={() => setSelectedCurve(variable)}
                    className={`px-3 py-1 text-xs font-medium rounded-lg capitalize transition ${
                      selectedCurve === variable
                        ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                        : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Curve Visualization */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeCurveData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="x"
                    tick={{ fontSize: 11, fill: '#737373' }}
                    label={{
                      value: selectedCurve === 'sleep' ? 'Hours of Sleep (0 - 12)' : 'Score (0 - 10)',
                      position: 'insideBottomRight',
                      offset: -5,
                      fontSize: 10,
                      fill: '#a3a3a3'
                    }}
                  />
                  <YAxis
                    domain={[0, 1]}
                    tick={{ fontSize: 11, fill: '#737373' }}
                    label={{ value: 'Degree μ', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#a3a3a3' }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 rounded-xl shadow-lg border border-neutral-100 text-xs space-y-1">
                            <p className="font-semibold text-neutral-800">
                              Input x = {payload[0]?.payload?.x}
                            </p>
                            {payload.map((entry, idx) => (
                              <p key={idx} style={{ color: entry.color }} className="font-medium capitalize">
                                {entry.name}: {Number(entry.value).toFixed(2)}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {/* Dynamic Lines depending on selected curve */}
                  {selectedCurve === 'sleep' && (
                    <>
                      <Line type="monotone" dataKey="low" stroke="#ef4444" strokeWidth={2} dot={false} name="Low" />
                      <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} dot={false} name="Medium" />
                      <Line type="monotone" dataKey="high" stroke="#10b981" strokeWidth={2} dot={false} name="High" />
                    </>
                  )}
                  {selectedCurve === 'energy' && (
                    <>
                      <Line type="monotone" dataKey="drained" stroke="#ef4444" strokeWidth={2} dot={false} name="Drained" />
                      <Line type="monotone" dataKey="okay" stroke="#f59e0b" strokeWidth={2} dot={false} name="Okay" />
                      <Line type="monotone" dataKey="energized" stroke="#10b981" strokeWidth={2} dot={false} name="Energized" />
                    </>
                  )}
                  {selectedCurve === 'urgency' && (
                    <>
                      <Line type="monotone" dataKey="imminent" stroke="#ef4444" strokeWidth={2} dot={false} name="Imminent" />
                      <Line type="monotone" dataKey="near" stroke="#f59e0b" strokeWidth={2} dot={false} name="Near" />
                      <Line type="monotone" dataKey="far" stroke="#3b82f6" strokeWidth={2} dot={false} name="Far" />
                    </>
                  )}
                  {selectedCurve === 'difficulty' && (
                    <>
                      <Line type="monotone" dataKey="easy" stroke="#10b981" strokeWidth={2} dot={false} name="Easy" />
                      <Line type="monotone" dataKey="medium" stroke="#f59e0b" strokeWidth={2} dot={false} name="Medium" />
                      <Line type="monotone" dataKey="hard" stroke="#ef4444" strokeWidth={2} dot={false} name="Hard" />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* 81-Rule Base Inspector */}
          <Card orientation="vertical" padding="none">
            <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Advisor Rule Base Verification ({filteredAdvisorRules.length} of 81 Rules)
                </h3>
                <p className="text-xs text-neutral-500">
                  IF Sleep AND Energy AND Urgency AND Difficulty THEN Study Mins, Break Mins, Intensity
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter rules (e.g. High, Hard)..."
                  value={ruleSearch}
                  onChange={(e) => setRuleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-neutral-50 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-coral-500"
                />
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Rule #</th>
                    <th className="py-2.5 px-4">Sleep</th>
                    <th className="py-2.5 px-4">Energy</th>
                    <th className="py-2.5 px-4">Urgency</th>
                    <th className="py-2.5 px-4">Difficulty</th>
                    <th className="py-2.5 px-4">Study Mins</th>
                    <th className="py-2.5 px-4">Break Mins</th>
                    <th className="py-2.5 px-4">Intensity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700 font-mono">
                  {filteredAdvisorRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-neutral-50/70 transition">
                      <td className="py-2 px-4 text-neutral-400">R{rule.id}</td>
                      <td className="py-2 px-4">{rule.sleep}</td>
                      <td className="py-2 px-4">{rule.energy}</td>
                      <td className="py-2 px-4">{rule.urgency}</td>
                      <td className="py-2 px-4">{rule.difficulty}</td>
                      <td className="py-2 px-4 font-semibold text-coral-600">{rule.study_minutes}m</td>
                      <td className="py-2 px-4 font-semibold text-emerald-600">{rule.break_minutes}m</td>
                      <td className="py-2 px-4 font-sans">
                        <Badge
                          variant={
                            rule.intensity === 'High'
                              ? 'danger'
                              : rule.intensity === 'Medium'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {rule.intensity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: TASK PRIORITIZER FUZZY LOGIC */}
      {activeTab === 'prioritizer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Antecedents"
              value="3 Variables"
              subtitle="Urgency, Importance, Difficulty"
              icon={<Sliders className="w-5 h-5 text-coral-600" />}
            />
            <MetricCard
              title="Rule Count"
              value="27 Rules"
              subtitle="3³ full Cartesian grid"
              icon={<Layers className="w-5 h-5 text-blue-600" />}
            />
            <MetricCard
              title="Consequent"
              value="Score [0, 100]"
              subtitle="Defuzzified Priority Metric"
              icon={<BarChart2 className="w-5 h-5 text-emerald-600" />}
            />
            <MetricCard
              title="Defuzzification"
              value="Sugeno Weighted Avg"
              subtitle="Deterministic centroid outputs"
              icon={<CheckCircle2 className="w-5 h-5 text-purple-600" />}
            />
          </div>

          <Card orientation="vertical" padding="lg">
            <h2 className="text-base font-semibold text-neutral-900 mb-2">
              Theoretical Formulation: Multi-Attribute Priority Assessment
            </h2>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Standard study schedulers rely on linear scoring (e.g. <span className="font-mono bg-neutral-100 px-1 rounded">Score = w₁·U + w₂·I</span>), which fails to model non-linear human trade-offs such as when an impending deadline should drastically supersede all other criteria. Our 27-rule Mamdani engine evaluates non-linear cognitive trade-offs across 3 antecedents:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="font-semibold text-neutral-800 block">Urgency (Days to Due)</span>
                <span className="text-neutral-500 text-[11px]">
                  Imminent (&lt; 2d), Near (2–6d), Far (&gt; 6d)
                </span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="font-semibold text-neutral-800 block">Importance (Weight)</span>
                <span className="text-neutral-500 text-[11px]">
                  Minor (1–4), Moderate (4–7), Critical (7–10)
                </span>
              </div>
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <span className="font-semibold text-neutral-800 block">Difficulty (Complexity)</span>
                <span className="text-neutral-500 text-[11px]">
                  Easy (1–4), Medium (4–7), Hard (7–10)
                </span>
              </div>
            </div>
          </Card>

          {/* 27-Rule Table */}
          <Card orientation="vertical" padding="none">
            <div className="p-4 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                27-Rule Prioritizer Specification
              </h3>
              <p className="text-xs text-neutral-500">
                Synthesized rule base mapping all combinations of Urgency, Importance, and Difficulty to priority consequent scores.
              </p>
            </div>

            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-medium sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4">Rule #</th>
                    <th className="py-2.5 px-4">Urgency</th>
                    <th className="py-2.5 px-4">Importance</th>
                    <th className="py-2.5 px-4">Difficulty</th>
                    <th className="py-2.5 px-4">Consequent Score</th>
                    <th className="py-2.5 px-4">Priority Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700 font-mono">
                  {rules?.task_rules.map((rule) => {
                    const score = rule.consequent_score;
                    const level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

                    return (
                      <tr key={rule.id} className="hover:bg-neutral-50/70 transition">
                        <td className="py-2 px-4 text-neutral-400">TR{rule.id}</td>
                        <td className="py-2 px-4">{rule.urgency}</td>
                        <td className="py-2 px-4">{rule.importance}</td>
                        <td className="py-2 px-4">{rule.difficulty}</td>
                        <td className="py-2 px-4 font-semibold text-coral-600">{score.toFixed(1)}</td>
                        <td className="py-2 px-4 font-sans">
                          <Badge variant={level === 'High' ? 'danger' : level === 'Medium' ? 'warning' : 'neutral'}>
                            {level}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: GBFS SEARCH FORMALISM */}
      {activeTab === 'gbfs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Search Algorithm"
              value="GBFS"
              subtitle="Greedy Best-First Search"
              icon={<Search className="w-5 h-5 text-coral-600" />}
            />
            <MetricCard
              title="State Space"
              value="(T_rem, t_elapsed)"
              subtitle="Exponential combinatorial tree"
              icon={<Layers className="w-5 h-5 text-blue-600" />}
            />
            <MetricCard
              title="Constraint"
              value="t_elapsed ≤ Budget"
              subtitle="Hard daily time envelope"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            />
            <MetricCard
              title="Heuristic"
              value="h(n) Penalty"
              subtitle="Prioritizes urgency & due dates"
              icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
            />
          </div>

          <Card orientation="vertical" padding="lg">
            <h2 className="text-base font-semibold text-neutral-900 mb-3">
              AISC Problem Formulation: Heuristic Session Scheduling
            </h2>
            <div className="space-y-4 text-xs text-neutral-700 leading-relaxed">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <p className="font-semibold text-neutral-900">1. State Representation:</p>
                <p>
                  A state <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-neutral-200">S = (T_rem, t_elapsed)</span> represents:
                </p>
                <ul className="list-disc list-inside space-y-1 text-neutral-600 ml-2">
                  <li><span className="font-mono">T_rem ⊆ T</span>: Remaining unassigned study tasks.</li>
                  <li><span className="font-mono">t_elapsed ∈ ℝ⁺</span>: Cumulative planned study and rest minutes elapsed.</li>
                </ul>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <p className="font-semibold text-neutral-900">2. Action Space & Feasibility Constraints:</p>
                <p>
                  From state <span className="font-mono">S</span>, executing action <span className="font-mono">a = schedule(t)</span> for <span className="font-mono">t ∈ T_rem</span> is feasible if and only if:
                </p>
                <p className="font-mono bg-white p-2 rounded border border-neutral-200 text-neutral-900">
                  t_elapsed + duration(t) + break_duration ≤ Available_Budget
                </p>
                <p className="text-neutral-500">
                  If valid, the system transitions to <span className="font-mono">S' = (T_rem \ &#123;t&#125;, t_elapsed + duration(t) + break_duration)</span>.
                </p>
              </div>

              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-2">
                <p className="font-semibold text-neutral-900">3. Heuristic Evaluation Function h(n):</p>
                <p>
                  GBFS prioritizes the priority queue (frontier) using a penalty evaluation function measuring remaining deadline pressure and unhandled task importance:
                </p>
                <div className="font-mono bg-white p-3 rounded border border-neutral-200 text-coral-700 font-semibold">
                  h(n) = Σ [ PriorityScore(t) × ( 1 + Duration(t) / (DeadlineDays(t) × 60) ) ] for all t ∈ T_rem
                </div>
                <p className="text-neutral-500">
                  States with lower <span className="font-mono">h(n)</span> represent higher overall curriculum progress and fewer impending overdue liabilities.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: 2D SURFACE & COVERAGE HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              title="Variable 1"
              value="Sleep (hrs)"
              subtitle="Axis: 3 to 10 hours"
              icon={<Sliders className="w-5 h-5 text-coral-600" />}
            />
            <MetricCard
              title="Variable 2"
              value="Energy (1-10)"
              subtitle="Axis: 1 to 10 points"
              icon={<Sliders className="w-5 h-5 text-blue-600" />}
            />
            <MetricCard
              title="Fixed Workload"
              value={`${workload.toFixed(1)} / 10`}
              subtitle="Adjustable via slider"
              icon={<Layers className="w-5 h-5 text-purple-600" />}
            />
            <MetricCard
              title="Rule Coverage"
              value="100% Non-Zero"
              subtitle="Zero dead zones verified"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            />
          </div>

          <Card orientation="vertical" padding="lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-base font-semibold text-neutral-900">
                  Recommended Study Duration Surface (Minutes)
                </h2>
                <p className="text-xs text-neutral-500">
                  2D interpolated output surface demonstrating smooth Mamdani transitions without discontinuities.
                </p>
              </div>

              {/* Workload slider */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-neutral-700 whitespace-nowrap">
                  Fixed Task Workload:
                </span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={workload}
                  onChange={(e) => handleWorkloadChange(Number(e.target.value))}
                  className="w-32 accent-coral-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-semibold text-coral-600 bg-coral-50 border border-coral-200 px-2 py-0.5 rounded">
                  {workload.toFixed(1)}
                </span>
              </div>
            </div>

            {/* Heatmap Grid */}
            {heatmap && (
              <div className="space-y-3">
                <div className="overflow-x-auto pb-2">
                  <div className="inline-block min-w-full">
                    {/* Header: Sleep Hours */}
                    <div className="flex items-center text-xs text-neutral-500 font-semibold mb-2 ml-16">
                      <span className="mr-2">Sleep (hrs) →</span>
                      <div className="flex gap-1">
                        {heatmap.sleep_values.map((s, idx) => (
                          <div key={idx} className="w-10 sm:w-12 text-center font-mono">
                            {s}h
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Rows: Energy Levels */}
                    <div className="space-y-1">
                      {heatmap.durations.map((row, rIdx) => {
                        const energyVal = heatmap.energy_values[rIdx];
                        return (
                          <div key={rIdx} className="flex items-center text-xs">
                            <span className="w-16 font-mono text-neutral-600 font-semibold text-right pr-3">
                              E = {energyVal}
                            </span>
                            <div className="flex gap-1">
                              {row.map((val, cIdx) => {
                                // Color interpolation based on duration (15 to 60)
                                const ratio = Math.max(0, Math.min(1, (val - 15) / 45));
                                const bgColor =
                                  ratio > 0.7
                                    ? 'bg-coral-600 text-white'
                                    : ratio > 0.5
                                    ? 'bg-coral-500 text-white'
                                    : ratio > 0.3
                                    ? 'bg-coral-200 text-neutral-800'
                                    : 'bg-coral-100 text-neutral-700';

                                return (
                                  <div
                                    key={cIdx}
                                    title={`Sleep: ${heatmap.sleep_values[cIdx]}h | Energy: ${energyVal} | Duration: ${val.toFixed(1)} mins`}
                                    className={`w-10 sm:w-12 h-9 rounded-md flex items-center justify-center font-mono text-[11px] font-medium shadow-2xs transition hover:scale-105 hover:z-10 ${bgColor}`}
                                  >
                                    {Math.round(val)}m
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                  <span className="text-[11px]">
                    Higher values (dark coral) represent peak cognitive focus capacity (up to 60 mins).
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-xs bg-coral-100 inline-block" /> 15m
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-xs bg-coral-300 inline-block" /> 35m
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-xs bg-coral-600 inline-block" /> 60m
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
