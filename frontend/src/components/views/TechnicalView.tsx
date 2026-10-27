import React, { useState, useEffect, useMemo } from 'react';
import {
  Cpu,
  Layers,
  Search,
  Grid,
  Sliders,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { api } from '../../services/api';
import type { MembershipData, SystemRules, HeatmapData, DailySchedule } from '../../types';

export const TechnicalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'advisor' | 'prioritizer' | 'gbfs' | 'heatmap'>('advisor');

  // Data states
  const [curves, setCurves] = useState<MembershipData | null>(null);
  const [rules, setRules] = useState<SystemRules | null>(null);
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null);
  const [sampleSchedule, setSampleSchedule] = useState<DailySchedule | null>(null);
  const [workload, setWorkload] = useState<number>(5.0);

  // Filter states
  const [selectedCurve, setSelectedCurve] = useState<'sleep' | 'energy' | 'urgency' | 'difficulty'>('sleep');
  const [ruleSearch, setRuleSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [curvesRes, rulesRes, heatmapRes, schedRes] = await Promise.all([
          api.getMembershipData(),
          api.getSystemRules(),
          api.getHeatmapData(workload),
          api.generateSchedule(180, 10).catch(() => null),
        ]);
        setCurves(curvesRes);
        setRules(rulesRes);
        setHeatmap(heatmapRes);
        setSampleSchedule(schedRes);
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
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-stone-400">
        <div className="w-7 h-7 rounded-full border-2 border-[#e0564c] border-t-transparent animate-spin" />
        <p className="text-xs font-medium text-stone-500">Loading AISC architecture verification datasets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-[#fdf2f1] text-[#c93f35] border border-[#f8d4d1]">
            <Cpu className="w-4 h-4" />
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900">
            AISC System Architecture & Verification
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Formal computational intelligence specifications, Mamdani membership geometry, complete rule bases, and GBFS search verification.
        </p>
      </div>

      {/* 2. Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-stone-200 overflow-x-auto pb-px">
        {[
          { id: 'advisor', label: '1. Advisor Fuzzy System (81 Rules)', icon: Sliders },
          { id: 'prioritizer', label: '2. Task Prioritizer (27 Rules)', icon: Layers },
          { id: 'gbfs', label: '3. Heuristic Search Formalism (GBFS)', icon: Search },
          { id: 'heatmap', label: '4. Surface & Interpolation Grid', icon: Grid },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-2.5 px-3.5 text-xs font-medium whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-[#e0564c] text-[#c93f35] font-semibold'
                  : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ADVISOR FUZZY INFERENCE */}
      {activeTab === 'advisor' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Antecedents</span>
              <div className="text-lg font-bold text-stone-900 mt-1">4 Variables</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Sleep, Energy, Urgency, Diff</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Rule Count</span>
              <div className="text-lg font-bold text-stone-900 mt-1">81 Rules</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">3⁴ full Cartesian space</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Inference Engine</span>
              <div className="text-lg font-bold text-stone-900 mt-1">Mamdani Min-Max</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Min AND, Max OR Aggregation</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Defuzzification</span>
              <div className="text-lg font-bold text-stone-900 mt-1">Centroid (CoA)</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Continuous Center-of-Area</span>
            </div>
          </div>

          {/* Membership Function Curves */}
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Membership Functions: μ(x)
                </h2>
                <p className="text-[11px] text-stone-500">
                  Piecewise linear triangular and trapezoidal fuzzy sets.
                </p>
              </div>

              {/* Variable Toggle */}
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-lg">
                {(['sleep', 'energy', 'urgency', 'difficulty'] as const).map((variable) => (
                  <button
                    key={variable}
                    onClick={() => setSelectedCurve(variable)}
                    className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition ${
                      selectedCurve === variable
                        ? 'bg-white text-stone-900 shadow-2xs font-semibold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            {/* Recharts Curve Visualization */}
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activeCurveData} margin={{ top: 10, right: 15, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0ee" />
                  <XAxis
                    dataKey="x"
                    tick={{ fontSize: 10, fill: '#78716c' }}
                    label={{
                      value: selectedCurve === 'sleep' ? 'Hours of Sleep (0 - 12)' : 'Score (0 - 10)',
                      position: 'insideBottomRight',
                      offset: -5,
                      fontSize: 10,
                      fill: '#a8a29e',
                    }}
                  />
                  <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#78716c' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2.5 rounded-lg shadow-md border border-stone-200 text-xs space-y-1">
                            <p className="font-semibold text-stone-800">
                              Input x = {payload[0]?.payload?.x}
                            </p>
                            {payload.map((entry, idx) => (
                              <p key={idx} style={{ color: entry.color }} className="font-medium capitalize text-[11px]">
                                {entry.name}: {Number(entry.value).toFixed(2)}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
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
          <Card padding="none">
            <div className="p-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">
                  Advisor Rule Base Verification ({filteredAdvisorRules.length} of 81 Rules)
                </h3>
                <p className="text-[11px] text-stone-500">
                  IF Sleep AND Energy AND Urgency AND Difficulty THEN Study Mins, Break Mins, Intensity
                </p>
              </div>

              <input
                type="text"
                placeholder="Filter rules (e.g. High, Hard)..."
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
                className="w-full sm:w-60 px-3 py-1.5 text-xs bg-stone-50 rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-[#e0564c]"
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Rule #</th>
                    <th className="py-2.5 px-3">Sleep</th>
                    <th className="py-2.5 px-3">Energy</th>
                    <th className="py-2.5 px-3">Urgency</th>
                    <th className="py-2.5 px-3">Difficulty</th>
                    <th className="py-2.5 px-3">Study</th>
                    <th className="py-2.5 px-3">Break</th>
                    <th className="py-2.5 px-3">Intensity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-mono text-[11px]">
                  {filteredAdvisorRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-stone-50/70 transition">
                      <td className="py-2 px-3 text-stone-400">R{rule.id}</td>
                      <td className="py-2 px-3">{rule.sleep}</td>
                      <td className="py-2 px-3">{rule.energy}</td>
                      <td className="py-2 px-3">{rule.urgency}</td>
                      <td className="py-2 px-3">{rule.difficulty}</td>
                      <td className="py-2 px-3 font-semibold text-[#c93f35]">{rule.study_minutes}m</td>
                      <td className="py-2 px-3 font-semibold text-emerald-700">{rule.break_minutes}m</td>
                      <td className="py-2 px-3 font-sans">
                        <Badge
                          variant={
                            rule.intensity === 'High'
                              ? 'coral'
                              : rule.intensity === 'Medium'
                              ? 'amber'
                              : 'slate'
                          }
                          size="sm"
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Antecedents</span>
              <div className="text-lg font-bold text-stone-900 mt-1">3 Variables</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Urgency, Importance, Diff</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Rule Count</span>
              <div className="text-lg font-bold text-stone-900 mt-1">27 Rules</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">3³ full Cartesian grid</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Consequent Score</span>
              <div className="text-lg font-bold text-stone-900 mt-1">Range [0, 100]</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Defuzzified priority metric</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Classification</span>
              <div className="text-lg font-bold text-stone-900 mt-1">3 Tiers</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">High, Medium, Low Priority</span>
            </div>
          </div>

          <Card padding="md">
            <h2 className="text-sm font-semibold text-stone-900 mb-2">
              Theoretical Formulation: Multi-Attribute Fuzzy Priority
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Standard linear priority formulas (e.g., Score = w₁·U + w₂·I) fail to capture non-linear human trade-offs, such as when an impending exam deadline must drastically override relaxed coursework regardless of ease. The 27-rule Mamdani engine models these complex cognitive trade-offs:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 text-xs">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-800 block">Urgency (Days to Due)</span>
                <span className="text-stone-500 text-[11px]">Imminent (&lt; 2d), Near (2–6d), Far (&gt; 6d)</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-800 block">Importance (Academic Weight)</span>
                <span className="text-stone-500 text-[11px]">Minor (1–4), Moderate (4–7), Critical (7–10)</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="font-semibold text-stone-800 block">Difficulty (Cognitive Load)</span>
                <span className="text-stone-500 text-[11px]">Easy (1–4), Medium (4–7), Hard (7–10)</span>
              </div>
            </div>
          </Card>

          {/* 27-Rule Table */}
          <Card padding="none">
            <div className="p-4 border-b border-stone-100">
              <h3 className="text-sm font-semibold text-stone-900">
                27-Rule Prioritizer Specification
              </h3>
              <p className="text-[11px] text-stone-500">
                Synthesized rule base mapping combinations of Urgency, Importance, and Difficulty to priority consequent scores.
              </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-medium sticky top-0 z-10 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Rule #</th>
                    <th className="py-2.5 px-3">Urgency</th>
                    <th className="py-2.5 px-3">Importance</th>
                    <th className="py-2.5 px-3">Difficulty</th>
                    <th className="py-2.5 px-3">Consequent Score</th>
                    <th className="py-2.5 px-3">Priority Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-mono text-[11px]">
                  {rules?.task_rules.map((rule) => {
                    const score = rule.consequent_score;
                    const level = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';
                    return (
                      <tr key={rule.id} className="hover:bg-stone-50/70 transition">
                        <td className="py-2 px-3 text-stone-400">TR{rule.id}</td>
                        <td className="py-2 px-3">{rule.urgency}</td>
                        <td className="py-2 px-3">{rule.importance}</td>
                        <td className="py-2 px-3">{rule.difficulty}</td>
                        <td className="py-2 px-3 font-semibold text-[#c93f35]">{score.toFixed(1)}</td>
                        <td className="py-2 px-3 font-sans">
                          <Badge variant={level === 'High' ? 'coral' : level === 'Medium' ? 'amber' : 'slate'} size="sm">
                            {level} Priority
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Search Method</span>
              <div className="text-lg font-bold text-stone-900 mt-1">GBFS</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Greedy Best-First Search</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Nodes Expanded</span>
              <div className="text-lg font-bold font-mono text-stone-900 mt-1">
                {sampleSchedule?.algorithm_info.nodes_expanded ?? 'N/A'}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Search tree node expansions</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Initial Penalty h(0)</span>
              <div className="text-lg font-bold font-mono text-[#c93f35] mt-1">
                {sampleSchedule?.algorithm_info.initial_heuristic?.toFixed(2) ?? 'N/A'}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Root state heuristic cost</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Final Penalty h(best)</span>
              <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
                {sampleSchedule?.algorithm_info.final_heuristic?.toFixed(2) ?? 'N/A'}
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Minimized residual penalty</span>
            </div>
          </div>

          <Card padding="md">
            <h2 className="text-sm font-semibold text-stone-900 mb-3">
              AISC Problem Formulation: Heuristic Daily Scheduling
            </h2>
            <div className="space-y-4 text-xs text-stone-700 leading-relaxed">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1.5">
                <span className="font-semibold text-stone-900 block">1. State Representation</span>
                <p>
                  A search state <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-stone-200">S = (T_rem, t_elapsed)</span> represents:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-stone-600 ml-2">
                  <li><span className="font-mono">T_rem ⊆ T</span>: Remaining unassigned coursework tasks.</li>
                  <li><span className="font-mono">t_elapsed ∈ ℝ⁺</span>: Cumulative planned study and break minutes elapsed.</li>
                </ul>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1.5">
                <span className="font-semibold text-stone-900 block">2. Action Space & Feasibility Constraints</span>
                <p>
                  Executing action <span className="font-mono">a = schedule(t)</span> for task <span className="font-mono">t ∈ T_rem</span> is feasible if and only if:
                </p>
                <p className="font-mono bg-white p-2 rounded border border-stone-200 text-stone-900 font-semibold">
                  t_elapsed + duration(t) + break_duration ≤ Available_Budget
                </p>
                <p className="text-stone-500 text-[11px]">
                  If valid, the system transitions to <span className="font-mono">S' = (T_rem \ &#123;t&#125;, t_elapsed + duration(t) + break_duration)</span>.
                </p>
              </div>

              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200 space-y-1.5">
                <span className="font-semibold text-stone-900 block">3. Heuristic Evaluation Function h(n)</span>
                <p>
                  GBFS prioritizes the priority queue (frontier) using a penalty evaluation function measuring remaining deadline pressure and unhandled task importance:
                </p>
                <div className="font-mono bg-white p-2.5 rounded border border-stone-200 text-[#c93f35] font-semibold text-[11px]">
                  h(n) = Σ [ PriorityScore(t) × (4.0 / (DeadlineDays(t) + 0.5)) ] for all t ∈ T_rem
                </div>
                <p className="text-stone-500 text-[11px]">
                  Minimizing <span className="font-mono">h(n)</span> guides search toward states that complete the highest priority tasks closest to their deadlines earliest.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: 2D SURFACE & COVERAGE HEATMAP */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">X-Axis</span>
              <div className="text-lg font-bold text-stone-900 mt-1">Sleep (hrs)</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Range: 3 to 10 hours</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Y-Axis</span>
              <div className="text-lg font-bold text-stone-900 mt-1">Energy (1-10)</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Range: 1 to 10 points</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Workload</span>
              <div className="text-lg font-bold font-mono text-[#c93f35] mt-1">{workload.toFixed(1)} / 10</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Adjustable parameter</span>
            </div>
            <div className="bg-white border border-stone-200/80 rounded-xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-medium text-stone-500 block">Rule Activation</span>
              <div className="text-lg font-bold text-emerald-700 mt-1">100% Non-Zero</div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Zero dead zones verified</span>
            </div>
          </div>

          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-stone-900">
                  Recommended Study Duration Surface (Minutes)
                </h2>
                <p className="text-[11px] text-stone-500">
                  2D interpolated output surface demonstrating smooth Mamdani transitions without discontinuities.
                </p>
              </div>

              {/* Workload slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-stone-700">Fixed Workload:</span>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.5}
                  value={workload}
                  onChange={(e) => handleWorkloadChange(Number(e.target.value))}
                  className="w-28 accent-[#e0564c] cursor-pointer"
                />
                <span className="text-xs font-mono font-semibold text-[#c93f35] bg-stone-100 px-1.5 py-0.5 rounded">
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
                    <div className="flex items-center text-xs text-stone-500 font-semibold mb-2 ml-16">
                      <span className="mr-2">Sleep (hrs) →</span>
                      <div className="flex gap-1">
                        {heatmap.sleep_values.map((s, idx) => (
                          <div key={idx} className="w-10 sm:w-11 text-center font-mono text-[11px]">
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
                            <span className="w-16 font-mono text-stone-600 font-medium text-right pr-3 text-[11px]">
                              E = {energyVal}
                            </span>
                            <div className="flex gap-1">
                              {row.map((val, cIdx) => {
                                const ratio = Math.max(0, Math.min(1, (val - 15) / 45));
                                const bgColor =
                                  ratio > 0.7
                                    ? 'bg-[#c93f35] text-white'
                                    : ratio > 0.5
                                    ? 'bg-[#e0564c] text-white'
                                    : ratio > 0.3
                                    ? 'bg-[#f5a7a1] text-stone-900'
                                    : 'bg-[#fdf2f1] text-stone-700';

                                return (
                                  <div
                                    key={cIdx}
                                    title={`Sleep: ${heatmap.sleep_values[cIdx]}h | Energy: ${energyVal} | Duration: ${val.toFixed(1)}m`}
                                    className={`w-10 sm:w-11 h-8 rounded flex items-center justify-center font-mono text-[10px] font-medium transition hover:scale-105 ${bgColor}`}
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

                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-stone-100">
                  <span>Higher values (darker red) reflect peak cognitive focus allowance (up to 60 mins).</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#fdf2f1] border border-stone-200 inline-block" /> 15m
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#f5a7a1] inline-block" /> 35m
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-xs bg-[#c93f35] inline-block" /> 60m
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
